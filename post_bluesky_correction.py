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
logger = logging.getLogger("BlueskyCorrectionScript")

def post_correction():
    try:
        from backend.modules.social_media_manager import SocialMediaManager
        
        manager = SocialMediaManager()
        
        text = "Update: live blog is here → https://sage-official-site.pages.dev/blog (earlier link was wrong)"
        
        logger.info(f"🚀 Preparing to post correction to Bluesky:\n{text}")
        
        # Execute post
        results = manager.post_content(text=text, platforms=['bluesky'])
        
        print("\n--- 🏁 CORRECTION EXECUTION RESULT ---")
        if results.get('bluesky', {}).get('status') == 'success':
            print("✅ SUCCESS: Correction posted to Bluesky!")
        else:
            print("❌ FAILED: Could not post to Bluesky.")
            print(f"Error: {results.get('bluesky', {}).get('message')}")
            
    except Exception as e:
        logger.error(f"Critical script error: {e}")

if __name__ == "__main__":
    post_correction()
