import requests
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InstagramBot:
    def __init__(self):
        self.access_token = os.getenv('INSTAGRAM_ACCESS_TOKEN')
        self.account_id = os.getenv('INSTAGRAM_ACCOUNT_ID') # Business Account ID
        self.api_version = "v18.0"
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

if __name__ == "__main__":
    bot = InstagramBot()
    # Mock test
    if not bot.access_token:
        print("⚠️ No API Token. Running Mock Mode.")
        print("📸 [MOCK] Uploading image to Instagram...")
        print("✅ [MOCK] Published successfully.")
