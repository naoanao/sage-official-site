import os
import requests
import json
import opik
from typing import Dict, Any, Optional, List
from datetime import datetime

# Configure Opik
opik.configure(use_local=False)

class ShopifyIntegration:
    def __init__(self):
        self.name = "Shopify Integration"
        self.api_key = os.getenv("SHOPIFY_API_KEY")
        self.api_secret = os.getenv("SHOPIFY_API_SECRET")
        self.access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
        self.store_url = os.getenv("SHOPIFY_STORE_URL", "").rstrip("/")
        self.api_version = "2024-01"
        
        if not self.access_token or not self.store_url:
            print("[Shopify] Warning: SHOPIFY_ACCESS_TOKEN or SHOPIFY_STORE_URL not set.")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json"
        }
    
    def _get_api_url(self, endpoint: str) -> str:
        return f"{self.store_url}/admin/api/{self.api_version}/{endpoint}.json"
    
    @opik.track(name="shopify_create_product")
    def create_product(self, title: str, body_html: str, vendor: str = "RemoteGeminiPro", 
                      product_type: str = "", tags: List[str] = None, 
                      price: float = 0.0, compare_at_price: float = None,
                      images: List[str] = None) -> Dict[str, Any]:
        """
        商品を作成
        
        Args:
            title: 商品名
            body_html: 商品説明（HTML）
            vendor: ベンダー名
            product_type: 商品タイプ
            tags: タグリスト
            price: 価格
            compare_at_price: 比較価格（割引前価格）
            images: 画像URLリスト
            
        Returns:
            作成された商品データ
        """
        if not self.access_token:
            return {"error": "SHOPIFY_ACCESS_TOKEN not configured"}
        
        print(f"[Shopify] Creating product: {title}")
        
        product_data = {
            "product": {
                "title": title,
                "body_html": body_html,
                "vendor": vendor,
                "product_type": product_type,
                "tags": ", ".join(tags) if tags else "",
                "variants": [{
                    "price": str(price),
                    "compare_at_price": str(compare_at_price) if compare_at_price else None
                }]
            }
        }
        
        # 画像を追加
        if images:
            product_data["product"]["images"] = [{"src": url} for url in images]
        
        try:
            response = requests.post(
                self._get_api_url("products"),
                headers=self._get_headers(),
                json=product_data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            product = result.get("product", {})
            print(f"[Shopify] Product created: ID {product.get('id')}")
            
            # Log to Opik
            opik.log({
                "action": "create_product",
                "product_id": product.get("id"),
                "title": title,
                "price": price
            })
            
            return result
            
        except Exception as e:
            print(f"[Shopify] Failed to create product: {e}")
            return {"error": str(e)}
    
    @opik.track(name="shopify_update_product")
    def update_product(self, product_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        商品を更新
        
        Args:
            product_id: 商品ID
            updates: 更新するフィールド
            
        Returns:
            更新された商品データ
        """
        if not self.access_token:
            return {"error": "SHOPIFY_ACCESS_TOKEN not configured"}
        
        print(f"[Shopify] Updating product: {product_id}")
        
        payload = {"product": updates}
        
        try:
            response = requests.put(
                self._get_api_url(f"products/{product_id}"),
                headers=self._get_headers(),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            print(f"[Shopify] Product updated successfully")
            
            return result
            
        except Exception as e:
            print(f"[Shopify] Failed to update product: {e}")
            return {"error": str(e)}
    
    @opik.track(name="shopify_get_products")
    def get_products(self, limit: int = 50, since_id: int = None) -> List[Dict[str, Any]]:
        """
        商品一覧を取得
        
        Args:
            limit: 取得数（最大250）
            since_id: このID以降の商品を取得
            
        Returns:
            商品リスト
        """
        if not self.access_token:
            return [{"error": "SHOPIFY_ACCESS_TOKEN not configured"}]
        
        print(f"[Shopify] Getting products (limit: {limit})")
        
        params = {"limit": limit}
        if since_id:
            params["since_id"] = since_id
        
        try:
            response = requests.get(
                self._get_api_url("products"),
                headers=self._get_headers(),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            products = result.get("products", [])
            print(f"[Shopify] Retrieved {len(products)} products")
            
            return products
            
        except Exception as e:
            print(f"[Shopify] Failed to get products: {e}")
            return [{"error": str(e)}]
    
    @opik.track(name="shopify_update_inventory")
    def update_inventory(self, inventory_item_id: int, location_id: int, available: int) -> Dict[str, Any]:
        """
        在庫を更新
        
        Args:
            inventory_item_id: 在庫アイテムID
            location_id: ロケーションID
            available: 在庫数
            
        Returns:
            更新された在庫データ
        """
        if not self.access_token:
            return {"error": "SHOPIFY_ACCESS_TOKEN not configured"}
        
        print(f"[Shopify] Updating inventory: item {inventory_item_id}, available {available}")
        
        payload = {
            "location_id": location_id,
            "inventory_item_id": inventory_item_id,
            "available": available
        }
        
        try:
            response = requests.post(
                self._get_api_url("inventory_levels/set"),
                headers=self._get_headers(),
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            print(f"[Shopify] Inventory updated successfully")
            
            return result
            
        except Exception as e:
            print(f"[Shopify] Failed to update inventory: {e}")
            return {"error": str(e)}
    
    @opik.track(name="shopify_get_orders")
    def get_orders(self, status: str = "any", limit: int = 50, financial_status: str = None) -> List[Dict[str, Any]]:
        """
        注文一覧を取得
        
        Args:
            status: 注文ステータス (open, closed, cancelled, any)
            limit: 取得数（最大250）
            financial_status: 支払いステータス (authorized, pending, paid, etc.)
            
        Returns:
            注文リスト
        """
        if not self.access_token:
            return [{"error": "SHOPIFY_ACCESS_TOKEN not configured"}]
        
        print(f"[Shopify] Getting orders (status: {status}, limit: {limit})")
        
        params = {"status": status, "limit": limit}
        if financial_status:
            params["financial_status"] = financial_status
        
        try:
            response = requests.get(
                self._get_api_url("orders"),
                headers=self._get_headers(),
                params=params,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            orders = result.get("orders", [])
            print(f"[Shopify] Retrieved {len(orders)} orders")
            
            return orders
            
        except Exception as e:
            print(f"[Shopify] Failed to get orders: {e}")
            return [{"error": str(e)}]
    
    @opik.track(name="shopify_create_customer")
    def create_customer(self, email: str, first_name: str = "", last_name: str = "", 
                       phone: str = None, tags: List[str] = None) -> Dict[str, Any]:
        """
        顧客を作成
        
        Args:
            email: メールアドレス
            first_name: 名
            last_name: 姓
            phone: 電話番号
            tags: タグリスト
            
        Returns:
            作成された顧客データ
        """
        if not self.access_token:
            return {"error": "SHOPIFY_ACCESS_TOKEN not configured"}
        
        print(f"[Shopify] Creating customer: {email}")
        
        customer_data = {
            "customer": {
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "tags": ", ".join(tags) if tags else ""
            }
        }
        
        try:
            response = requests.post(
                self._get_api_url("customers"),
                headers=self._get_headers(),
                json=customer_data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            customer = result.get("customer", {})
            print(f"[Shopify] Customer created: ID {customer.get('id')}")
            
            return result
            
        except Exception as e:
            print(f"[Shopify] Failed to create customer: {e}")
            return {"error": str(e)}

# Singleton instance
shopify_integration = ShopifyIntegration()
