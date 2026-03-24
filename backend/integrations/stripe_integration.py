import os
import stripe
from typing import Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from this file)
_env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=_env_path, override=True)

class StripeIntegration:
    def __init__(self):
        self.name = "Stripe Integration"

    @property
    def api_key(self):
        return os.getenv("STRIPE_SECRET_KEY")

    @property
    def webhook_secret(self):
        return os.getenv("STRIPE_WEBHOOK_SECRET")

    @property
    def publishable_key(self):
        return os.getenv("STRIPE_PUBLISHABLE_KEY")

    # ── Payment Link (one-time product) ─────────────────────────────────────

    def create_payment_link(self, product_name: str, price: float) -> dict:
        """
        Creates a Stripe Payment Link for a one-time product.
        Returns {"status": "success", "url": "https://buy.stripe.com/..."} on success.
        Returns {"status": "no_key"} when STRIPE_SECRET_KEY is not configured.
        Returns {"status": "error", "message": "..."} on API failure.
        """
        key = self.api_key
        print(f"[Stripe] Creating Payment Link: {product_name} (${price}) key={'set' if key else 'NOT SET'}")

        if not key:
            return {
                "status": "no_key",
                "message": "STRIPE_SECRET_KEY not set",
            }

        stripe.api_key = key
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


# Singleton instance
stripe_integration = StripeIntegration()
