# -*- coding: utf-8 -*-
"""
backend/integrations/whop_publisher.py
=======================================
Whop API v1 integration for Sage auto-monetization pipeline.
(Base URL confirmed from official SDK: https://api.whop.com/api/v1)

Flow:
  1. list_products()            — 現在の商品一覧を取得
  2. create_product()           — 新商品を作成（タイトル最大40文字）
  3. create_plan()              — 価格プランを紐付け
  4. update_product()           — 既存商品の visibility / description を変更
  5. replace_latest_product()   — 旧商品を hidden にして新商品を出版（入れ替え）
  6. create_and_publish()       — 新規出版のワンコール

API Notes (from official docs/SDK):
  - POST /products: title max 40 chars, company_id required
  - POST /plans: plan_type="one_time"|"renewal", initial_price in cents, company_id required
  - PATCH /products/{id}: visibility "visible"|"hidden"|"archived"|"quick_link"
  - GET /products: visibilities[] filter, cursor-based pagination
  - external_identifier: supports upsert (update if product already exists)
  - Rate limit: 429 → wait Retry-After seconds (default 60s)

Environment Variables Required:
  WHOP_API_KEY      - Bearer token from Whop Developer Dashboard
  WHOP_COMPANY_ID   - biz_xxxxxxxxxxxx  (your company/store ID)

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
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

logger = logging.getLogger("WhopPublisher")

WHOP_BASE_URL = "https://api.whop.com/api/v1"
WHOP_V5_BASE_URL = "https://api.whop.com/v5/app"

# Whop API enforced limits
_TITLE_MAX_LEN = 40

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


def _truncate_title(title: str) -> str:
    """Whop enforces a 40-character title limit."""
    if len(title) > _TITLE_MAX_LEN:
        truncated = title[:_TITLE_MAX_LEN - 1].rstrip() + "…"
        logger.warning(f"[WHOP] Title truncated to {_TITLE_MAX_LEN} chars: {truncated!r}")
        return truncated
    return title


def _handle_rate_limit(resp: requests.Response) -> None:
    """Raise RuntimeError with wait hint on 429."""
    if resp.status_code == 429:
        retry_after = int(resp.headers.get("Retry-After", 60))
        raise RuntimeError(
            f"Whop rate limit hit (429). Retry after {retry_after}s. "
            f"Response: {resp.text[:200]}"
        )


def _is_dry_run() -> bool:
    return os.getenv("WHOP_DRY_RUN", "0") == "1"


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


def list_products(visibilities: list = None) -> list:
    """
    Fetch Whop products. Optionally filter by visibility.

    Args:
        visibilities: e.g. ["visible"] for public-only, None for all

    Returns list of product dicts.
    """
    headers = _get_headers()
    params = {"company_id": _company_id()}
    if visibilities:
        # Whop API accepts repeated param: visibilities[]=visible&visibilities[]=hidden
        params["visibilities[]"] = visibilities

    resp = requests.get(f"{WHOP_BASE_URL}/products", headers=headers, params=params, timeout=15)
    _handle_rate_limit(resp)
    if not resp.ok:
        raise RuntimeError(f"Whop list_products failed [{resp.status_code}]: {resp.text[:400]}")

    data = resp.json()
    # v1 returns {"data": [...], "pagination": {...}}
    return data.get("data", data.get("products", []))


def get_product(product_id: str) -> dict:
    """Fetch a Whop product by ID. Returns the API response dict."""
    headers = _get_headers()
    resp = requests.get(f"{WHOP_BASE_URL}/products/{product_id}", headers=headers, timeout=15)
    _handle_rate_limit(resp)
    if not resp.ok:
        raise RuntimeError(f"Whop get_product failed [{resp.status_code}]: {resp.text[:400]}")
    return resp.json()


def update_product(
    product_id: str,
    title: str = None,
    description: str = None,
    visibility: str = None,
    headline: str = None,
) -> dict:
    """
    Update an existing Whop product.
    Used after course regeneration to keep the Whop listing in sync,
    and by replace_latest_product() to hide old products.

    visibility options: "visible" | "hidden" | "archived" | "quick_link"
    """
    headers = _get_headers()
    payload = {}
    if title:
        payload["title"] = _truncate_title(title)
    if description:
        payload["description"] = description
    if visibility:
        payload["visibility"] = visibility
    if headline:
        payload["headline"] = headline[:100]

    if not payload:
        return {"status": "skipped", "message": "Nothing to update"}

    logger.info(f"[WHOP] Updating product {product_id}: {list(payload.keys())}")
    resp = requests.patch(
        f"{WHOP_BASE_URL}/products/{product_id}", headers=headers, json=payload, timeout=30
    )
    _handle_rate_limit(resp)
    if not resp.ok:
        raise RuntimeError(f"Whop update_product failed [{resp.status_code}]: {resp.text[:400]}")

    data = resp.json()
    logger.info(f"[WHOP] Product updated: {product_id}")
    return data


def create_product(
    title: str,
    description: str,
    visibility: str = "visible",
    headline: str = None,
    external_identifier: str = None,
) -> dict:
    """
    Create a Whop product.

    Args:
        title                - Product title (auto-truncated to 40 chars)
        description          - Full description / sales copy
        visibility           - "visible" | "hidden" | "quick_link"
        headline             - Short tagline shown on product page (optional)
        external_identifier  - Unique key for upsert: if a product with this key exists,
                               it will be updated instead of creating a duplicate.
    """
    headers = _get_headers()
    payload = {
        "title": _truncate_title(title),
        "description": description,
        "visibility": visibility,
        "company_id": _company_id(),
    }
    if headline:
        payload["headline"] = headline[:100]
    if external_identifier:
        payload["external_identifier"] = external_identifier

    logger.info(f"[WHOP] Creating product: {payload['title']!r}")
    resp = requests.post(f"{WHOP_BASE_URL}/products", headers=headers, json=payload, timeout=30)
    _handle_rate_limit(resp)
    if not resp.ok:
        raise RuntimeError(f"Whop product creation failed [{resp.status_code}]: {resp.text[:400]}")

    data = resp.json()
    logger.info(f"[WHOP] Product created: id={data.get('id')} route={data.get('route')}")
    return data


def create_plan(
    product_id: str,
    price_usd: float = 29.99,
    currency: str = "usd",
    plan_type: str = "one_time",
    billing_period: int = 1,
) -> dict:
    """
    Attach a pricing plan to a product.

    Args:
        product_id   - Whop product ID from create_product()
        price_usd    - Price in USD (float), converted to cents
        currency     - ISO 4217 code (default: "usd")
        plan_type    - "one_time" | "renewal"
        billing_period - For renewal plans: billing interval in days (ignored for one_time)
    """
    headers = _get_headers()
    payload = {
        "product_id": product_id,
        "company_id": _company_id(),
        "initial_price": int(price_usd * 100),
        "currency": currency,
        "plan_type": plan_type,
    }
    if plan_type == "renewal":
        payload["billing_period"] = billing_period

    logger.info(f"[WHOP] Creating plan for product {product_id}: ${price_usd} ({plan_type})")
    resp = requests.post(f"{WHOP_BASE_URL}/plans", headers=headers, json=payload, timeout=30)
    _handle_rate_limit(resp)
    if not resp.ok:
        raise RuntimeError(f"Whop plan creation failed [{resp.status_code}]: {resp.text[:400]}")

    data = resp.json()
    logger.info(f"[WHOP] Plan created: id={data.get('id')}")
    return data


def replace_latest_product(
    title: str,
    description: str,
    price_usd: float = 29.99,
    headline: str = None,
) -> dict:
    """
    Upsert pattern: hide the current visible product and publish a new one.
    Prevents product accumulation — Sage always has exactly one visible product.

    Returns same dict as create_and_publish().
    """
    # Hide existing visible products
    try:
        existing = list_products(visibilities=["visible"])
        for p in existing:
            pid = p.get("id")
            if pid:
                update_product(pid, visibility="hidden")
                logger.info(f"[WHOP] Hidden old product: {pid}")
    except Exception as e:
        logger.warning(f"[WHOP] Could not hide old products: {e}")

    return create_and_publish(title, description, price_usd=price_usd, headline=headline)


def create_and_publish(
    title: str,
    description: str,
    price_usd: float = 29.99,
    visibility: str = "visible",
    currency: str = "usd",
    plan_type: str = "one_time",
    headline: str = None,
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
    if _is_dry_run():
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
        product = create_product(
            title, description, visibility,
            headline=headline,
            external_identifier=title.lower().replace(" ", "_")[:60],
        )
        plan = create_plan(product["id"], price_usd, currency, plan_type=plan_type)

        route = product.get("route", "")
        product_url = (
            f"https://whop.com/{route}" if route
            else f"https://whop.com/products/{product['id']}"
        )
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


def refund_payment(payment_id: str, amount_cents: int = None) -> dict:
    """
    Issue a full (or partial) refund for a Whop payment via API v5.

    Args:
        payment_id   - Whop payment ID (e.g. "pay_xxxxxxxxxxxx")
        amount_cents - Amount to refund in cents. Omit (None) for full refund.

    Returns dict with keys: status, payment_id, refunded_amount, message
    """
    if _is_dry_run():
        logger.info(f"[WHOP][DRY_RUN] Skipping real refund for payment: {payment_id}")
        return {
            "status": "dry_run",
            "payment_id": payment_id,
            "refunded_amount": amount_cents,
            "message": "[DRY RUN] Real refund skipped. Set WHOP_DRY_RUN=0 to execute.",
        }

    headers = _get_headers()
    payload = {}
    if amount_cents is not None:
        payload["amount"] = amount_cents

    logger.info(f"[WHOP] Issuing refund for payment {payment_id} "
                f"({'full' if amount_cents is None else f'{amount_cents} cents'})")

    resp = requests.post(
        f"{WHOP_V5_BASE_URL}/payments/{payment_id}/refund",
        headers=headers,
        json=payload,
        timeout=30,
    )
    _handle_rate_limit(resp)

    if not resp.ok:
        raise RuntimeError(
            f"Whop refund_payment failed [{resp.status_code}]: {resp.text[:400]}"
        )

    data = resp.json()
    logger.info(f"[WHOP] Refund issued: payment={payment_id} response={data}")
    return {
        "status": "success",
        "payment_id": payment_id,
        "refunded_amount": amount_cents,
        "message": f"Refund issued for payment {payment_id}",
        "response": data,
    }


def build_sns_caption(title: str, price_usd: float, product_url: str, checkout_url: str) -> dict:
    """
    Generate ready-to-post SNS captions for Bluesky and Instagram.
    Returns: {"bluesky": str, "instagram": str}
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
