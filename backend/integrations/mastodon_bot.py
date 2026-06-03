import os
import logging
import requests

# Configure logging
logger = logging.getLogger("MastodonBot")

class MastodonBot:
    def __init__(self):
        self.access_token = os.getenv("MASTODON_ACCESS_TOKEN")
        self.instance_url = os.getenv("MASTODON_INSTANCE_URL") # e.g., https://mastodon.social
        self.mock_mode = False

        if not self.access_token or not self.instance_url:
            logger.warning("⚠️ Mastodon credentials not found. Running in MOCK MODE.")
            self.mock_mode = True
        else:
            logger.info(f"✅ Mastodon API Configured for {self.instance_url}")

    def post_status(self, text, image_path=None):
        """Sends a status (toot) to Mastodon."""
        if self.mock_mode:
            log_msg = f"🐘 [MOCK] Mastodon Toot: {text[:50]}..."
            if image_path:
                log_msg += f" | Img: {image_path}"
            logger.info(log_msg)
            return True

        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        media_ids = []
        
        # Upload Image if exists
        if image_path:
            try:
                media_url = f"{self.instance_url}/api/v2/media"
                with open(image_path, 'rb') as f:
                    files = {'file': f}
                    response = requests.post(media_url, headers=headers, files=files, timeout=30)
                    response.raise_for_status()
                    media_ids.append(response.json()['id'])
            except Exception as e:
                logger.error(f"❌ Failed to upload Mastodon media: {e}")
                # Continue to post text even if image fails? Yes.

        # Post Status
        url = f"{self.instance_url}/api/v1/statuses"
        payload = {
            "status": text,
            "media_ids": media_ids
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()
            logger.info("✅ Mastodon Status Posted.")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to post to Mastodon: {e}")
            return False

if __name__ == "__main__":
    bot = MastodonBot()
    bot.post_status("🤖 Sage 2.0 Mastodon Integration Test")
