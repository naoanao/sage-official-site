import os
import stripe
from typing import Dict, Any, Optional

class StripeIntegration:
    def __init__(self):
        self.name = "Stripe Integration"
        self.api_key = os.getenv("STRIPE_SECRET_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        self.publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY")

        if self.api_key:
            stripe.api_key = self.api_key
        else:
            print("[Stripe] Warning: STRIPE_SECRET_KEY not set.")

    # ── Payment Link (one-time product) ─────────────────────────────────────

    def create_payment_link(self, product_name: str, price: float) -> dict:
        """
        Creates a Stripe Payment Link for a one-time product.
        Returns {"status": "success", "url": "https://buy.stripe.com/..."} on success.
        Returns {"status": "no_key"} when STRIPE_SECRET_KEY is not configured.
        Returns {"status": "error", "message": "..."} on API failure.
        """
        print(f"[Stripe] Creating Payment Link: {product_name} (${price})")

        if not self.api_key:
            return {
                "status": "no_key",
                "message": "STRIPE_SECRET_KEY not set",
            }

        try:
            product = stripe.Product.create(name=product_name)
            price_obj = stripe.Price.create(
                unit_amount=int(price * 100),
                currency="usd",
                product=product.id,
            )
            payment_link = stripe.PaymentLink.create(
                line_items=[{"price": price_obj.id, "quantity": 1}]
            )
            return {"status": "success", "url": payment_link.url, "message": "Payment Link Created"}
        except Exception as e:
            print(f"[Stripe] Error creating link: {e}")
            return {"status": "error", "message": str(e)}

    # ── Checkout Session (subscription / advanced) ───────────────────────────

    def create_checkout_session(self, price_id: str, customer_email: str, success_url: str, cancel_url: str, trial_days: int = 0) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None
        try:
            params = {
                "payment_method_types": ["card"],
                "line_items": [{"price": price_id, "quantity": 1}],
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "customer_email": customer_email,
            }
            if trial_days > 0:
                params["subscription_data"] = {"trial_period_days": trial_days}
            session = stripe.checkout.Session.create(**params)
            return session
        except Exception as e:
            print(f"[Stripe] Error creating session: {e}")
            return None

    # ── Webhook ──────────────────────────────────────────────────────────────

    def handle_webhook(self, payload: str, sig_header: str) -> Optional[Dict[str, Any]]:
        if not self.webhook_secret:
            return None
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, self.webhook_secret)
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            print(f"[Stripe] Webhook error: {e}")
            return None

        event_type = event["type"]
        data = event["data"]["object"]
        print(f"[Stripe] Event: {event_type}")

        if event_type == "checkout.session.completed":
            print(f"[Stripe] Payment complete: {data.get('customer_details', {}).get('email')}")
        elif event_type == "customer.subscription.deleted":
            print(f"[Stripe] Subscription cancelled: {data.get('id')}")

        return event

    # ── Customer helpers ─────────────────────────────────────────────────────

    def create_customer(self, email: str, name: str) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None
        try:
            return stripe.Customer.create(email=email, name=name)
        except Exception as e:
            print(f"[Stripe] Error creating customer: {e}")
            return None

    def get_subscription_status(self, customer_id: str) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None
        try:
            subs = stripe.Subscription.list(customer=customer_id, status="active", limit=1)
            return subs.data[0] if subs.data else None
        except Exception as e:
            print(f"[Stripe] Error getting subscription: {e}")
            return None

    def cancel_subscription(self, subscription_id: str) -> bool:
        if not self.api_key:
            return False
        try:
            stripe.Subscription.delete(subscription_id)
            return True
        except Exception as e:
            print(f"[Stripe] Error canceling subscription: {e}")
            return False

    # ── Store Management ─────────────────────────────────────────────────────

    def list_products(self, limit: int = 20) -> list:
        if not self.api_key:
            return []
        try:
            products = stripe.Product.list(active=True, limit=limit, expand=["data.default_price"])
            result = []
            for p in products.auto_paging_iter():
                price_val = None
                price_id = None
                dp = p.get("default_price")
                if dp and isinstance(dp, dict):
                    raw = dp.get("unit_amount")
                    if raw:
                        price_val = raw / 100
                    price_id = dp.get("id")
                result.append({
                    "id": p.id, "name": p.name, "active": p.active,
                    "description": p.description or "",
                    "price": price_val, "price_id": price_id,
                    "created": p.created,
                })
            return result
        except Exception as e:
            print(f"[Stripe] list_products error: {e}")
            return []

    def update_product(self, product_id: str, name: str = None, description: str = None) -> dict:
        if not self.api_key:
            return {"status": "error", "message": "No API key"}
        try:
            kwargs = {}
            if name:
                kwargs["name"] = name
            if description is not None:
                kwargs["description"] = description
            p = stripe.Product.modify(product_id, **kwargs)
            return {"status": "success", "product": {"id": p.id, "name": p.name}}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def archive_product(self, product_id: str) -> dict:
        if not self.api_key:
            return {"status": "error", "message": "No API key"}
        try:
            stripe.Product.modify(product_id, active=False)
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list_payments(self, limit: int = 20) -> list:
        if not self.api_key:
            return []
        try:
            intents = stripe.PaymentIntent.list(limit=limit)
            return [{
                "id": pi.id, "amount": pi.amount / 100,
                "currency": pi.currency.upper(), "status": pi.status,
                "created": pi.created, "description": pi.description or "",
                "email": pi.receipt_email or "",
            } for pi in intents.data]
        except Exception as e:
            print(f"[Stripe] list_payments error: {e}")
            return []

    def get_revenue_summary(self) -> dict:
        if not self.api_key:
            return {"total": 0, "orders": 0, "avg": 0, "currency": "USD"}
        try:
            import time as _time
            since = int(_time.time()) - 30 * 86400
            intents = stripe.PaymentIntent.list(limit=100, created={"gte": since})
            succeeded = [pi for pi in intents.data if pi.status == "succeeded"]
            total = sum(pi.amount for pi in succeeded) / 100
            count = len(succeeded)
            return {
                "total": round(total, 2), "orders": count,
                "avg": round(total / count, 2) if count else 0, "currency": "USD",
            }
        except Exception as e:
            print(f"[Stripe] get_revenue_summary error: {e}")
            return {"total": 0, "orders": 0, "avg": 0, "currency": "USD"}


# Singleton instance
stripe_integration = StripeIntegration()
