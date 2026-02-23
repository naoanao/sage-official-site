import os
import requests
import logging

# Configure logging
logger = logging.getLogger("TelegramBot")

class TelegramBot:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        
        if not self.bot_token or not self.chat_id:
            logger.warning("⚠️ Telegram credentials not found. Running in MOCK MODE.")
            self.mock_mode = True
        else:
            logger.info("✅ Telegram API Connected.")
            self.mock_mode = False

    def send_message(self, text):
        """Sends a text message to the configured chat."""
        if self.mock_mode:
            logger.info(f"✈️ [MOCK] Telegram Message: {text[:50]}...")
            return True

        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown"
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info("✅ Telegram Message Sent.")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send Telegram message: {e}")
            return False

    def send_photo(self, photo_path, caption=None):
        """Sends a photo to the configured chat."""
        if self.mock_mode:
            logger.info(f"📸 [MOCK] Telegram Photo: {photo_path} | Caption: {caption[:30]}...")
            return True

        url = f"{self.base_url}/sendPhoto"
        data = {"chat_id": self.chat_id}
        if caption:
            data["caption"] = caption
            data["parse_mode"] = "Markdown"
            
        try:
            with open(photo_path, "rb") as photo:
                files = {"photo": photo}
                response = requests.post(url, data=data, files=files, timeout=30)
                response.raise_for_status()
            logger.info("✅ Telegram Photo Sent.")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send Telegram photo: {e}")
            return False

if __name__ == "__main__":
    # Test
    bot = TelegramBot()
    bot.send_message("🤖 Sage 2.0 Telegram Integration Test")
