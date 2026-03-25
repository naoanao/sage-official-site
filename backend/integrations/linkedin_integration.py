import requests
import os
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LinkedInIntegration:
    """
    LinkedIn Integration Agent.
    Supports posting updates (text/link) via API.
    Includes Mock Mode for testing without API keys.
    """
    def __init__(self):
        self.access_token = os.environ.get('LINKEDIN_ACCESS_TOKEN')
        self.person_urn = os.environ.get('LINKEDIN_PERSON_URN')  # e.g., urn:li:person:ABC123
        self.base_url = "https://api.linkedin.com/v2"
        self.mock_mode = False

        if not self.access_token or not self.person_urn:
            logger.warning("⚠️ LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN not found. Running in MOCK MODE.")
            self.mock_mode = True
        else:
            logger.info("✅ LinkedIn API Initialized")

    def post_update(self, text, link_url=None):
        """
        Post a text update (optionally with a link) to LinkedIn.
        """
        if self.mock_mode:
            return self._mock_post(text, link_url)

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
        }

        post_data = {
            "author": self.person_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": text
                    },
                    "shareMediaCategory": "ARTICLE" if link_url else "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }

        if link_url:
            post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [{
                "status": "READY",
                "originalUrl": link_url
            }]

        try:
            response = requests.post(
                f"{self.base_url}/ugcPosts",
                json=post_data,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            post_id = data.get("id")
            logger.info(f"✅ Posted to LinkedIn: {post_id}")
            
            return {
                "status": "success",
                "url": f"https://www.linkedin.com/feed/update/{post_id}",
                "id": post_id,
                "platform": "linkedin"
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ LinkedIn Post Failed: {e}")
            return {"status": "error", "message": str(e)}

    def _mock_post(self, text, link_url):
        """Simulate a successful post."""
        time.sleep(1.0)
        
        mock_id = f"urn:li:share:{int(time.time())}"
        mock_url = f"https://www.linkedin.com/feed/update/{mock_id}"
        
        logger.info(f"🤖 [MOCK] Posted to LinkedIn")
        logger.info(f"    Text: {text[:50]}...")
        if link_url:
            logger.info(f"    Link: {link_url}")
        
        return {
            "status": "success",
            "url": mock_url,
            "id": mock_id,
            "platform": "linkedin",
            "mode": "mock"
        }

if __name__ == "__main__":
    # Self-test
    agent = LinkedInIntegration()
    res = agent.post_update(
        text="Hello from Sage AI! #AI #Automation",
        link_url="https://example.com"
    )
    print(res)
