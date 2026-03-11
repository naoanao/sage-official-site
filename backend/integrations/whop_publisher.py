# -*- coding: utf-8 -*-
"""
backend/integrations/whop_publisher.py
=======================================
Whop API v5 integration for Sage auto-monetization pipeline.

Flow:
  1. Create product  (POST /api/v5/products)
  2. Create one-time purchase plan attached to that product (POST /api/v5/plans)
  3. Return public product URL + plan_id for downstream SNS posting

Environment Variables Required:
  WHOP_API_KEY      - Bearer token from Whop Developer Dashboard
  WHOP_COMPANY_ID   - biz_xxxxxxxxxxxx  (your company/store ID)

Optional:
  WHOP_DRY_RUN=1    - Skip real API calls, return mock data (safe for dev/test)
"""

import os
import logging
import requests
from typing import Optional

logger = logging.getLogger("WhopPublisher")

WHOP_BASE_URL = "https://api.whop.com/api/v2"
WHOP_API_KEY = None   # Loaded lazily to pick up runtime env changes
WHOP_COMPANY_ID = None


def _get_headers() -> dict:
    """Resolve API key at call-time (picks up .env updates without restart)."""
    key = os.getenv("WHOP_API_KEY", "")
    if not key:
        raise ValueError(
            "WHOP_API_KEY is not set. Add it to .env and restart the server.\n"
            "Get your key at: https://dash.whop.com/developer"
        )
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _company_id() -> str:
    cid = os.getenv("WHOP_COMPANY_ID", "")
    if not cid:
        raise ValueError(
            "WHOP_COMPANY_ID is not set. Add it to .env (format: biz_xxxxxxxxxxxx)."
        )
    return cid


def create_product(title: str, description: str, visibility: str = "visible") -> dict:
    """
    Step 1: Create a Whop product.

    Returns the raw Whop API response dict containing at minimum:
      id, route, title, visibility
    """
    headers = _get_headers()
    payload = {
        "title": title,
        "description": description,
        "visibility": visibility,
        "company_id": _company_id(),
    }
    logger.info(f"[WHOP] Creating product: {title!r}")
    resp = requests.post(f"{WHOP_BASE_URL}/products", headers=headers, json=payload, timeout=30)

    if not resp.ok:
        raise RuntimeError(
            f"Whop product creation failed [{resp.status_code}]: {resp.text[:400]}"
        )
    data = resp.json()
    logger.info(f"[WHOP] Product created: id={data.get('id')} route={data.get('route')}")
    return data


def create_plan(
    product_id: str,
    price_usd: float = 29.99,
    currency: str = "usd",
    billing_period: int = 1,
    billing_period_unit: str = "one_time",
) -> dict:
    """
    Step 2: Attach a purchase plan to a product.

    Args:
        product_id        - Whop product ID from create_product()
        price_usd         - Price in USD (float), converted internally to cents
        currency          - ISO 4217 currency code (default: "usd")
        billing_period    - 1 for one-time
        billing_period_unit - "one_time" | "month" | "year"

    Returns the raw Whop API plan dict.
    """
    headers = _get_headers()
    payload = {
        "product_id": product_id,
        "initial_price": int(price_usd * 100),  # Convert to cents
        "currency": currency,
        "billing_period": billing_period,
        "billing_period_unit": billing_period_unit,
    }
    logger.info(f"[WHOP] Creating plan for product {product_id}: ${price_usd} {billing_period_unit}")
    resp = requests.post(f"{WHOP_BASE_URL}/plans", headers=headers, json=payload, timeout=30)

    if not resp.ok:
        raise RuntimeError(
            f"Whop plan creation failed [{resp.status_code}]: {resp.text[:400]}"
        )
    data = resp.json()
    logger.info(f"[WHOP] Plan created: id={data.get('id')}")
    return data


def create_and_publish(
    title: str,
    description: str,
    price_usd: float = 29.99,
    visibility: str = "visible",
    currency: str = "usd",
) -> dict:
    """
    Main entry point: Create a Whop product + plan in one call.

    Returns:
    {
        "status":       "success" | "dry_run" | "error",
        "product_id":   "prod_xxxx",
        "plan_id":      "plan_xxxx",
        "product_url":  "https://whop.com/<route>",
        "checkout_url": "https://whop.com/<route>/checkout",
        "title":        "<title>",
        "price_usd":    29.99,
        "message":      "human-readable status"
    }
    """
    # --- DRY RUN MODE ---
    # Only WHOP_DRY_RUN controls Whop publishing.
    # SAGE_POST_DRY_RUN is intentionally ignored here to allow Whop to publish
    # even while other Sage dry-run guards are active.
    if os.getenv("WHOP_DRY_RUN", "0") == "1":
        mock_route = title.lower().replace(" ", "-")[:40]
        logger.info(f"[WHOP][DRY_RUN] Skipping real API call for: {title!r}")
        return {
            "status": "dry_run",
            "product_id": "prod_DRY_RUN",
            "plan_id": "plan_DRY_RUN",
            "product_url": f"https://whop.com/{mock_route}",
            "checkout_url": f"https://whop.com/{mock_route}/checkout",
            "title": title,
            "price_usd": price_usd,
            "message": "[DRY RUN] Real API call skipped. Set WHOP_DRY_RUN=0 to publish.",
        }

    try:
        product = create_product(title, description, visibility)
        plan = create_plan(product["id"], price_usd, currency)

        route = product.get("route", "")
        product_url = f"https://whop.com/{route}" if route else f"https://whop.com/products/{product['id']}"
        checkout_url = f"{product_url}/checkout"

        return {
            "status": "success",
            "product_id": product["id"],
            "plan_id": plan["id"],
            "product_url": product_url,
            "checkout_url": checkout_url,
            "title": title,
            "price_usd": price_usd,
            "message": f"Published to Whop: {product_url}",
        }

    except ValueError as ve:
        logger.warning(f"[WHOP] Config error: {ve}")
        return {"status": "error", "message": str(ve)}
    except RuntimeError as re:
        logger.error(f"[WHOP] API error: {re}")
        return {"status": "error", "message": str(re)}
    except Exception as e:
        logger.error(f"[WHOP] Unexpected error: {e}")
        return {"status": "error", "message": f"Unexpected error: {e}"}


def build_sns_caption(title: str, price_usd: float, product_url: str, checkout_url: str) -> dict:
    """
    Generate ready-to-post SNS captions for Bluesky and Instagram
    from a Whop product listing.

    Returns:
        {"bluesky": str, "instagram": str}
    """
    short_title = title[:60] if len(title) > 60 else title
    bluesky_text = (
        f"🚀 New digital product just launched!\n\n"
        f"'{short_title}'\n\n"
        f"💰 ${price_usd:.0f} — one-time purchase, instant access\n\n"
        f"👉 {checkout_url}\n\n"
        f"#AI #SideHustle #DigitalProduct #Automation"
    )
    instagram_caption = (
        f"🚀 Just launched: '{short_title}'\n\n"
        f"${price_usd:.0f} · Digital download · Instant access\n\n"
        f"Get it now 👇 Link in bio\n{checkout_url}\n\n"
        f"#AItools #PassiveIncome #DigitalProduct #AutomationLife #SolopreNeur"
    )
    return {"bluesky": bluesky_text, "instagram": instagram_caption}
