import sys
import os
from typing import Optional, Tuple

# Add backend directory to path to allow imports from pipelines
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__))))

from pipelines.nano_banana_pipeline import NanoBananaPipeline

class ImageGenerationEnhanced(NanoBananaPipeline):
    """
    Enhanced Image Generation for Sage.
    Inherits from NanoBananaPipeline (Stable Diffusion).
    """
    def __init__(self):
        super().__init__()
        self.name = "Sage Image Gen Enhanced"

    def generate_blog_image(self, topic: str, style: str = "realistic") -> str:
        """
        Generates a blog post image based on a topic.
        """
        prompt = f"{topic}, high quality, professional, {style}, 8k resolution, detailed"
        print(f"[Sage Image] Generating blog image for: {topic}")
        return self.generate_image(prompt=prompt, width=1024, height=576) # 16:9 aspect ratio

    def generate_social_media_image(self, text: str, platform: str = "instagram") -> str:
        """
        Generates an image optimized for a specific social media platform.
        """
        sizes = {
            "instagram": (1080, 1080),
            "twitter": (1200, 675),
            "facebook": (1200, 630),
            "linkedin": (1200, 627)
        }
        
        width, height = sizes.get(platform.lower(), (1024, 1024))
        
        prompt = f"{text}, social media aesthetic, engaging, high quality, {platform} style"
        print(f"[Sage Image] Generating {platform} image for: {text}")
        
        # Note: In a real implementation, we might want to overlay text using PIL here.
        # For now, we rely on SD to generate an image representing the text concept.
        return self.generate_image(prompt=prompt, width=width, height=height)

    def generate_thumbnail(self, video_topic: str) -> str:
        """
        Generates a video thumbnail.
        """
        prompt = f"YouTube thumbnail for {video_topic}, catchy, high contrast, 4k, detailed face, vibrant colors"
        print(f"[Sage Image] Generating thumbnail for: {video_topic}")
        return self.generate_image(prompt=prompt, width=1280, height=720)

# Singleton
image_gen_enhanced = ImageGenerationEnhanced()
