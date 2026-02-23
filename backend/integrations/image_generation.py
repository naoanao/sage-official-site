import os
import base64
import logging
import requests

logger = logging.getLogger(__name__)

IMGUR_CLIENT_ID = "546c25a424d6a62"
GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation"

PLATFORM_SIZES = {
    "instagram": (1080, 1080),
    "twitter":   (1200, 675),
    "facebook":  (1200, 630),
    "linkedin":  (1200, 627),
}


class ImageGenerationEnhanced:
    """
    Sage Image Generation.
    Pipeline: Gemini REST API → Imgur upload → public URL.
    Fallback: LoremFlickr public URL (no upload needed).
    """

    def __init__(self):
        self.name = "Sage Image Gen Enhanced"
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    # ------------------------------------------------------------------
    # Gemini image generation (REST)
    # ------------------------------------------------------------------

    def _gemini_generate_bytes(self, prompt: str) -> bytes | None:
        """Call Gemini REST API. Returns raw PNG bytes or None on failure."""
        if not self.gemini_api_key:
            return None
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_IMAGE_MODEL}:generateContent?key={self.gemini_api_key}"
        )
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
        }
        try:
            resp = requests.post(url, json=body, timeout=30)
            if resp.status_code != 200:
                logger.warning(
                    f"Gemini image API returned {resp.status_code}: "
                    f"{resp.json().get('error', {}).get('message', '')[:120]}"
                )
                return None
            parts = (
                resp.json()
                .get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
            )
            for part in parts:
                inline = part.get("inlineData", {})
                if inline.get("data"):
                    return base64.b64decode(inline["data"])
        except Exception as e:
            logger.warning(f"Gemini image generation failed: {e}")
        return None

    # ------------------------------------------------------------------
    # Imgur upload
    # ------------------------------------------------------------------

    def _upload_to_imgur(self, image_bytes: bytes) -> str | None:
        """Upload image bytes to Imgur anonymously. Returns public URL or None."""
        try:
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            resp = requests.post(
                "https://api.imgur.com/3/image",
                headers={"Authorization": f"Client-ID {IMGUR_CLIENT_ID}"},
                data={"image": b64, "type": "base64"},
                timeout=30,
            )
            data = resp.json()
            if data.get("success"):
                url = data["data"]["link"]
                logger.info(f"Imgur upload OK: {url}")
                return url
            logger.warning(f"Imgur upload failed: {data.get('data', {}).get('error')}")
        except Exception as e:
            logger.warning(f"Imgur upload error: {e}")
        return None

    # ------------------------------------------------------------------
    # LoremFlickr fallback
    # ------------------------------------------------------------------

    def _loremflickr_url(self, keyword: str, width: int, height: int) -> str:
        """Return a LoremFlickr URL (always public, always works)."""
        safe_keyword = keyword.split()[0].lower() if keyword else "technology"
        return f"https://loremflickr.com/{width}/{height}/{safe_keyword}"

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def generate_social_media_image(self, text: str, platform: str = "instagram") -> str:
        """
        Generate a social media image and return a public URL.
        1. Try Gemini → Imgur
        2. Fallback to LoremFlickr
        """
        width, height = PLATFORM_SIZES.get(platform.lower(), (1080, 1080))
        prompt = (
            f"{text}, {platform} style, high quality, vibrant colors, "
            f"professional social media aesthetic, {width}x{height}"
        )

        logger.info(f"Generating image for: {text[:60]}...")

        # Step 1: Gemini
        img_bytes = self._gemini_generate_bytes(prompt)
        if img_bytes:
            public_url = self._upload_to_imgur(img_bytes)
            if public_url:
                logger.info(f"Image ready (Gemini+Imgur): {public_url}")
                return public_url
            logger.warning("Imgur upload failed; falling back to LoremFlickr.")

        # Step 2: LoremFlickr fallback
        keyword = text.split()[0] if text else "ai"
        url = self._loremflickr_url(keyword, width, height)
        logger.info(f"Image ready (LoremFlickr fallback): {url}")
        return url

    def generate_blog_image(self, topic: str, style: str = "realistic") -> str:
        prompt = f"{topic}, high quality, professional, {style}, 8k resolution, detailed"
        return self.generate_social_media_image(prompt, platform="twitter")

    def generate_thumbnail(self, video_topic: str) -> str:
        prompt = f"YouTube thumbnail for {video_topic}, catchy, high contrast, 4k, vibrant colors"
        return self.generate_social_media_image(prompt, platform="twitter")


# Singleton
image_gen_enhanced = ImageGenerationEnhanced()
