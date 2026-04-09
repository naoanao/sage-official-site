import os
import base64
import requests
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=_env_path, override=True)

class PayPalIntegration:
    """
    PayPal REST API v2 — one-time payment orders.
    Set PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET in .env.
    PAYPAL_MODE: 'sandbox' (default) or 'live'
    """

    SANDBOX_BASE  = "https://api-m.sandbox.paypal.com"
    LIVE_BASE     = "https://api-m.paypal.com"

    def __init__(self):
        self.client_id     = os.getenv("PAYPAL_CLIENT_ID", "")
        self.client_secret = os.getenv("PAYPAL_CLIENT_SECRET", "")
        self.mode          = os.getenv("PAYPAL_MODE", "sandbox")
        self.base_url      = self.LIVE_BASE if self.mode == "live" else self.SANDBOX_BASE

    # ── Internal helpers ────────────────────────────────────────────────────

    def _get_access_token(self) -> Optional[str]:
        if not (self.client_id and self.client_secret):
            return None
        credentials = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        try:
            resp = requests.post(
                f"{self.base_url}/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={"grant_type": "client_credentials"},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json().get("access_token")
        except Exception as e:
            print(f"[PayPal] Auth error: {e}")
            return None

    # ── Public API ──────────────────────────────────────────────────────────

    def create_order(
        self,
        amount: str,
        currency: str = "USD",
        description: str = "Sage AI — Self-Hosted AI Toolkit",
        return_url: str = os.getenv("SITE_URL", "https://your-site.pages.dev") + "/thank-you",
        cancel_url:  str = os.getenv("SITE_URL", "https://your-site.pages.dev") + "/sales",
    ) -> Dict[str, Any]:
        """
        Creates a PayPal order and returns the approve URL.
        Returns: {"status": "success", "url": "...", "order_id": "..."}
                 {"status": "error",   "message": "..."}
                 {"status": "no_keys", "url": fallback_paypal_me_link}
        """
        token = self._get_access_token()
        if not token:
            # No keys configured — return PayPal.me fallback (japanletgo account)
            return {
                "status": "no_keys",
                "url": f"{os.getenv('PAYPAL_ME_URL', '')}/{amount}",
                "message": "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set. Using PayPal.me fallback.",
            }

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {"currency_code": currency, "value": amount},
                    "description": description,
                }
            ],
            "application_context": {
                "return_url": return_url,
                "cancel_url": cancel_url,
                "brand_name": "Sage AI",
                "user_action": "PAY_NOW",
            },
        }
        try:
            resp = requests.post(
                f"{self.base_url}/v2/checkout/orders",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            order_id = data.get("id")
            approve_url = next(
                (link["href"] for link in data.get("links", []) if link["rel"] == "approve"),
                None,
            )
            if approve_url:
                return {"status": "success", "url": approve_url, "order_id": order_id}
            return {"status": "error", "message": "No approve URL returned by PayPal"}
        except Exception as e:
            print(f"[PayPal] Order creation error: {e}")
            return {"status": "error", "message": str(e)}

    def capture_order(self, order_id: str) -> Dict[str, Any]:
        """Called from /thank-you webhook or redirect handler to capture payment."""
        token = self._get_access_token()
        if not token:
            return {"status": "error", "message": "PayPal not configured"}
        try:
            resp = requests.post(
                f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            return {"status": "success", "data": data}
        except Exception as e:
            return {"status": "error", "message": str(e)}


# Singleton
paypal_integration = PayPalIntegration()
