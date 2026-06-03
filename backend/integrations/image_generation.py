import os
import base64
import logging
import random
import requests

logger = logging.getLogger(__name__)

GEMINI_IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation"
# Hugging Face SDXL — router API (api-inference.huggingface.co is deprecated as of 2026)
HF_SDXL_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
HF_INFERENCE_URL = f"https://router.huggingface.co/hf-inference/models/{HF_SDXL_MODEL}"
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
    Pipeline: HuggingFace SDXL → imgbb  |  Gemini → imgbb  |  LoremFlickr

    Tier 1: HuggingFace Inference API (stable-diffusion-xl-base-1.0)
      - Requires HF_TOKEN (free tier, api-inference.huggingface.co)
      - Returns raw PNG bytes → upload to imgbb → permanent public URL
    Tier 2: Gemini REST API (gemini-2.0-flash-exp-image-generation)
      - Falls back when HF is rate-limited / model loading
    Tier 3: LoremFlickr keyword URL (always succeeds, no API key)
    """

    def __init__(self):
        self.name = "Sage Image Gen Enhanced"

    @property
    def gemini_api_key(self):
        return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    @property
    def hf_token(self):
        return os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")

    @property
    def imgbb_api_key(self):
        return os.getenv("IMGBB_API_KEY")

    # ------------------------------------------------------------------
    # Tier 1: HuggingFace Flux
    # ------------------------------------------------------------------

    def _hf_sdxl_generate_bytes(self, prompt: str, width: int = 768, height: int = 512) -> bytes | None:
        """Call HuggingFace Inference API (SDXL). Requires HF_TOKEN. Returns PNG bytes or None."""
        if not self.hf_token:
            logger.info("HF SDXL skipped: HF_TOKEN not set")
            return None
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        try:
            resp = requests.post(
                HF_INFERENCE_URL,
                headers=headers,
                json={"inputs": prompt, "parameters": {"width": width, "height": height}},
                timeout=120,
            )
            if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("image"):
                logger.info(f"HF SDXL OK ({len(resp.content)} bytes)")
                return resp.content
            if resp.status_code == 503:
                # Model loading — transient, skip gracefully
                logger.warning("HF SDXL model loading (503), skipping")
                return None
            try:
                body = resp.json()
            except Exception:
                body = {}
            logger.warning(f"HF SDXL returned {resp.status_code}: {str(body)[:120]}")
        except Exception as e:
            logger.warning(f"HF SDXL generation failed: {e}")
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

    def _pollinations_url(self, prompt: str, width: int = 1200, height: int = 675) -> str:
        """Tier 3 fallback: Pollinations.ai — free AI image generation, no API key required.
        Returns a direct URL that generates an AI image from the prompt.
        Much more content-relevant than LoremFlickr stock photos.
        """
        encoded = requests.utils.quote(prompt)
        seed = random.randint(1, 999999)
        url = (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?seed={seed}&width={width}&height={height}&nologo=true"
        )
        logger.info(f"Image ready (Pollinations.ai): seed={seed}, prompt={prompt[:60]}...")
        return url

    def _loremflickr_url(self, text: str, width: int = 1200, height: int = 675, topic_keywords: str = None, section_index: int = 0) -> str:
        """Tier 3 fallback: LoremFlickr keyword URL (no API key required, always works).

        topic_keywords: pre-computed English keywords to use instead of parsing text.
                        Pass this to avoid style-descriptor pollution in keyword extraction.
        section_index: used to vary the seed so each section gets a different image.
        """
        import hashlib
        topic_hash = int(hashlib.md5(text.encode()).hexdigest(), 16) % 10000
        # 137 is prime — ensures each section index produces a well-distributed unique seed
        seed = (topic_hash + section_index * 137) % 10000

        if topic_keywords:
            # Use pre-computed keywords directly (most reliable path)
            kw = ','.join(topic_keywords.split()[:3])
            url = f"https://loremflickr.com/{width}/{height}/{kw}?lock={seed}"
            logger.info(f"Image ready (LoremFlickr/topic): {url} (keywords: {kw})")
            return url

        import re
        # Skip generic/technical prompt terms, extract topic keywords
        noise_words = {
            # Articles / prepositions
            'a', 'an', 'the', 'and', 'or', 'for', 'in', 'on', 'at', 'of', 'to', 'with', 'its', 'are', 'this', 'that',
            # Generic image style descriptors (not topic-relevant)
            'high', 'quality', 'style', 'professional', 'scene', 'related', 'photorealistic',
            'dramatic', 'lighting', 'image', 'photo', 'picture', 'add', 'please', 'make',
            'generate', 'create', 'aesthetic', 'vibrant', 'colors', 'color',
            'cinematic', 'documentary', 'photography', 'editorial', 'realistic',
            'moody', 'dark', 'clean', 'minimal', 'modern', 'background', 'natural',
            'bright', 'soft', 'flat', 'lay', 'composition', 'white', 'light',
            'commercial', 'authentic', 'real', 'world', 'setting', 'ratio',
            'aspect', 'resolution', 'format', 'shot', 'view', 'angle', 'wide',
            'social', 'media', 'course', 'slide', 'title', 'text', 'design',
            'educational', 'minimal', 'twitter', 'instagram', 'platform',
            'subject', 'business', 'success', 'lifestyle',
            # Size strings
            '16:9', 'x675', 'x1080', 'x1200', '1200', '675', '1080',
        }
        words = re.sub(r'[^\w\s]', ' ', text.lower()).split()
        # Only include ASCII keywords (Japanese chars don't work in LoremFlickr URLs)
        keywords = [w for w in words if len(w) >= 3 and w not in noise_words and w.isascii()][:3]
        kw = ','.join(keywords) if keywords else 'nature'
        url = f"https://loremflickr.com/{width}/{height}/{kw}?lock={seed}"
        logger.info(f"Image ready (LoremFlickr): {url} (keywords: {kw}, seed: {seed})")
        return url

    def generate_social_media_image(self, text: str, platform: str = "instagram", topic_keywords: str = None, section_index: int = 0) -> str | None:
        """
        Generate a social media image and return a permanent public URL.
        1. HuggingFace SDXL (HF_TOKEN required) → imgbb
        2. Gemini → imgbb
        3. LoremFlickr (no API key, always works, Instagram-compatible)

        section_index: pass the 0-based position of the section so each section
                       gets a unique seed (avoids identical fallback images).
        """
        width, height = PLATFORM_SIZES.get(platform.lower(), (1080, 1080))
        prompt = (
            f"{text}, {platform} style, high quality, vibrant colors, "
            f"professional social media aesthetic, {width}x{height}"
        )

        logger.info(f"Generating image for: {text[:60]}...")

        # Tier 1: HuggingFace SDXL (requires HF_TOKEN, free tier)
        img_bytes = self._hf_sdxl_generate_bytes(prompt, width=width, height=height)
        if img_bytes:
            public_url = self._upload_to_imgbb(img_bytes)
            if public_url:
                logger.info(f"Image ready (HF SDXL+imgbb): {public_url}")
                return public_url

        # Tier 2: Gemini
        img_bytes = self._gemini_generate_bytes(prompt)
        if img_bytes:
            public_url = self._upload_to_imgbb(img_bytes)
            if public_url:
                logger.info(f"Image ready (Gemini+imgbb): {public_url}")
                return public_url
            logger.warning("imgbb upload failed after Gemini generation.")

        # Tier 3: Pollinations.ai (free AI image gen — no API key, content-aware)
        logger.warning(f"HF+Gemini failed, falling back to Pollinations.ai for: {text[:40]}")
        pollinations_url = self._pollinations_url(text, width=width, height=height)
        # Instagram API requires a stable public URL — download and upload to imgbb
        if self.imgbb_api_key:
            try:
                resp = requests.get(pollinations_url, timeout=30)
                if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("image"):
                    stable_url = self._upload_to_imgbb(resp.content)
                    if stable_url:
                        logger.info(f"Pollinations→imgbb upload OK: {stable_url}")
                        return stable_url
            except Exception as e:
                logger.warning(f"Pollinations download/imgbb upload failed: {e}")
        return pollinations_url

    def _loremflickr_url_fallback(self, text: str, width: int = 1200, height: int = 675, topic_keywords: str = None, section_index: int = 0) -> str:
        """Emergency Tier 4 fallback kept for reference (not called in normal flow)."""
        return self._loremflickr_url(text, width, height, topic_keywords=topic_keywords, section_index=section_index)

    def generate_blog_image(self, topic: str, style: str = "realistic") -> str | None:
        prompt = f"{topic}, high quality, professional, {style}, 8k resolution, detailed"
        return self.generate_social_media_image(prompt, platform="twitter")

    def generate_thumbnail(self, video_topic: str) -> str | None:
        prompt = f"YouTube thumbnail for {video_topic}, catchy, high contrast, 4k, vibrant colors"
        return self.generate_social_media_image(prompt, platform="twitter")


# Singleton
image_gen_enhanced = ImageGenerationEnhanced()
