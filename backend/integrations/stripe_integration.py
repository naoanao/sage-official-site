import os
import stripe
import opik
import json
from typing import Dict, Any, Optional, List

# Configure Opik
opik.configure(use_local=False)

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

        # Plan Configuration
        self.plans = {
            "basic": {
                "id": "price_basic_monthly", # Replace with actual Price ID
                "name": "Basic Plan",
                "price": 2980,
                "features": ["500 API Calls", "3 Notion DBs", "2 Calendars"]
            },
            "pro": {
                "id": "price_pro_monthly", # Replace with actual Price ID
                "name": "Pro Plan",
                "price": 9990,
                "features": ["Unlimited API", "All Integrations", "Priority Support"]
            },
            "enterprise": {
                "id": "price_enterprise_monthly", # Replace with actual Price ID
                "name": "Enterprise Plan",
                "price": 49000,
                "features": ["SLA", "Dedicated Support", "Custom Dev"]
            }
        }

    @opik.track(name="stripe_create_checkout")
    def create_checkout_session(self, price_id: str, customer_email: str, success_url: str, cancel_url: str, trial_days: int = 7) -> Optional[Dict[str, Any]]:
        """
        Creates a Stripe Checkout Session for a subscription.
        """
        if not self.api_key:
            return None

        try:
            session_params = {
                "payment_method_types": ["card"],
                "line_items": [{
                    "price": price_id,
                    "quantity": 1,
                }],
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "customer_email": customer_email,
            }
            
            if trial_days > 0:
                session_params["subscription_data"] = {
                    "trial_period_days": trial_days
                }

            session = stripe.checkout.Session.create(**session_params)
            print(f"[Stripe] Checkout Session created: {session.id}")
            return session
        except Exception as e:
            print(f"[Stripe] Error creating session: {e}")
            return None

    @opik.track(name="stripe_handle_webhook")
    def handle_webhook(self, payload: str, sig_header: str) -> Optional[Dict[str, Any]]:
        """
        Verifies and handles Stripe webhooks.
        """
        if not self.webhook_secret:
            print("[Stripe] Webhook secret not set.")
            return None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
        except ValueError as e:
            print(f"[Stripe] Invalid payload: {e}")
            return None
        except stripe.error.SignatureVerificationError as e:
            print(f"[Stripe] Invalid signature: {e}")
            return None

        # Handle specific events
        event_type = event['type']
        data = event['data']['object']

        print(f"[Stripe] Received event: {event_type}")

        if event_type == 'checkout.session.completed':
            self._handle_checkout_completed(data)
        elif event_type == 'invoice.payment_succeeded':
            self._handle_payment_succeeded(data)
        elif event_type == 'customer.subscription.deleted':
            self._handle_subscription_deleted(data)
        
        return event

    def _handle_checkout_completed(self, session: Dict[str, Any]):
        customer_email = session.get('customer_details', {}).get('email')
        print(f"[Stripe] Subscription started for: {customer_email}")
        # Logic to update user DB, send welcome email, etc.

    def _handle_payment_succeeded(self, invoice: Dict[str, Any]):
        print(f"[Stripe] Payment succeeded for invoice: {invoice.get('id')}")
        # Logic to record revenue in Comet ML

    def _handle_subscription_deleted(self, subscription: Dict[str, Any]):
        print(f"[Stripe] Subscription canceled: {subscription.get('id')}")
        # Logic to downgrade user, send survey, etc.

    @opik.track(name="stripe_create_customer")
    def create_customer(self, email: str, name: str) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
            )
            return customer
        except Exception as e:
            print(f"[Stripe] Error creating customer: {e}")
            return None

    @opik.track(name="stripe_get_subscription")
    def get_subscription_status(self, customer_id: str) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None
        try:
            subscriptions = stripe.Subscription.list(
                customer=customer_id,
                status='active',
                limit=1
            )
            if subscriptions.data:
                return subscriptions.data[0]
            return None
        except Exception as e:
            print(f"[Stripe] Error getting subscription: {e}")
            return None

    @opik.track(name="stripe_cancel_subscription")
    def cancel_subscription(self, subscription_id: str) -> bool:
        if not self.api_key:
            return False
        try:
            stripe.Subscription.delete(subscription_id)
            print(f"[Stripe] Subscription {subscription_id} canceled.")
            return True
        except Exception as e:
            print(f"[Stripe] Error canceling subscription: {e}")
            return False

    @opik.track(name="stripe_create_link")
    def create_payment_link(self, product_name: str, price: float) -> dict:
        """
        Creates a simple payment link for a product.
        """
        print(f"[STRIPE] Creating Stripe Link for: {product_name} (${price})")
        
        if not self.api_key:
            return {"status": "success", "url": f"https://buy.stripe.com/test_{product_name.replace(' ', '')}", "message": "Mock Stripe Link (Set STRIPE_SECRET_KEY)"}

        try:
            # 1. Create Product
            product = stripe.Product.create(name=product_name)
            
            # 2. Create Price
            price_obj = stripe.Price.create(
                unit_amount=int(price * 100), # Cents
                currency="usd",
                product=product.id,
            )
            
            # 3. Create Payment Link
            payment_link = stripe.PaymentLink.create(
                line_items=[{"price": price_obj.id, "quantity": 1}]
            )
            
            return {"status": "success", "url": payment_link.url, "message": "Payment Link Created"}
            
        except Exception as e:
            print(f"[Stripe] Error creating link: {e}")
            return {"status": "error", "message": str(e)}

# Singleton instance
stripe_integration = StripeIntegration()
