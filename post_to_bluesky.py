import sys
import os
import logging
from dotenv import load_dotenv

# Ensure the root directory is in the path for module imports
sys.path.append(os.path.abspath("."))

# Load API keys
load_dotenv()

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("BlueskyPostScript")

def post_announcement():
    try:
        from backend.modules.social_media_manager import SocialMediaManager
        
        manager = SocialMediaManager()
        
        text = (
            "Just published: How I automated my content pipeline "
            "using Sage AI and Groq. \n"
            "Read the full breakdown → https://sage-now-pro.pages.dev/blog\n\n"
            "#BuildInPublic #AIAgent #SoloFounder"
        )
        
        logger.info(f"🚀 Preparing to post to Bluesky:\n{text}")
        
        # Execute post
        results = manager.post_content(text=text, platforms=['bluesky'])
        
        print("\n--- 🏁 POST EXECUTION RESULT ---")
        if results.get('bluesky', {}).get('status') == 'success':
            print("✅ SUCCESS: Announcement posted to Bluesky!")
            print(f"Data: {results['bluesky']['data']}")
        else:
            print("❌ FAILED: Could not post to Bluesky.")
            print(f"Error: {results.get('bluesky', {}).get('message')}")
            
    except Exception as e:
        logger.error(f"Critical script error: {e}")
        print(f"Error Details: {str(e)}")

if __name__ == "__main__":
    post_announcement()
