# -*- coding: utf-8 -*-
"""
backend/integrations/whop_publisher.py
=======================================
Whop API v2 integration for Sage auto-monetization pipeline.

Flow:
  1. Create product  (POST /api/v2/products)
  2. Create one-time purchase plan attached to that product (POST /api/v2/plans)
  3. Return public product URL + plan_id for downstream SNS posting

Environment Variables Required:
  WHOP_API_KEY        - Bearer token from Whop Developer Dashboard
  WHOP_COMPANY_ID     - biz_xxxxxxxxxxxx  (your company/store ID)

Optional:
  WHOP_DRY_RUN=1      - Skip real API calls, return mock data (safe for dev/test)
  WHOP_WEBHOOK_SECRET - Webhook secret for verifying purchase/refund events
                        (set in Whop Dashboard → Settings → Webhooks)
"""

import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

logger = logging.getLogger("WhopPublisher")

WHOP_BASE_URL = "https://api.whop.com/api/v2"

# Local registry: maps topic slug → {product_id, plan_id, product_url, checkout_url, created_at}
# Persisted to backend/data/whop_products.json so updates survive restarts.
_REGISTRY_PATH = Path(__file__).resolve().parents[1] / "data" / "whop_products.json"


def _load_registry() -> dict:
    try:
        if _REGISTRY_PATH.exists():
            return json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_registry(registry: dict) -> None:
    try:
        _REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
        _REGISTRY_PATH.write_text(json.dumps(registry, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        logger.warning(f"[WHOP] Registry save failed: {e}")


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


def verify_webhook_signature(payload_bytes: bytes, signature_header: str) -> bool:
    """
    Verify Whop webhook HMAC-SHA256 signature.
    Whop sends: X-Whop-Signature: sha256=<hex_digest>
    Set WHOP_WEBHOOK_SECRET in .env (from Whop Dashboard → Webhooks).
    Returns True if valid, False otherwise.
    """
    secret = os.getenv("WHOP_WEBHOOK_SECRET", "")
    if not secret:
        logger.warning("[WHOP] WHOP_WEBHOOK_SECRET not set — skipping signature check (unsafe!)")
        return True  # Allow through but log warning

    try:
        expected = "sha256=" + hmac.new(
            secret.encode("utf-8"), payload_bytes, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature_header)
    except Exception as e:
        logger.error(f"[WHOP] Signature verification error: {e}")
        return False


def get_product(product_id: str) -> dict:
    """Fetch a Whop product by ID. Returns the API response dict."""
    headers = _get_headers()
    resp = requests.get(f"{WHOP_BASE_URL}/products/{product_id}", headers=headers, timeout=15)
    if not resp.ok:
        raise RuntimeError(f"Whop get_product failed [{resp.status_code}]: {resp.text[:400]}")
    return resp.json()


def update_product(product_id: str, title: str = None, description: str = None) -> dict:
    """
    Update an existing Whop product's title and/or description.
    Used after course regeneration to keep the Whop listing in sync.

    Returns the updated product dict on success.
    """
    headers = _get_headers()
    payload = {}
    if title:
        payload["title"] = title
    if description:
        payload["description"] = description

    if not payload:
        return {"status": "skipped", "message": "Nothing to update"}

    logger.info(f"[WHOP] Updating product {product_id}: {list(payload.keys())}")
    resp = requests.patch(f"{WHOP_BASE_URL}/products/{product_id}", headers=headers, json=payload, timeout=30)

    if not resp.ok:
        raise RuntimeError(f"Whop update_product failed [{resp.status_code}]: {resp.text[:400]}")

    data = resp.json()
    logger.info(f"[WHOP] Product updated: {product_id}")
    return data


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
        mock_route = title.lower().replace(" ", "-")[:40]  # type: ignore
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

        result = {
            "status": "success",
            "product_id": product["id"],
            "plan_id": plan["id"],
            "product_url": product_url,
            "checkout_url": checkout_url,
            "title": title,
            "price_usd": price_usd,
            "message": f"Published to Whop: {product_url}",
        }

        # Persist to local registry for future updates
        registry = _load_registry()
        slug = title.lower().replace(" ", "_")[:60]
        registry[slug] = {
            "product_id": product["id"],
            "plan_id": plan["id"],
            "product_url": product_url,
            "checkout_url": checkout_url,
            "title": title,
            "price_usd": price_usd,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _save_registry(registry)

        return result

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
    short_title = title[:60] if len(title) > 60 else title  # type: ignore
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
