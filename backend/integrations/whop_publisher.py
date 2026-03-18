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
  4. update_product()           — 既存商品の visibility を変更（入れ替え用）
  5. replace_latest_product()   — 旧商品を hidden にして新商品を出版（入れ替え）
  6. create_and_publish()       — 新規出版のワンコール

API Notes (from official docs/SDK research):
  - POST /products: title max 40 chars, company_id required
  - POST /plans: plan_type="one_time"|"renewal", initial_price in cents
  - PATCH /products/{id}: visibility "visible"|"hidden"|"archived"|"quick_link"
  - GET /products: visibilities[] filter, cursor-based pagination
  - external_identifier: supports upsert (update if exists)
  - Rate limit: 429 = wait 60s (Retry-After header)

Environment Variables Required:
  WHOP_API_KEY      - Bearer token from Whop Developer Dashboard
  WHOP_COMPANY_ID   - biz_xxxxxxxxxxxx  (your company/store ID)

Optional:
  WHOP_DRY_RUN=1    - Skip real API calls, return mock data (safe for dev/test)
"""

import os
import logging
import time
import requests
from typing import Optional

logger = logging.getLogger("WhopPublisher")

WHOP_BASE_URL = "https://api.whop.com/api/v1"

# Whop product title max length (API enforced)
_TITLE_MAX_LEN = 40


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


def _is_dry_run() -> bool:
    return os.getenv("WHOP_DRY_RUN", "0") == "1"


def _truncate_title(title: str) -> str:
    """Whop enforces a 40-character title limit."""
    if len(title) > _TITLE_MAX_LEN:
        truncated = title[:_TITLE_MAX_LEN - 1].rstrip() + "…"
        logger.warning(f"[WHOP] Title truncated to {_TITLE_MAX_LEN} chars: {truncated!r}")
        return truncated
    return title


def _handle_rate_limit(resp: requests.Response) -> None:
    """429 時に Retry-After 秒だけ待機してから RuntimeError を上げる。"""
    if resp.status_code == 429:
        wait = int(resp.headers.get("Retry-After", 60))
        logger.warning(f"[WHOP] Rate limited. Waiting {wait}s …")
        time.sleep(wait)
        raise RuntimeError(f"Whop API rate limited (429). Retry after {wait}s.")


# ──────────────────────────────────────────────────────────────────────────────
# Read
# ──────────────────────────────────────────────────────────────────────────────

def list_products(
    limit: int = 10,
    visibilities: Optional[list] = None,
) -> list[dict]:
    """
    会社の商品一覧を取得する。

    Args:
        limit       - 取得件数 (max 100)
        visibilities - フィルター例: ["visible"] / ["hidden"] / ["visible","hidden"]
                       None の場合はすべて返す

    Returns:
        商品 dict のリスト。各要素に id / title / visibility / route が含まれる。
    """
    if _is_dry_run():
        logger.info("[WHOP][DRY_RUN] list_products() skipped.")
        return [
            {
                "id": "prod_DRY_RUN_1",
                "title": "Sample Product A",
                "visibility": "visible",
                "route": "sample-product-a",
            }
        ]

    headers = _get_headers()
    cid = _company_id()
    params: dict = {"company_id": cid, "first": limit}
    if visibilities:
        # Whop API accepts repeated query param: visibilities[]=visible
        params["visibilities[]"] = visibilities

    resp = requests.get(
        f"{WHOP_BASE_URL}/products", headers=headers, params=params, timeout=15
    )
    _handle_rate_limit(resp)
    if not resp.ok:
        raise RuntimeError(
            f"Whop list_products failed [{resp.status_code}]: {resp.text[:400]}"
        )
    data = resp.json()
    # Response: {"data": [...], "paging": {...}} or direct list
    if isinstance(data, dict) and "data" in data:
        return data["data"]
    if isinstance(data, list):
        return data
    return []


# ──────────────────────────────────────────────────────────────────────────────
# Write
# ──────────────────────────────────────────────────────────────────────────────

def create_product(
    title: str,
    description: str,
    headline: str = "",
    visibility: str = "visible",
    external_identifier: Optional[str] = None,
) -> dict:
    """
    Whop 商品を作成する（既存商品のアップサートにも対応）。

    Args:
        title               - 商品名（最大40文字、自動トランケート）
        description         - 説明文
        headline            - キャッチコピー（短い1行）
        visibility          - "visible" | "hidden" | "archived" | "quick_link"
        external_identifier - 指定すると同一 ID の商品を update（upsert）

    Returns the raw Whop API response dict.
    """
    headers = _get_headers()
    title = _truncate_title(title)
    payload: dict = {
        "title": title,
        "description": description,
        "visibility": visibility,
        "company_id": _company_id(),
    }
    if headline:
        payload["headline"] = headline[:80]  # reasonable limit
    if external_identifier:
        payload["external_identifier"] = external_identifier

    logger.info(f"[WHOP] Creating product: {title!r} visibility={visibility}")
    resp = requests.post(
        f"{WHOP_BASE_URL}/products", headers=headers, json=payload, timeout=30
    )
    _handle_rate_limit(resp)
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
    plan_type: str = "one_time",
    billing_period: int = 30,
) -> dict:
    """
    商品に価格プランを紐付ける。

    Args:
        product_id    - Whop product ID from create_product()
        price_usd     - Price in USD, converted internally to cents
        currency      - ISO 4217 currency code (default: "usd")
        plan_type     - "one_time" | "renewal"
        billing_period - renewal の場合の請求間隔（日数、one_time では無視）

    Returns the raw Whop API plan dict.
    """
    headers = _get_headers()
    payload: dict = {
        "product_id": product_id,
        "company_id": _company_id(),
        "plan_type": plan_type,
        "initial_price": int(price_usd * 100),  # cents
        "currency": currency,
    }
    if plan_type == "renewal":
        payload["billing_period"] = billing_period
        payload["renewal_price"] = int(price_usd * 100)

    logger.info(
        f"[WHOP] Creating plan for product {product_id}: "
        f"${price_usd} {plan_type} currency={currency}"
    )
    resp = requests.post(
        f"{WHOP_BASE_URL}/plans", headers=headers, json=payload, timeout=30
    )
    _handle_rate_limit(resp)
    if not resp.ok:
        raise RuntimeError(
            f"Whop plan creation failed [{resp.status_code}]: {resp.text[:400]}"
        )
    data = resp.json()
    logger.info(f"[WHOP] Plan created: id={data.get('id')} type={plan_type}")
    return data


def update_product(product_id: str, visibility: str) -> dict:
    """
    既存商品の visibility を更新する。

    Args:
        product_id  - Whop product ID (prod_xxxx)
        visibility  - "visible" | "hidden" | "archived" | "quick_link"

    Returns:
        更新後の商品 dict
    """
    if _is_dry_run():
        logger.info(f"[WHOP][DRY_RUN] update_product({product_id}, {visibility}) skipped.")
        return {"id": product_id, "visibility": visibility, "status": "dry_run"}

    headers = _get_headers()
    payload = {"visibility": visibility}
    logger.info(f"[WHOP] Updating product {product_id}: visibility → {visibility}")
    resp = requests.patch(
        f"{WHOP_BASE_URL}/products/{product_id}",
        headers=headers,
        json=payload,
        timeout=15,
    )
    _handle_rate_limit(resp)
    if not resp.ok:
        raise RuntimeError(
            f"Whop update_product failed [{resp.status_code}]: {resp.text[:400]}"
        )
    data = resp.json()
    logger.info(f"[WHOP] Product {product_id} updated: visibility={data.get('visibility')}")
    return data


# ──────────────────────────────────────────────────────────────────────────────
# Compound operations
# ──────────────────────────────────────────────────────────────────────────────

def create_and_publish(
    title: str,
    description: str,
    price_usd: float = 29.99,
    visibility: str = "visible",
    currency: str = "usd",
    plan_type: str = "one_time",
    headline: str = "",
) -> dict:
    """
    新規出版のメインエントリポイント: Whop 商品 + プランをワンコールで作成する。

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
        mock_route = _truncate_title(title).lower().replace(" ", "-").replace("…", "")
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
        product = create_product(title, description, headline, visibility)
        plan = create_plan(product["id"], price_usd, currency, plan_type)

        route = product.get("route", "")
        product_url = (
            f"https://whop.com/{route}" if route else f"https://whop.com/products/{product['id']}"
        )
        checkout_url = f"{product_url}/checkout"

        return {
            "status": "success",
            "product_id": product["id"],
            "plan_id": plan["id"],
            "product_url": product_url,
            "checkout_url": checkout_url,
            "title": product.get("title", title),
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


def replace_latest_product(
    new_title: str,
    new_description: str,
    price_usd: float = 29.99,
    currency: str = "usd",
    plan_type: str = "one_time",
    headline: str = "",
    hide_old: bool = True,
) -> dict:
    """
    現在公開中の最新商品を hidden にして、新商品を公開する（入れ替え）。

    手順:
      1. list_products(visibilities=["visible"]) で公開中商品を取得
      2. 最新 1 件を hidden に更新
      3. create_and_publish() で新商品を作成
      4. 結果を返す

    Returns:
    {
        "status":         "success" | "dry_run" | "error",
        "new_product":    { ...create_and_publish の戻り値 },
        "hidden_product": { "id": ..., "title": ... } | None,
        "message":        str
    }
    """
    hidden_info = None

    try:
        # Step 1: 公開中商品を取得 → 最新 1 件を非公開化
        if hide_old:
            try:
                products = list_products(limit=5, visibilities=["visible"])
                if products:
                    old = products[0]
                    update_product(old["id"], "hidden")
                    hidden_info = {
                        "id": old["id"],
                        "title": old.get("title", ""),
                        "previous_visibility": "visible",
                    }
                    logger.info(
                        f"[WHOP] Old product hidden: {old['id']} '{old.get('title', '')}'"
                    )
                else:
                    logger.info("[WHOP] No visible products found to replace.")
            except Exception as list_err:
                logger.warning(f"[WHOP] Could not hide old product: {list_err}")

        # Step 2: 新商品を出版
        new_result = create_and_publish(
            new_title, new_description, price_usd, "visible", currency, plan_type, headline
        )

        if new_result.get("status") in ("success", "dry_run"):
            msg = (
                f"New product published: {new_result.get('product_url', '')}"
                + (f" | Old product hidden: {hidden_info['id']}" if hidden_info else "")
            )
        else:
            msg = f"Publish failed: {new_result.get('message', 'unknown error')}"

        return {
            "status": new_result.get("status", "error"),
            "new_product": new_result,
            "hidden_product": hidden_info,
            "message": msg,
        }

    except ValueError as ve:
        return {"status": "error", "new_product": None, "hidden_product": None, "message": str(ve)}
    except Exception as e:
        logger.error(f"[WHOP] replace_latest_product error: {e}")
        return {"status": "error", "new_product": None, "hidden_product": None, "message": str(e)}


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
