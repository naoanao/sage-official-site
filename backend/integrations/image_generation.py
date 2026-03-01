import os
import base64
import logging
import requests

logger = logging.getLogger(__name__)

GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation"
# Hugging Face Flux — requires HF_TOKEN (router.huggingface.co requires auth as of 2026-03)
HF_FLUX_MODEL = "black-forest-labs/FLUX.1-schnell"
HF_INFERENCE_URL = f"https://router.huggingface.co/hf-inference/models/{HF_FLUX_MODEL}"
IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload"

PLATFORM_SIZES = {
    "instagram": (1080, 1080),
    "twitter":   (1200, 675),
    "facebook":  (1200, 630),
    "linkedin":  (1200, 627),
}


class ImageGenerationEnhanced:
    """
    Sage Image Generation.
    Pipeline: HuggingFace Flux → imgbb  |  Gemini → imgbb

    Tier 1: HuggingFace Inference API (FLUX.1-schnell)
      - Requires HF_TOKEN (router.huggingface.co requires auth as of 2026-03)
      - Returns raw PNG bytes → upload to imgbb → permanent public URL
    Tier 2: Gemini REST API (gemini-2.0-flash-exp-image-generation)
      - Falls back when HF is slow/rate-limited
    """

    def __init__(self):
        self.name = "Sage Image Gen Enhanced"
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
        self.imgbb_api_key = os.getenv("IMGBB_API_KEY")

    # ------------------------------------------------------------------
    # Tier 1: HuggingFace Flux
    # ------------------------------------------------------------------

    def _hf_flux_generate_bytes(self, prompt: str) -> bytes | None:
        """Call HuggingFace Router API (FLUX.1-schnell). Requires HF_TOKEN. Returns PNG bytes or None."""
        if not self.hf_token:
            logger.info("HF Flux skipped: HF_TOKEN not set (required since 2026-03)")
            return None
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {self.hf_token}"}
        try:
            resp = requests.post(
                HF_INFERENCE_URL,
                headers=headers,
                json={"inputs": prompt, "parameters": {"num_inference_steps": 4}},
                timeout=45,
            )
            if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("image"):
                logger.info(f"HF Flux OK ({len(resp.content)} bytes)")
                return resp.content
            body = resp.json() if resp.content else {}
            logger.warning(f"HF Flux returned {resp.status_code}: {str(body)[:120]}")
        except Exception as e:
            logger.warning(f"HF Flux generation failed: {e}")
        return None

    # ------------------------------------------------------------------
    # Tier 2: Gemini image generation (REST)
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
    # imgbb upload (replaces Imgur — permanent public URLs)
    # ------------------------------------------------------------------

    def _upload_to_imgbb(self, image_bytes: bytes) -> str | None:
        """Upload image bytes to imgbb. Returns permanent public URL or None."""
        if not self.imgbb_api_key:
            logger.warning("imgbb upload skipped: IMGBB_API_KEY not set")
            return None
        try:
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            resp = requests.post(
                IMGBB_UPLOAD_URL,
                data={"key": self.imgbb_api_key, "image": b64},
                timeout=30,
            )
            data = resp.json()
            if data.get("success"):
                url = data["data"]["url"]
                logger.info(f"imgbb upload OK: {url}")
                return url
            logger.warning(f"imgbb upload failed: {data.get('error', {})}")
        except Exception as e:
            logger.warning(f"imgbb upload error: {e}")
        return None

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def generate_social_media_image(self, text: str, platform: str = "instagram") -> str | None:
        """
        Generate a social media image and return a permanent public URL.
        1. HuggingFace Flux (HF_TOKEN required) → imgbb
        2. Gemini → imgbb
        Returns None if both tiers fail.
        """
        width, height = PLATFORM_SIZES.get(platform.lower(), (1080, 1080))
        prompt = (
            f"{text}, {platform} style, high quality, vibrant colors, "
            f"professional social media aesthetic, {width}x{height}"
        )

        logger.info(f"Generating image for: {text[:60]}...")

        # Tier 1: HuggingFace Flux (requires HF_TOKEN)
        img_bytes = self._hf_flux_generate_bytes(prompt)
        if img_bytes:
            public_url = self._upload_to_imgbb(img_bytes)
            if public_url:
                logger.info(f"Image ready (HF Flux+imgbb): {public_url}")
                return public_url

        # Tier 2: Gemini
        img_bytes = self._gemini_generate_bytes(prompt)
        if img_bytes:
            public_url = self._upload_to_imgbb(img_bytes)
            if public_url:
                logger.info(f"Image ready (Gemini+imgbb): {public_url}")
                return public_url
            logger.warning("imgbb upload failed after Gemini generation.")

        logger.warning(f"All image generation tiers failed for: {text[:60]}")
        return None

    def generate_blog_image(self, topic: str, style: str = "realistic") -> str | None:
        prompt = f"{topic}, high quality, professional, {style}, 8k resolution, detailed"
        return self.generate_social_media_image(prompt, platform="twitter")

    def generate_thumbnail(self, video_topic: str) -> str | None:
        prompt = f"YouTube thumbnail for {video_topic}, catchy, high contrast, 4k, vibrant colors"
        return self.generate_social_media_image(prompt, platform="twitter")


# Singleton
image_gen_enhanced = ImageGenerationEnhanced()
