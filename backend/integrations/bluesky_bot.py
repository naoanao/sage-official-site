import os
import logging
from atproto import Client

# Configure logging
logger = logging.getLogger("BlueskyBot")

class BlueskyBot:
    def __init__(self):
        self.username = os.getenv("BLUESKY_USERNAME")
        self.password = os.getenv("BLUESKY_PASSWORD")
        self.client = None
        self.mock_mode = False

        if not self.username or not self.password:
            logger.warning("⚠️ Bluesky credentials not found. Running in MOCK MODE.")
            self.mock_mode = True
        else:
            try:
                self.client = Client()
                self.client.login(self.username, self.password)
                logger.info("✅ Bluesky API Connected.")
            except Exception as e:
                logger.error(f"❌ Bluesky Login Failed: {e}")
                self.mock_mode = True

    def post_text(self, text):
        """Sends a text post to Bluesky."""
        if self.mock_mode:
            logger.info(f"🦋 [MOCK] Bluesky Post: {text[:50]}...")
            return True

        try:
            self.client.send_post(text=text)
            logger.info("✅ Bluesky Post Sent.")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send Bluesky post: {e}")
            return False

    def post_image(self, image_path, text):
        """Sends a post with an image to Bluesky."""
        if self.mock_mode:
            logger.info(f"🦋 [MOCK] Bluesky Image Post: {text[:30]}... | Img: {image_path}")
            return True

        try:
            with open(image_path, 'rb') as f:
                img_data = f.read()
                
            self.client.send_image(text=text, image=img_data, image_alt=text[:100])
            logger.info("✅ Bluesky Image Post Sent.")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send Bluesky image post: {e}")
            return False

if __name__ == "__main__":
    # Test
    bot = BlueskyBot()
    bot.post_text("🤖 Sage 2.0 Bluesky Integration Test")
