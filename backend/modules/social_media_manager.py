import logging
import time

# Import Integrations
# Attempting absolute imports based on project structure
try:
    from backend.integrations.bluesky_agent import BlueskyAgent
    from backend.integrations.twitter_integration import TwitterIntegration
    from backend.integrations.instagram_integration import InstagramBot
except ImportError:
    # Fallback for when running from backend directory directly
    from integrations.bluesky_agent import BlueskyAgent
    from integrations.twitter_integration import TwitterIntegration
    from integrations.instagram_integration import InstagramBot

logger = logging.getLogger("SocialMediaManager")

class SocialMediaManager:
    """
    Unified interface for posting content across multiple social platforms.
    Handles credential checks and Mock Mode automatically.
    """
    def __init__(self):
        logger.info("📡 Initializing Social Media Manager...")
        self.bluesky = BlueskyAgent()
        self.twitter = TwitterIntegration()
        self.instagram = InstagramBot()
        
    def post_content(self, text, image_url=None, platforms=None):
        """
        Post content to specified platforms.
        :param text: Text content (caption/tweet/skeet)
        :param image_url: Optional image URL (required for Instagram)
        :param platforms: List of strings ['bluesky', 'twitter', 'instagram']. If None, tries all.
        :return: Dict of results per platform.
        """
        if not platforms:
            platforms = ['bluesky', 'twitter'] # Default to text-based if not specified
            if image_url:
                platforms.append('instagram')

        results = {}
        logger.info(f"📢 Broadcasting to: {platforms}")

        # --- Bluesky ---
        if 'bluesky' in platforms:
            try:
                # Bluesky handles text well. Image support would need extra logic, 
                # but for MVP we send text + link to image if present.
                post_text = text
                if image_url:
                    post_text += f"\n\n(Image: {image_url})"
                    
                res = self.bluesky.post_skeet(post_text)
                results['bluesky'] = {"status": "success", "data": res}
            except Exception as e:
                logger.error(f"Bluesky Post Error: {e}")
                results['bluesky'] = {"status": "error", "message": str(e)}

        # --- Twitter/X ---
        if 'twitter' in platforms:
            try:
                # TwitterIntegration.post_tweet takes (text, image_path)
                # Currently image_path logic in TwitterIntegration is basic or mocked.
                # We'll pass text.
                res = self.twitter.post_tweet(text)
                results['twitter'] = res
            except Exception as e:
                logger.error(f"Twitter Post Error: {e}")
                results['twitter'] = {"status": "error", "message": str(e)}

        # --- Instagram ---
        if 'instagram' in platforms:
            if not image_url:
                results['instagram'] = {"status": "skipped", "message": "Image URL required for Instagram"}
            else:
                try:
                    res = self.instagram.post_image(image_url, text) # text is caption
                    results['instagram'] = res
                except Exception as e:
                    logger.error(f"Instagram Post Error: {e}")
                    results['instagram'] = {"status": "error", "message": str(e)}

        return results

if __name__ == "__main__":
    # Test Run
    logging.basicConfig(level=logging.INFO)
    manager = SocialMediaManager()
    print("--- Testing Broadcast ---")
    res = manager.post_content(
        text="Hello World from Sage Social Manager! 🌍 #AI #Automation",
        platforms=['bluesky', 'twitter']
    )
    print("Result:", res)
