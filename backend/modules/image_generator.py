import requests
import os
import time
import logging
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageGenerator:
    def __init__(self):
        self.output_dir = "generated_images"
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def generate(self, prompt, filename=None):
        """
        Generate image using Pollinations.ai (Free Cloud API).
        No GPU required locally.
        """
        # Clean prompt for URL
        encoded_prompt = requests.utils.quote(prompt)
        seed = random.randint(1, 999999)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?seed={seed}&width=1024&height=1024&nologo=true"

        try:
            logger.info(f"🎨 Generating Image (Cloud): '{prompt[:30]}...'")
            response = requests.get(url, timeout=60)
            
            if response.status_code == 200:
                if not filename:
                    filename = f"img_{int(time.time())}.jpg"
                
                filepath = os.path.join(self.output_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(response.content)
                
                logger.info(f"✅ Image Saved: {filepath}")
                return filepath
            else:
                logger.error(f"❌ Cloud API Error: {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"❌ Image Generation Failed: {e}")
            return None

if __name__ == "__main__":
    gen = ImageGenerator()
    gen.generate("A futuristic AI robot painting a canvas, cyberpunk style")
