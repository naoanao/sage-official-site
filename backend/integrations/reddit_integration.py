import praw
import os
import logging
import random
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RedditIntegration:
    """
    Reddit Integration Agent using PRAW.
    Supports posting to subreddits and commenting.
    Includes Mock Mode for testing without API keys.
    """
    def __init__(self):
        self.client_id = os.environ.get('REDDIT_CLIENT_ID')
        self.client_secret = os.environ.get('REDDIT_CLIENT_SECRET')
        self.user_agent = os.environ.get('REDDIT_USER_AGENT', 'SageAI/1.0')
        self.username = os.environ.get('REDDIT_USERNAME')
        self.password = os.environ.get('REDDIT_PASSWORD')
        
        self.reddit = None
        self.mock_mode = False

        if self.client_id and self.client_secret:
            try:
                self.reddit = praw.Reddit(
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    user_agent=self.user_agent,
                    username=self.username,
                    password=self.password
                )
                logger.info("✅ Reddit API Initialized")
            except Exception as e:
                logger.error(f"⚠️ Reddit API Initialization Failed: {e}")
                self.mock_mode = True
        else:
            logger.warning("⚠️ REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not found. Running in MOCK MODE.")
            self.mock_mode = True

    def post_text(self, subreddit_name, title, selftext):
        """
        Post a text submission to a subreddit.
        """
        if self.mock_mode:
            return self._mock_post(subreddit_name, title, selftext)

        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            submission = subreddit.submit(title=title, selftext=selftext)
            logger.info(f"✅ Posted to r/{subreddit_name}: {submission.url}")
            return {
                "status": "success",
                "url": submission.url,
                "id": submission.id,
                "platform": "reddit"
            }
        except Exception as e:
            logger.error(f"❌ Reddit Post Failed: {e}")
            return {"status": "error", "message": str(e)}

    def post_link(self, subreddit_name, title, url):
        """
        Post a link submission to a subreddit.
        """
        if self.mock_mode:
            return self._mock_post(subreddit_name, title, url, is_link=True)

        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            submission = subreddit.submit(title=title, url=url)
            logger.info(f"✅ Posted Link to r/{subreddit_name}: {submission.url}")
            return {
                "status": "success",
                "url": submission.url,
                "id": submission.id,
                "platform": "reddit"
            }
        except Exception as e:
            logger.error(f"❌ Reddit Link Post Failed: {e}")
            return {"status": "error", "message": str(e)}

    def _mock_post(self, subreddit, title, content, is_link=False):
        """Simulate a successful post."""
        time.sleep(1.5) # Simulate network latency
        mock_id = f"t3_{random.randint(10000, 99999)}"
        mock_url = f"https://www.reddit.com/r/{subreddit}/comments/{mock_id}/{title.replace(' ', '_').lower()}/"
        
        logger.info(f"🤖 [MOCK] Posted to r/{subreddit}")
        logger.info(f"    Title: {title}")
        logger.info(f"    Content: {content[:50]}...")
        
        return {
            "status": "success",
            "url": mock_url,
            "id": mock_id,
            "platform": "reddit",
            "mode": "mock"
        }

if __name__ == "__main__":
    # Self-test
    agent = RedditIntegration()
    res = agent.post_text("test", "Hello from Sage AI", "This is a test post from the Sage AI agent.")
    print(res)
