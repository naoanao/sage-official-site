# -*- coding: utf-8 -*-
"""
backend/integrations/whop_publisher.py
=======================================
Whop API v2 integration for Sage auto-monetization pipeline.

Flow:
  1. create_and_publish()  → Create product + plan → save to registry
  2. update_product()      → Push edited description back after Finalize
  3. /api/webhook/whop     → Receive purchase / refund events (flask_server.py)

Environment Variables:
  WHOP_API_KEY          Bearer token from Whop Developer Dashboard
  WHOP_COMPANY_ID       biz_xxxxxxxxxxxx  (your company/store ID)
  WHOP_WEBHOOK_SECRET   Webhook signing secret from Whop Dashboard → Webhooks
  WHOP_DRY_RUN=1        Skip real API calls (safe for dev/test)
"""

import os
import json
import hmac
import hashlib
import logging
import requests
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("WhopPublisher")

WHOP_BASE_URL = "https://api.whop.com/api/v2"

# ── Product Registry ──────────────────────────────────────────────────────────
# Persists product_id / checkout_url so update_product() can find them
# without re-creating a product on every Finalize.

def _registry_path() -> Path:
    p = Path("backend/data/whop_products.json")
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _load_registry() -> dict:
    p = _registry_path()
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _save_registry(reg: dict) -> None:
    _registry_path().write_text(json.dumps(reg, ensure_ascii=False, indent=2), encoding="utf-8")


def registry_save_product(topic: str, entry: dict) -> None:
    """Save a product entry keyed by topic slug."""
    slug = topic.lower().replace(" ", "-")[:60]
    reg = _load_registry()
    reg[slug] = {**entry, "topic": topic, "saved_at": datetime.utcnow().isoformat()}
    _save_registry(reg)
    logger.info(f"[WHOP][REG] Saved: {slug} → {entry.get('product_id')}")


def registry_find_by_topic(topic: str) -> dict | None:
    """Return registry entry for topic, or None."""
    slug = topic.lower().replace(" ", "-")[:60]
    return _load_registry().get(slug)


def registry_find_by_product_id(product_id: str) -> dict | None:
    """Return registry entry for product_id, or None."""
    for entry in _load_registry().values():
        if entry.get("product_id") == product_id:
            return entry
    return None


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _get_headers() -> dict:
    key = os.getenv("WHOP_API_KEY", "")
    if not key:
        raise ValueError(
            "WHOP_API_KEY is not set. Add it to .env.\n"
            "Get your key at: https://dash.whop.com/developer"
        )
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _company_id() -> str:
    cid = os.getenv("WHOP_COMPANY_ID", "")
    if not cid:
        raise ValueError("WHOP_COMPANY_ID is not set. Add it to .env (format: biz_xxxxxxxxxxxx).")
    return cid


# ── Webhook signature verification ───────────────────────────────────────────

def verify_webhook_signature(payload_bytes: bytes, signature_header: str, secret: str) -> bool:
    """
    Verify Whop webhook HMAC-SHA256 signature.

    Whop sends: X-Whop-Signature-256: sha256=<hex_digest>
    We compute: HMAC-SHA256(secret, raw_body) and compare.

    Returns True if valid, False if invalid (or if secret is empty → skip verification).
    """
    if not secret:
        logger.warning("[WHOP][WEBHOOK] WHOP_WEBHOOK_SECRET not set — skipping signature verification.")
        return True  # Dev mode: skip

    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"), payload_bytes, hashlib.sha256
    ).hexdigest()

    received = signature_header or ""
    valid = hmac.compare_digest(expected, received)
    if not valid:
        logger.warning(f"[WHOP][WEBHOOK] Signature mismatch. Got: {received[:40]}")
    return valid


# ── CRUD ──────────────────────────────────────────────────────────────────────

def create_product(title: str, description: str, visibility: str = "visible") -> dict:
    """POST /api/v2/products — create a new Whop product."""
    payload = {
        "title": title,
        "description": description,
        "visibility": visibility,
        "company_id": _company_id(),
    }
    logger.info(f"[WHOP] Creating product: {title!r}")
    resp = requests.post(f"{WHOP_BASE_URL}/products", headers=_get_headers(), json=payload, timeout=30)
    if not resp.ok:
        raise RuntimeError(f"Whop product creation failed [{resp.status_code}]: {resp.text[:400]}")
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
    """POST /api/v2/plans — attach a purchase plan to a product."""
    payload = {
        "product_id": product_id,
        "initial_price": int(price_usd * 100),  # cents
        "currency": currency,
        "billing_period": billing_period,
        "billing_period_unit": billing_period_unit,
    }
    logger.info(f"[WHOP] Creating plan for {product_id}: ${price_usd}")
    resp = requests.post(f"{WHOP_BASE_URL}/plans", headers=_get_headers(), json=payload, timeout=30)
    if not resp.ok:
        raise RuntimeError(f"Whop plan creation failed [{resp.status_code}]: {resp.text[:400]}")
    data = resp.json()
    logger.info(f"[WHOP] Plan created: id={data.get('id')}")
    return data


def get_product(product_id: str) -> dict:
    """GET /api/v2/products/{id} — fetch product details."""
    resp = requests.get(f"{WHOP_BASE_URL}/products/{product_id}", headers=_get_headers(), timeout=15)
    if not resp.ok:
        raise RuntimeError(f"Whop get_product failed [{resp.status_code}]: {resp.text[:200]}")
    return resp.json()


def update_product(product_id: str, title: str | None = None, description: str | None = None) -> dict:
    """
    PATCH /api/v2/products/{id} — update title and/or description.

    Called automatically after /api/productize/finalize so the Whop
    product page always reflects the user-edited course content.
    """
    if os.getenv("WHOP_DRY_RUN", "0") == "1":
        logger.info(f"[WHOP][DRY_RUN] update_product skipped for {product_id}")
        return {"status": "dry_run", "product_id": product_id}

    payload = {}
    if title:
        payload["title"] = title
    if description:
        payload["description"] = description
    if not payload:
        return {"status": "noop"}

    resp = requests.patch(
        f"{WHOP_BASE_URL}/products/{product_id}",
        headers=_get_headers(),
        json=payload,
        timeout=30,
    )
    if not resp.ok:
        raise RuntimeError(f"Whop update_product failed [{resp.status_code}]: {resp.text[:400]}")
    data = resp.json()
    logger.info(f"[WHOP] Product updated: {product_id}")
    return data


# ── Main entry point ──────────────────────────────────────────────────────────

def create_and_publish(
    title: str,
    description: str,
    price_usd: float = 29.99,
    visibility: str = "visible",
    currency: str = "usd",
    topic: str = "",
) -> dict:
    """
    Create a Whop product + plan and persist to the product registry.

    Returns:
    {
        "status":       "success" | "dry_run" | "error",
        "product_id":   "prod_xxxx",
        "plan_id":      "plan_xxxx",
        "product_url":  "https://whop.com/<route>",
        "checkout_url": "https://whop.com/<route>/checkout",
        "title":        str,
        "price_usd":    float,
        "message":      str,
    }
    """
    if os.getenv("WHOP_DRY_RUN", "0") == "1":
        mock_route = title.lower().replace(" ", "-")[:40]
        logger.info(f"[WHOP][DRY_RUN] Skipping real API call for: {title!r}")
        result = {
            "status": "dry_run",
            "product_id": "prod_DRY_RUN",
            "plan_id": "plan_DRY_RUN",
            "product_url": f"https://whop.com/{mock_route}",
            "checkout_url": f"https://whop.com/{mock_route}/checkout",
            "title": title,
            "price_usd": price_usd,
            "message": "[DRY RUN] Set WHOP_DRY_RUN=0 to publish for real.",
        }
        registry_save_product(topic or title, result)
        return result

    try:
        # Check registry — avoid re-creating if topic already published
        existing = registry_find_by_topic(topic or title)
        if existing and existing.get("status") == "success":
            logger.info(f"[WHOP] Topic already in registry: {existing.get('product_id')} — updating description")
            update_product(existing["product_id"], description=description)
            return {**existing, "message": "Updated existing product (registry hit)"}

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
        registry_save_product(topic or title, result)
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


# ── SNS captions ──────────────────────────────────────────────────────────────

def build_sns_caption(title: str, price_usd: float, product_url: str, checkout_url: str) -> dict:
    """Generate Bluesky + Instagram captions from a Whop product listing."""
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
