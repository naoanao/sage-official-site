import os
import base64
import logging
import requests

logger = logging.getLogger(__name__)

IMGUR_CLIENT_ID = "546c25a424d6a62"
GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation"
# Hugging Face Flux — free inference, no quota issues (rate-limited but no billing)
HF_FLUX_MODEL = "black-forest-labs/FLUX.1-schnell"
HF_INFERENCE_URL = f"https://api-inference.huggingface.co/models/{HF_FLUX_MODEL}"

PLATFORM_SIZES = {
    "instagram": (1080, 1080),
    "twitter":   (1200, 675),
    "facebook":  (1200, 630),
    "linkedin":  (1200, 627),
}


class ImageGenerationEnhanced:
    """
    Sage Image Generation.
    Pipeline: HuggingFace Flux → Imgur  |  Gemini → Imgur  |  LoremFlickr fallback.

    Tier 1: HuggingFace Inference API (FLUX.1-schnell)
      - Free, no billing quota, token optional (anonymous works with rate limit)
      - Returns raw PNG bytes → upload to Imgur → public URL
    Tier 2: Gemini REST API (gemini-2.0-flash-exp-image-generation)
      - Falls back when HF is slow/rate-limited
    Tier 3: LoremFlickr (stock photo URL, always works, no upload needed)
    """

    def __init__(self):
        self.name = "Sage Image Gen Enhanced"
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")

    # ------------------------------------------------------------------
    # Tier 1: HuggingFace Flux
    # ------------------------------------------------------------------

    def _hf_flux_generate_bytes(self, prompt: str) -> bytes | None:
        """Call HuggingFace Inference API (FLUX.1-schnell). Returns PNG bytes or None."""
        headers = {"Content-Type": "application/json"}
        if self.hf_token:
            headers["Authorization"] = f"Bearer {self.hf_token}"
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
            # Model loading — retry not worth it in scheduler context
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
    # Tier 3: LoremFlickr fallback
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
        1. HuggingFace Flux (free, no quota) → Imgur
        2. Gemini → Imgur
        3. LoremFlickr fallback
        """
        width, height = PLATFORM_SIZES.get(platform.lower(), (1080, 1080))
        prompt = (
            f"{text}, {platform} style, high quality, vibrant colors, "
            f"professional social media aesthetic, {width}x{height}"
        )

        logger.info(f"Generating image for: {text[:60]}...")

        # Tier 1: HuggingFace Flux
        img_bytes = self._hf_flux_generate_bytes(prompt)
        if img_bytes:
            public_url = self._upload_to_imgur(img_bytes)
            if public_url:
                logger.info(f"Image ready (HF Flux+Imgur): {public_url}")
                return public_url

        # Tier 2: Gemini
        img_bytes = self._gemini_generate_bytes(prompt)
        if img_bytes:
            public_url = self._upload_to_imgur(img_bytes)
            if public_url:
                logger.info(f"Image ready (Gemini+Imgur): {public_url}")
                return public_url
            logger.warning("Imgur upload failed; falling back to LoremFlickr.")

        # Tier 3: LoremFlickr fallback
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
