import os
import logging
import requests

# Configure logging
logger = logging.getLogger("DiscordBot")

class DiscordBot:
    def __init__(self):
        # We use Webhooks for broadcasting as it's simpler and doesn't require a full bot process running
        self.webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
        self.mock_mode = False

        if not self.webhook_url:
            logger.warning("⚠️ Discord Webhook URL not found. Running in MOCK MODE.")
            self.mock_mode = True
        else:
            logger.info("✅ Discord Webhook Configured.")

    def send_message(self, text):
        """Sends a text message to Discord via Webhook."""
        if self.mock_mode:
            logger.info(f"👾 [MOCK] Discord Message: {text[:50]}...")
            return True

        payload = {
            "content": text
        }
        
        try:
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info("✅ Discord Message Sent.")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send Discord message: {e}")
            return False

    def send_image(self, image_path, text=None):
        """Sends an image to Discord via Webhook."""
        if self.mock_mode:
            logger.info(f"👾 [MOCK] Discord Image: {text[:30]}... | Img: {image_path}")
            return True

        data = {}
        if text:
            data["content"] = text
            
        try:
            with open(image_path, "rb") as f:
                files = {"file": (os.path.basename(image_path), f)}
                response = requests.post(self.webhook_url, data=data, files=files, timeout=30)
                response.raise_for_status()
            logger.info("✅ Discord Image Sent.")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send Discord image: {e}")
            return False

if __name__ == "__main__":
    bot = DiscordBot()
    bot.send_message("🤖 Sage 2.0 Discord Integration Test")
