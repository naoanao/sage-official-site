"""
stripe_webhook_diagnose.py
──────────────────────────────────────────────────────────────────
Stripe Webhook → Cloudflare Pages 接続状態の完全診断スクリプト

実行方法:
  python backend/scripts/stripe_webhook_diagnose.py

何をチェックするか:
  1. .env の必須キー存在確認
  2. CF Pages デプロイ URL の疎通確認
  3. Stripe Webhook エンドポイント登録状況（Stripe API経由）
  4. D1 バインド設定の確認方法ガイド

修正手順も自動で出力する。
"""

import os
import sys
import json
import subprocess
from pathlib import Path

try:
    from dotenv import dotenv_values
    env = dotenv_values()
except ImportError:
    env = {}

# ── カラー出力 ──────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):  print(f"{GREEN}  ✅ {msg}{RESET}")
def warn(msg): print(f"{YELLOW}  ⚠️  {msg}{RESET}")
def err(msg):  print(f"{RED}  ❌ {msg}{RESET}")
def info(msg): print(f"{CYAN}  ℹ️  {msg}{RESET}")
def sep():     print(f"\n{'─'*60}\n")

# ── 必須環境変数チェック ──────────────────────────────────────────
REQUIRED_KEYS = {
    "STRIPE_WEBHOOK_SECRET": "whsec_で始まるWebhook署名シークレット",
    "STRIPE_SECRET_KEY":     "sk_live_で始まるStripe APIキー（管理用）",
    "TELEGRAM_BOT_TOKEN":    "TelegramBot通知トークン（任意）",
    "TELEGRAM_CHAT_ID":      "Telegram通知先チャットID（任意）",
    "MAKE_WEBHOOK_URL":      "Make.com Webhookウェルカムメール転送URL（任意）",
}

OPTIONAL_KEYS = {"TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "MAKE_WEBHOOK_URL"}

def check_env():
    print(f"\n{BOLD}[1/4] .env 必須キー確認{RESET}")
    missing_critical = []
    for key, desc in REQUIRED_KEYS.items():
        val = env.get(key) or os.getenv(key, "")
        if val:
            masked = val[:8] + "..." if len(val) > 8 else val
            ok(f"{key} = {masked}  ({desc})")
        else:
            if key in OPTIONAL_KEYS:
                warn(f"{key} 未設定（任意）  → {desc}")
            else:
                err(f"{key} 未設定！  → {desc}")
                missing_critical.append(key)
    return missing_critical

# ── CF Pages URL 疎通チェック ──────────────────────────────────────
def check_cf_pages_health():
    print(f"\n{BOLD}[2/4] CF Pages ヘルスエンドポイント疎通確認{RESET}")
    try:
        import urllib.request
        cf_url = env.get("CF_PAGES_URL") or os.getenv("CF_PAGES_URL", "")
        if not cf_url:
            warn("CF_PAGES_URL が .env に未設定。手動でURLを確認してください。")
            info("例: https://sage-ai.pages.dev")
            return None

        health_url = cf_url.rstrip("/") + "/api/health"
        req = urllib.request.Request(health_url, headers={"User-Agent": "SageDiagnose/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read().decode()
            ok(f"CF Pages 疎通OK: {health_url}")
            ok(f"レスポンス: {body[:100]}")
            return cf_url
    except Exception as e:
        err(f"CF Pages 疎通失敗: {e}")
        info("CF Pagesがデプロイされているか確認してください")
        return None

# ── Stripe Webhook エンドポイント確認 ───────────────────────────────
def check_stripe_webhooks(cf_url):
    print(f"\n{BOLD}[3/4] Stripe Webhookエンドポイント登録確認{RESET}")
    stripe_key = env.get("STRIPE_SECRET_KEY") or os.getenv("STRIPE_SECRET_KEY", "")
    if not stripe_key:
        warn("STRIPE_SECRET_KEY が未設定のためStripe API確認をスキップ")
        return

    try:
        import urllib.request
        import base64
        req = urllib.request.Request(
            "https://api.stripe.com/v1/webhook_endpoints",
            headers={
                "Authorization": f"Bearer {stripe_key}",
                "User-Agent": "SageDiagnose/1.0",
            }
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())

        webhooks = data.get("data", [])
        if not webhooks:
            err("Stripeにwebhookエンドポイントが1件も登録されていません！")
            return

        target_path = "/api/webhook/stripe"
        found = False
        for wh in webhooks:
            url = wh.get("url", "")
            status = wh.get("status", "")
            events = wh.get("enabled_events", [])
            print(f"\n  📌 {url}")
            print(f"     Status: {status}")
            print(f"     Events: {', '.join(events[:3])}{'...' if len(events)>3 else ''}")

            if target_path in url:
                found = True
                if status == "enabled":
                    ok("✅ 対象Webhookが有効に登録されています！")
                    if "checkout.session.completed" in events or "*" in events:
                        ok("checkout.session.completed イベント受信設定済み")
                    else:
                        warn("checkout.session.completed が events に含まれていません")
                        _print_stripe_fix_guide(cf_url)
                else:
                    err(f"Webhookが登録されているが status={status}（無効）")

        if not found:
            err(f"/api/webhook/stripe パスのWebhookが見つかりません")
            _print_stripe_fix_guide(cf_url)

    except Exception as e:
        err(f"Stripe API呼び出しエラー: {e}")

def _print_stripe_fix_guide(cf_url):
    base = (cf_url or "https://YOUR-PROJECT.pages.dev").rstrip("/")
    print(f"""
{YELLOW}{BOLD}  ── Stripe Dashboard 設定手順 ─────────────────────────────{RESET}
  1. https://dashboard.stripe.com/webhooks を開く
  2. 「Add endpoint」をクリック
  3. Endpoint URL:
       {CYAN}{base}/api/webhook/stripe{RESET}
  4. Events to send:
       ✅ checkout.session.completed
       ✅ customer.subscription.deleted
       ✅ customer.subscription.created
       ✅ invoice.payment_failed
  5. 「Add endpoint」で保存
  6. 表示された「Signing secret」(whsec_...) をコピー
  7. .env に貼り付け:
       STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
  8. CF Pages Dashboard → Settings → Environment variables にも同じ値を追加
{YELLOW}  ───────────────────────────────────────────────────────────{RESET}
""")

# ── CF Pages D1 バインド確認ガイド ────────────────────────────────
def check_d1_guide():
    print(f"\n{BOLD}[4/4] Cloudflare Pages D1バインド設定確認{RESET}")
    print(f"""
{CYAN}  CF Pages Dashboard で以下を確認してください:
  https://dash.cloudflare.com → Pages → [あなたのプロジェクト]
  → Settings → Functions → D1 database bindings

  必要なバインド:
  ┌─────────────────────────────────────────────────────┐
  │  Variable name   │  D1 database                    │
  ├─────────────────────────────────────────────────────┤
  │  SUBSCRIBERS_DB  │  sage-subscribers               │
  └─────────────────────────────────────────────────────┘

  ※ D1データベース名は Cloudflare Dashboard → D1 で確認できます。
  ※ バインドがないと Webhook受信してもD1への書き込みが失敗します。

  また、以下の環境変数もCF Pages Dashboardに追加してください:
  ┌─────────────────────────────────────────┐
  │  STRIPE_WEBHOOK_SECRET  = whsec_...    │
  │  MAKE_WEBHOOK_URL       = https://...  │  (任意)
  │  TELEGRAM_BOT_TOKEN     = ...          │  (任意)
  │  TELEGRAM_CHAT_ID       = ...          │  (任意)
  └─────────────────────────────────────────┘
{RESET}""")

# ── サマリー ─────────────────────────────────────────────────────
def print_summary(missing_critical):
    sep()
    print(f"{BOLD}診断サマリー{RESET}")
    if not missing_critical:
        ok("必須の.envキーはすべて設定済みです")
        info("残りの確認はCloudflare DashboardとStripe Dashboardで行ってください（上記の手順参照）")
    else:
        err(f"未設定の必須キー: {', '.join(missing_critical)}")
        print(f"""
{BOLD}最優先で対処すること:{RESET}

  1. Stripe Dashboard でWebhookエンドポイントを登録 → STRIPE_WEBHOOK_SECRET を取得
  2. .env に STRIPE_WEBHOOK_SECRET=whsec_... を追記
  3. CF Pages Dashboard → Settings → Environment variables に同値を追加
  4. CF Pages Dashboard → Settings → Functions → D1 binding を追加
     Variable name: SUBSCRIBERS_DB → sage-subscribers
  5. CF Pagesを再デプロイ（設定変更後に自動デプロイされる）

完了後、このスクリプトを再実行して確認してください。
""")

# ── エントリポイント ───────────────────────────────────────────────
if __name__ == "__main__":
    print(f"\n{BOLD}{'='*60}")
    print(f"  Sage Stripe Webhook 診断スクリプト")
    print(f"{'='*60}{RESET}")

    missing = check_env()
    sep()
    cf_url = check_cf_pages_health()
    sep()
    check_stripe_webhooks(cf_url)
    sep()
    check_d1_guide()
    print_summary(missing)
