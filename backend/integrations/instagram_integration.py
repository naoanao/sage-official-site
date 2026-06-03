import requests
import os
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _load_token():
    """Always read the latest token from .env file (not os.environ which may be stale)."""
    try:
        from dotenv import dotenv_values
        vals = dotenv_values()
        return vals.get('INSTAGRAM_ACCESS_TOKEN') or os.getenv('INSTAGRAM_ACCESS_TOKEN')
    except Exception:
        return os.getenv('INSTAGRAM_ACCESS_TOKEN')

class InstagramBot:
    def __init__(self):
        self.access_token = _load_token()
        self.account_id = os.getenv('INSTAGRAM_ACCOUNT_ID') # Business Account ID
        self.api_version = "v21.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"

    def post_image(self, image_url, caption):
        """
        Post an image to Instagram Business Account.
        Note: Image must be on a public URL (e.g., S3, Imgur, or ngrok).
        """
        if not self.access_token or not self.account_id:
            logger.warning("⚠️ Instagram API credentials not found.")
            return {"success": False, "error": "Missing Credentials"}

        try:
            # Step 1: Create Media Container
            url = f"{self.base_url}/{self.account_id}/media"
            payload = {
                "image_url": image_url,
                "caption": caption,
                "access_token": self.access_token
            }
            response = requests.post(url, data=payload)
            result = response.json()
            
            if "id" not in result:
                logger.error(f"❌ Failed to create media container: {result}")
                return {"success": False, "error": result}
            
            container_id = result["id"]
            logger.info(f"✅ Media Container Created: {container_id}")

            # Step 2: Publish Media
            publish_url = f"{self.base_url}/{self.account_id}/media_publish"
            publish_payload = {
                "creation_id": container_id,
                "access_token": self.access_token
            }
            publish_response = requests.post(publish_url, data=publish_payload)
            publish_result = publish_response.json()

            if "id" in publish_result:
                logger.info(f"✅ Published to Instagram: {publish_result['id']}")
                return {"success": True, "id": publish_result["id"]}
            else:
                logger.error(f"❌ Failed to publish: {publish_result}")
                return {"success": False, "error": publish_result}

        except Exception as e:
            logger.error(f"❌ Instagram API Error: {e}")
            return {"success": False, "error": str(e)}

    def post_video_reel(self, video_url: str, caption: str,
                        share_to_feed: bool = True,
                        poll_timeout: int = 120) -> dict:
        """
        Post a video as Instagram Reel via Graph API.

        Args:
            video_url   : 公開アクセス可能な動画URL（Cloudflare R2等）
            caption     : キャプション（ハッシュタグ含む）
            share_to_feed: フィードにも表示するか (True推奨)
            poll_timeout: コンテナ処理の最大待機秒数（デフォルト120秒）

        Returns:
            {"success": True, "id": post_id} | {"success": False, "error": ...}
        """
        if not self.access_token or not self.account_id:
            logger.warning("⚠️ Instagram API credentials not found.")
            return {"success": False, "error": "Missing Credentials"}

        try:
            # Step 1: Reelsメディアコンテナ作成
            container_url = f"{self.base_url}/{self.account_id}/media"
            payload = {
                "media_type":    "REELS",
                "video_url":     video_url,
                "caption":       caption,
                "share_to_feed": "true" if share_to_feed else "false",
                "access_token":  self.access_token,
            }
            resp = requests.post(container_url, data=payload, timeout=30)
            result = resp.json()

            if "id" not in result:
                logger.error(f"❌ Reel container creation failed: {result}")
                return {"success": False, "error": result}

            container_id = result["id"]
            logger.info(f"✅ Reel Container Created: {container_id}")

            # Step 2: 動画処理完了を待機（FINISHED になるまでポーリング）
            status_url = f"{self.base_url}/{container_id}"
            deadline = time.time() + poll_timeout
            status_code = None

            while time.time() < deadline:
                status_resp = requests.get(
                    status_url,
                    params={"fields": "status_code", "access_token": self.access_token},
                    timeout=15,
                )
                status_data = status_resp.json()
                status_code = status_data.get("status_code", "")
                logger.info(f"⏳ Reel status: {status_code}")

                if status_code == "FINISHED":
                    break
                elif status_code == "ERROR":
                    logger.error(f"❌ Reel processing error: {status_data}")
                    return {"success": False, "error": f"Video processing failed: {status_data}"}

                time.sleep(5)
            else:
                return {"success": False, "error": f"Timeout: video processing not FINISHED within {poll_timeout}s"}

            # Step 3: 公開 (Publish)
            publish_url = f"{self.base_url}/{self.account_id}/media_publish"
            publish_resp = requests.post(
                publish_url,
                data={"creation_id": container_id, "access_token": self.access_token},
                timeout=30,
            )
            publish_result = publish_resp.json()

            if "id" in publish_result:
                logger.info(f"✅ Reel Published! Post ID: {publish_result['id']}")
                return {"success": True, "id": publish_result["id"]}
            else:
                logger.error(f"❌ Reel publish failed: {publish_result}")
                return {"success": False, "error": publish_result}

        except Exception as e:
            logger.error(f"❌ Instagram Reel API Error: {e}")
            return {"success": False, "error": str(e)}


if __name__ == "__main__":
    bot = InstagramBot()
    # Mock test
    if not bot.access_token:
        print("⚠️ No API Token. Running Mock Mode.")
        print("📸 [MOCK] Uploading image to Instagram...")
        print("✅ [MOCK] Published successfully.")
