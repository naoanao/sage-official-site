import os
import logging
from atproto import Client, models

# Configure logging
logger = logging.getLogger("BlueskyAgent")

class BlueskyAgent:
    def __init__(self):
        # Support both naming conventions (User might rely on either)
        self.username = os.getenv("BLUESKY_HANDLE") or os.getenv("BLUESKY_USERNAME")
        self.password = os.getenv("BLUESKY_PASSWORD") or os.getenv("BLUESKY_APP_PASSWORD")
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

    def post_skeet(self, text):
        """Sends a text post to Bluesky (Skeet). Returns result object or dict."""
        if self.mock_mode:
            logger.info(f"🦋 [MOCK] Bluesky Post: {text[:50]}...")
            # Mock successful response format
            return {"uri": "at://mock.uri/post/123", "cid": "mock_cid_123"}

        try:
            # send_post returns a CreateRecordResponse, which has .uri and .cid
            response = self.client.send_post(text=text)
            logger.info(f"✅ Bluesky Post Sent: {response.uri}")
            
            # Convert to dict for easier consumption if needed, or return object.
            # The test checks `if 'uri' in result`. 
            # objects in python often don't support 'in' unless __contains__ is def.
            # safe to return dict.
            return {
                "uri": response.uri,
                "cid": response.cid,
                "raw": response
            }
        except Exception as e:
            logger.error(f"❌ Failed to send Bluesky post: {e}")
            raise e # Let the caller handle or see the crash in test
