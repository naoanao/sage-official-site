import os
import tweepy
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TwitterIntegration:
    def __init__(self):
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
        self.mock_mode = False

        if not all([self.api_key, self.api_secret, self.access_token, self.access_token_secret]):
            logger.warning("⚠️ Twitter API Keys missing. Running in MOCK MODE.")
            self.mock_mode = True
        else:
            try:
                self.client = tweepy.Client(
                    consumer_key=self.api_key,
                    consumer_secret=self.api_secret,
                    access_token=self.access_token,
                    access_token_secret=self.access_token_secret
                )
                logger.info("✅ Twitter API Initialized")
            except Exception as e:
                logger.error(f"❌ Twitter Init Failed: {e}")
                self.mock_mode = True

    def post_tweet(self, text, image_path=None):
        """Post a tweet (text + optional image)."""
        if self.mock_mode:
            return self._mock_post(text, image_path)

        try:
            # Note: Image upload requires V1.1 API, Text requires V2.
            # For simplicity in this snippet, we focus on text or mock.
            # Real implementation would need V1.1 auth for media upload.
            response = self.client.create_tweet(text=text)
            tweet_id = response.data['id']
            logger.info(f"✅ Posted to Twitter: {tweet_id}")
            return {
                "status": "success",
                "url": f"https://twitter.com/user/status/{tweet_id}",
                "id": tweet_id,
                "platform": "twitter"
            }
        except Exception as e:
            logger.error(f"❌ Twitter Post Failed: {e}")
            return {"status": "error", "message": str(e)}

    def _mock_post(self, text, image_path):
        time.sleep(1)
        mock_id = int(time.time())
        logger.info(f"🐦 [MOCK] Tweeted: {text[:50]}...")
        return {
            "status": "success",
            "url": f"https://twitter.com/sage_ai/status/{mock_id}",
            "id": mock_id,
            "platform": "twitter",
            "mode": "mock"
        }

# Singleton
twitter_client = TwitterIntegration()
