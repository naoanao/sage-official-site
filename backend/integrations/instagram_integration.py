import requests
import os
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

    # 待ち方の既定値。画像1枚なら数秒で FINISHED になるが、混んでいると伸びる。
    # ⚠️ 無制限に待たない——GitHub Actions の実行そのものが打ち切られる。
    READY_TIMEOUT_SEC = 90
    READY_INTERVAL_SEC = 3

    def _wait_until_ready(self, container_id, timeout=None, interval=None):
        """コンテナが FINISHED になるまで待つ。戻り値は {"ok": bool, "error": str|None}。

        Instagram の status_code は IN_PROGRESS / FINISHED / ERROR / EXPIRED / PUBLISHED。
        🔴 ERROR と EXPIRED は待っても回復しないので**即座に諦める**
           （待ち続けると実行時間を食い潰すだけ・罠 404は待っても回復しない と同じ向き）。
        """
        import time as _time

        timeout = self.READY_TIMEOUT_SEC if timeout is None else timeout
        interval = self.READY_INTERVAL_SEC if interval is None else interval
        deadline = _time.monotonic() + timeout
        last = None
        while True:
            try:
                r = requests.get(
                    f"{self.base_url}/{container_id}",
                    params={"fields": "status_code,status", "access_token": self.access_token},
                    timeout=20,
                )
                d = r.json()
            except Exception as e:
                return {"ok": False, "error": f"status check failed: {e}"}
            last = d.get("status_code") or d.get("status")
            if last == "FINISHED":
                logger.info(f"✅ Container ready: {container_id}")
                return {"ok": True, "error": None}
            if last in ("ERROR", "EXPIRED"):
                return {"ok": False, "error": f"container {last}: {d}"}
            if _time.monotonic() + interval > deadline:
                return {"ok": False, "error": f"timed out after {timeout}s (last status: {last})"}
            _time.sleep(interval)

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

            # Step 1.5: コンテナの処理が終わるまで待つ
            # 🔴 2026-09-02: ここが無かった。作った直後に media_publish を叩いていたため、
            #    Instagram が毎回 code 9007 / subcode 2207027
            #    「Media ID is not available / このメディアは公開する準備ができていません」
            #    を返し、**Bluesky だけ投稿されて Instagram は毎回落ちていた**。
            #    Content Publishing API は status_code が FINISHED になってからでないと
            #    公開できない。待たないのは仕様違反であって、一時的な不調ではない。
            ready = self._wait_until_ready(container_id)
            if not ready.get("ok"):
                logger.error(f"❌ Container not ready: {ready.get('error')}")
                return {"success": False, "error": ready.get("error")}

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

if __name__ == "__main__":
    bot = InstagramBot()
    # Mock test
    if not bot.access_token:
        print("⚠️ No API Token. Running Mock Mode.")
        print("📸 [MOCK] Uploading image to Instagram...")
        print("✅ [MOCK] Published successfully.")
