# -*- coding: utf-8 -*-
"""
backend/integrations/gumroad_api.py
=====================================
Gumroad integration for Sage.

IMPORTANT NOTE (2024):
  Gumroad removed all write (POST/PUT/DELETE) endpoints from their public API.
  Product creation and editing must be done manually at gumroad.com/products.
  This module provides:
    - READ: list existing products, fetch product details
    - PROMOTE: return the best product URL for SNS promotion
    - REDIRECT: new product sales → Whop (create_and_publish) or Stripe

Environment Variables:
  GUMROAD_ACCESS_TOKEN  - OAuth access token (get from gumroad.com/settings/advanced)

Usage:
  from backend.integrations.gumroad_api import GumroadAPI
  api = GumroadAPI()
  products = api.list_products()
  best = api.pick_best_product(topic="AI automation")
"""

import logging
import os

import requests

logger = logging.getLogger("GumroadAPI")

GUMROAD_API_BASE = "https://api.gumroad.com/v2"

# Fallback for when API is unreachable or token not set
_FALLBACK_PRODUCT = {
    "name": "2026 AI Influencer Monetization Express",
    "short_url": "https://naofumi3.gumroad.com/l/yvzrfjd",
    "price": 2999,
    "currency": "usd",
    "published": True,
    "id": "fallback",
}


class GumroadAPI:
    """
    Gumroad read-only API client.

    NOTE: Gumroad removed write APIs in 2024.
    For new product creation, use WhopPublisher or StripeIntegration instead.
    """

    def __init__(self):
        self.access_token = (
            os.getenv("GUMROAD_ACCESS_TOKEN")
            or os.getenv("GUMROAD_API_KEY")
            or ""
        )
        if not self.access_token:
            logger.warning(
                "[GUMROAD] GUMROAD_ACCESS_TOKEN not set — limited to fallback product."
            )

    # ── Read endpoints ────────────────────────────────────────────────────────

    def list_products(self) -> list:
        """
        Fetch all published products from Gumroad API.
        Returns list of product dicts. Falls back to FALLBACK_PRODUCT on error.
        """
        if not self.access_token:
            return [_FALLBACK_PRODUCT]

        try:
            resp = requests.get(
                f"{GUMROAD_API_BASE}/products",
                headers={"Authorization": f"Bearer {self.access_token}"},
                timeout=15,
            )
            if resp.status_code == 200:
                products = resp.json().get("products", [])
                published = [p for p in products if p.get("published", True)]
                if published:
                    logger.info(f"[GUMROAD] Fetched {len(published)} published products.")
                    return published
            else:
                logger.warning(f"[GUMROAD] API returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"[GUMROAD] list_products failed: {e}")

        return [_FALLBACK_PRODUCT]

    def get_product(self, product_id: str) -> dict:
        """Fetch a single product by ID. Returns product dict or raises RuntimeError."""
        if not self.access_token:
            raise RuntimeError("GUMROAD_ACCESS_TOKEN not set")
        resp = requests.get(
            f"{GUMROAD_API_BASE}/products/{product_id}",
            headers={"Authorization": f"Bearer {self.access_token}"},
            timeout=15,
        )
        if not resp.ok:
            raise RuntimeError(f"Gumroad get_product failed [{resp.status_code}]: {resp.text[:200]}")
        return resp.json().get("product", {})

    def pick_best_product(self, topic: str = "") -> dict:
        """
        Pick the most relevant product for promotion.
        Basic keyword match if topic provided; otherwise return first published product.
        """
        products = self.list_products()
        if len(products) == 1:
            return products[0]

        if topic:
            topic_lower = topic.lower()
            for p in products:
                if any(kw in p.get("name", "").lower() for kw in topic_lower.split()[:3]):
                    return p

        return products[0]

    # ── Redirect helpers ─────────────────────────────────────────────────────

    @staticmethod
    def create_product_url_hint() -> str:
        """
        Return a message explaining that Gumroad write API is unavailable,
        and directing to Whop/Stripe for new product creation.
        """
        return (
            "Gumroad removed product creation via API in 2024. "
            "New products are automatically created on Whop via the D2 pipeline. "
            "To add a Gumroad product, create it manually at gumroad.com/products — "
            "it will be automatically fetched for SNS promotion."
        )
