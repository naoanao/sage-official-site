# -*- coding: utf-8 -*-
"""
Sage SaaS Template — Stripe & Subscriber Flask Routes
======================================================
このファイルはflask_server.pyから抽出したSaaS専用ルートです。
新しいSaaS商品を作るときにflask_server.pyへ組み込んでください。

使い方:
    from saas_template.stripe_saas_routes import register_saas_routes
    register_saas_routes(app)

必要な環境変数:
    STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET
    MAKE_WEBHOOK_URL
    CLOUDFLARE_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID   (CF Account ID)
    D1_DATABASE_ID          (D1 DB ID)
    TELEGRAM_BOT_TOKEN      (任意)
    TELEGRAM_CHAT_ID        (任意)
"""

import os
import logging
from flask import request, jsonify
from pathlib import Path

logger = logging.getLogger(__name__)

# ── D1/CF設定（環境変数で上書き可能） ────────────────────────────────────────
def _get_cf_config():
    return {
        "account_id": os.getenv("CLOUDFLARE_ACCOUNT_ID", ""),
        "db_id":      os.getenv("D1_DATABASE_ID", ""),
        "token":      os.getenv("CLOUDFLARE_API_TOKEN", ""),
    }


def register_saas_routes(app):
    """FlaskアプリにSaaS関連ルートを登録する"""

    # ── Stripe Checkout ───────────────────────────────────────────────────
    @app.route('/api/stripe/checkout', methods=['POST'])
    def stripe_checkout():
        """
        Stripe Payment Linkを動的生成して返す。
        STRIPE_SECRET_KEYがなければGumroadへフォールバック。
        """
        try:
            import stripe as _stripe
            from dotenv import load_dotenv as _load_dotenv
            _load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env', override=True)
            stripe_key = os.getenv('STRIPE_SECRET_KEY')

            data = request.get_json(silent=True) or {}
            product_name = data.get('product_name', 'Sage AI — Pro Plan')
            price = float(data.get('price', 20.00))

            if not stripe_key:
                return jsonify({'status': 'fallback',
                                'url': os.getenv('FALLBACK_PURCHASE_URL', 'https://gumroad.com'),
                                'message': 'STRIPE_SECRET_KEY not configured'}), 200

            _stripe.api_key = stripe_key
            product = _stripe.Product.create(name=product_name)
            price_obj = _stripe.Price.create(
                unit_amount=int(price * 100),
                currency='usd',
                recurring={"interval": "month"},
                product=product.id,
            )
            payment_link = _stripe.PaymentLink.create(
                line_items=[{'price': price_obj.id, 'quantity': 1}]
            )
            return jsonify({'status': 'success', 'url': payment_link.url}), 200

        except Exception as e:
            logger.error(f"[Stripe checkout] {e}")
            return jsonify({'status': 'fallback',
                            'url': os.getenv('FALLBACK_PURCHASE_URL', 'https://gumroad.com'),
                            'message': str(e)}), 200

    # ── Stripe Webhook ────────────────────────────────────────────────────
    @app.route('/api/webhook/stripe', methods=['POST'])
    def stripe_webhook():
        """
        Stripeのwebhookを受け取りD1に書き込む。
        Stripe Dashboard → Webhooks → Add endpointで登録すること。
        """
        import stripe as _stripe
        from datetime import datetime, timezone

        raw_body    = request.get_data()
        sig_header  = request.headers.get("Stripe-Signature", "")
        webhook_sec = os.getenv("STRIPE_WEBHOOK_SECRET", "")
        now_iso     = datetime.now(timezone.utc).isoformat()
        cf          = _get_cf_config()

        # 署名検証
        if webhook_sec:
            try:
                _stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
                event = _stripe.Webhook.construct_event(raw_body, sig_header, webhook_sec)
            except _stripe.error.SignatureVerificationError:
                logger.warning("[Stripe webhook] Invalid signature")
                return jsonify({"error": "invalid signature"}), 401
        else:
            event = request.get_json(force=True, silent=True) or {}
            logger.warning("[Stripe webhook] No secret — dev mode, skipping verification")

        event_type = event.get("type", "")
        data_obj   = event.get("data", {}).get("object", {})
        logger.info(f"[Stripe webhook] event={event_type}")

        def _d1_upsert(customer_id, sub_id, email, plan, status_val, amount):
            if not cf["token"] or not cf["account_id"] or not cf["db_id"]:
                logger.warning("[Stripe webhook] CF credentials missing — skip D1 write")
                return
            try:
                import requests as _req
                sql = (
                    "INSERT INTO subscribers "
                    "(stripe_customer_id,stripe_subscription_id,email,plan,status,amount_usd,created_at,updated_at) "
                    "VALUES (?,?,?,?,?,?,?,?) "
                    "ON CONFLICT(stripe_customer_id) DO UPDATE SET "
                    "stripe_subscription_id=excluded.stripe_subscription_id,"
                    "plan=excluded.plan,status=excluded.status,"
                    "amount_usd=excluded.amount_usd,updated_at=excluded.updated_at"
                )
                _req.post(
                    f"https://api.cloudflare.com/client/v4/accounts/{cf['account_id']}/d1/database/{cf['db_id']}/query",
                    headers={"Authorization": f"Bearer {cf['token']}", "Content-Type": "application/json"},
                    json={"sql": sql, "params": [customer_id, sub_id, email, plan, status_val, amount, now_iso, now_iso]},
                    timeout=10)
            except Exception as e:
                logger.warning(f"[Stripe webhook] D1 upsert failed: {e}")

        def _d1_cancel(customer_id):
            if not cf["token"]:
                return
            try:
                import requests as _req
                _req.post(
                    f"https://api.cloudflare.com/client/v4/accounts/{cf['account_id']}/d1/database/{cf['db_id']}/query",
                    headers={"Authorization": f"Bearer {cf['token']}", "Content-Type": "application/json"},
                    json={"sql": "UPDATE subscribers SET status='cancelled',updated_at=? WHERE stripe_customer_id=?",
                          "params": [now_iso, customer_id]}, timeout=10)
            except Exception as e:
                logger.warning(f"[Stripe webhook] D1 cancel failed: {e}")

        def _notify_telegram(msg: str):
            try:
                token   = os.getenv("TELEGRAM_BOT_TOKEN", "")
                chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
                if not token or not chat_id:
                    return
                import requests as _req
                _req.post(f"https://api.telegram.org/bot{token}/sendMessage",
                          json={"chat_id": chat_id, "text": msg}, timeout=5)
            except Exception as e:
                logger.warning(f"[Stripe webhook] Telegram failed: {e}")

        def _notify_make(event_type, session_obj):
            make_url = os.getenv("MAKE_WEBHOOK_URL", "")
            if not make_url:
                return
            try:
                import requests as _req
                _req.post(make_url, json={"type": event_type, **session_obj}, timeout=10)
            except Exception as e:
                logger.warning(f"[Stripe webhook] Make.com failed: {e}")

        # イベント振り分け
        if event_type == "checkout.session.completed":
            email    = data_obj.get("customer_details", {}).get("email", "unknown")
            cust_id  = data_obj.get("customer", "")
            sub_id   = data_obj.get("subscription", "")
            amount   = (data_obj.get("amount_total") or 0) // 100
            plan     = "pro" if amount <= 25 else "enterprise"
            _d1_upsert(cust_id, sub_id, email, plan, "active", amount)
            _notify_telegram(f"💰 New subscriber: {email} — {plan.upper()} ${amount}/mo")
            _notify_make(event_type, data_obj)

        elif event_type == "customer.subscription.deleted":
            cust_id = data_obj.get("customer", "")
            _d1_cancel(cust_id)
            _notify_telegram(f"⚠️ Cancelled: customer={cust_id}")

        elif event_type == "invoice.payment_failed":
            email   = data_obj.get("customer_email", "unknown")
            amount  = (data_obj.get("amount_due") or 0) // 100
            _notify_telegram(f"❌ Payment failed: {email} ${amount}")

        return jsonify({"received": True, "event": event_type}), 200

    logger.info("[SaaS routes] Stripe routes registered")
