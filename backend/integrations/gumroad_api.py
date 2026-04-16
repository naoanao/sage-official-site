"""
gumroad_api.py
──────────────────────────────────────────────────────────────────
Gumroad API v2 統合モジュール

対応機能:
  - 商品一覧取得・詳細取得（売上・収益含む）
  - 購入者一覧取得
  - 売上サマリー（Store Managerに表示するデータ）
  - Make.com経由の商品新規作成トリガー

注意: Gumroad APIv2 は商品の新規作成エンドポイントを一般公開していない。
      新規商品登録は Make.com 経由（MAKE_GUMROAD_WEBHOOK_URL）で行う。

環境変数:
  GUMROAD_ACCESS_TOKEN      — Gumroad Settings → Advanced → Access Token
  MAKE_GUMROAD_WEBHOOK_URL  — Make.com の商品作成シナリオWebhook URL（任意）
"""

import os
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

GUMROAD_API_BASE = "https://api.gumroad.com/v2"


class GumroadAPI:
    """Gumroad APIv2 クライアント。"""

    def __init__(self, access_token: Optional[str] = None):
        self.access_token = access_token or os.getenv("GUMROAD_ACCESS_TOKEN", "")
        if not self.access_token:
            logger.warning("[Gumroad] GUMROAD_ACCESS_TOKEN not set. API calls will fail.")

    def _get(self, path: str, params: dict = None) -> dict:
        """GETリクエスト共通処理。"""
        if not self.access_token:
            return {"success": False, "error": "GUMROAD_ACCESS_TOKEN not set"}

        url = f"{GUMROAD_API_BASE}/{path.lstrip('/')}"
        p = {"access_token": self.access_token}
        if params:
            p.update(params)

        try:
            res = requests.get(url, params=p, timeout=15)
            data = res.json()
            if not res.ok:
                logger.error(f"[Gumroad] GET {path} failed: {data}")
            return data
        except Exception as e:
            logger.error(f"[Gumroad] GET {path} exception: {e}")
            return {"success": False, "error": str(e)}

    # ── 商品一覧 ─────────────────────────────────────────────────
    def list_products(self) -> list:
        """
        Gumroadに登録済みの全商品を返す。

        Returns:
            [
              {
                "id": "apvbzh",
                "name": "Sage 3.0 Developer Blueprint",
                "price": 4900,           # cents
                "sales_count": 3,
                "revenue": 14700,        # cents
                "published": True,
                "url": "https://gumroad.com/l/apvbzh",
                ...
              }, ...
            ]
        """
        data = self._get("products")
        if not data.get("success"):
            logger.error(f"[Gumroad] list_products failed: {data.get('message', data)}")
            return []
        products = data.get("products", [])
        logger.info(f"[Gumroad] {len(products)} products found.")
        return products

    # ── 商品詳細 ─────────────────────────────────────────────────
    def get_product(self, product_id: str) -> Optional[dict]:
        """指定IDの商品詳細を返す。"""
        data = self._get(f"products/{product_id}")
        if data.get("success"):
            return data.get("product")
        logger.error(f"[Gumroad] get_product({product_id}) failed: {data}")
        return None

    # ── 購入者・売上一覧 ──────────────────────────────────────────
    def list_sales(self, product_id: Optional[str] = None, page_key: Optional[str] = None) -> dict:
        """
        売上（購入者）一覧を返す。

        Args:
            product_id: 絞り込む商品ID（省略で全商品）
            page_key:   ページネーション用キー

        Returns:
            {
              "sales": [...],
              "next_page_key": "...",
              "next_page_url": "..."
            }
        """
        params = {}
        if product_id:
            params["product_id"] = product_id
        if page_key:
            params["page_key"] = page_key

        data = self._get("sales", params)
        return {
            "sales":         data.get("sales", []),
            "next_page_key": data.get("next_page_key"),
            "next_page_url": data.get("next_page_url"),
        }

    # ── 収益サマリー（Store Manager用） ────────────────────────────
    def get_revenue_summary(self) -> dict:
        """
        全商品の収益サマリーを返す。
        Store Managerのダッシュボードに表示するデータ。

        Returns:
            {
              "total_revenue_usd": 147.0,
              "total_sales_count": 3,
              "products": [
                {
                  "id": "apvbzh",
                  "name": "Sage 3.0 Developer Blueprint",
                  "price_usd": 49.0,
                  "sales_count": 3,
                  "revenue_usd": 147.0,
                  "published": True,
                }
              ]
            }
        """
        products = self.list_products()
        total_revenue = 0
        total_sales   = 0
        summary_products = []

        for p in products:
            price_cents   = int(p.get("price", 0))
            sales_count   = int(p.get("sales_count", 0))
            revenue_cents = int(p.get("revenue", 0)) if p.get("revenue") else price_cents * sales_count

            total_revenue += revenue_cents
            total_sales   += sales_count

            summary_products.append({
                "id":           p.get("id", ""),
                "name":         p.get("name", "Unknown"),
                "price_usd":    round(price_cents / 100, 2),
                "sales_count":  sales_count,
                "revenue_usd":  round(revenue_cents / 100, 2),
                "published":    p.get("published", False),
                "url":          p.get("url", ""),
                "short_url":    p.get("short_url", ""),
            })

        return {
            "total_revenue_usd":  round(total_revenue / 100, 2),
            "total_sales_count":  total_sales,
            "products":           summary_products,
        }

    # ── Make.com 経由の新規商品登録リクエスト ──────────────────────
    def trigger_product_creation_via_make(self, product_data: dict) -> dict:
        """
        Gumroad APIは商品新規作成を公開していないため、
        Make.com のWebhookを経由して商品登録を依頼する。

        Make.com シナリオ側:
          Webhook受信 → Gumroadモジュールで商品作成 → 完了通知

        Args:
            product_data: {
              "name": "商品名",
              "description": "説明文（HTML可）",
              "price": 4900,        # セント単位
              "file_url": "...",    # コンテンツファイルURL
              "cover_url": "...",   # カバー画像URL（任意）
              "tags": [...],        # タグリスト（任意）
            }
        """
        make_url = os.getenv("MAKE_GUMROAD_WEBHOOK_URL", "")
        if not make_url:
            logger.warning("[Gumroad] MAKE_GUMROAD_WEBHOOK_URL not set.")
            return {"success": False, "error": "MAKE_GUMROAD_WEBHOOK_URL not configured"}

        try:
            res = requests.post(make_url, json={
                "action": "create_product",
                "product": product_data,
            }, timeout=15)
            if res.ok:
                logger.info(f"[Gumroad] Product creation sent to Make.com: {product_data.get('name')}")
                return {"success": True, "message": "Sent to Make.com for product creation"}
            else:
                return {"success": False, "error": f"Make.com returned {res.status_code}"}
        except Exception as e:
            logger.error(f"[Gumroad] trigger_product_creation_via_make error: {e}")
            return {"success": False, "error": str(e)}


# ── CLI テスト用 ─────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO)

    api = GumroadAPI()
    print("\n=== Gumroad Revenue Summary ===")
    summary = api.get_revenue_summary()
    print(json.dumps(summary, indent=2, ensure_ascii=False))

    print("\n=== Latest Sales ===")
    sales = api.list_sales()
    print(f"Sales in response: {len(sales['sales'])}")
    for s in sales["sales"][:5]:
        print(f"  - {s.get('product_name','N/A')} | ${int(s.get('price',0))/100:.2f} | {s.get('email','N/A')} | {str(s.get('created_at',''))[:10]}")
