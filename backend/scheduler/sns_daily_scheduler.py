import os
import json
import logging
import random
from datetime import datetime
from dotenv import load_dotenv

from backend.data.jobs_store import append as _jobs_append

load_dotenv('.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SNS_Daily_Scheduler")


class SNSDailyScheduler:
    """
    Sage SNS CEO: Automates Instagram & Bluesky posts from the Notion Content Pool.
    Target: Global Market (JST Noon / EST Morning & Night).
    Applies 'Wise Person' Strategy and 'No Lies' Verification.
    """

    def __init__(self):
        from backend.modules.notion_content_pool import NotionContentPool
        from backend.integrations.bluesky_agent import BlueskyAgent
        from backend.integrations.instagram_integration import InstagramBot

        self.notion_pool = NotionContentPool()
        self.bluesky = BlueskyAgent()
        self.instagram = InstagramBot()

        self.ig_strategy = self._load_strategy("backend/cognitive/instagram_strategy.md")
        self.bs_strategy = self._load_strategy("backend/cognitive/bluesky_strategy.md")

        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        self.quality_gate = os.getenv("SAGE_QUALITY_GATE_STRICT", "True").lower() == "true"
        self.stability_gate = os.getenv("SAGE_STABILITY_GATE_STRICT", "True").lower() == "true"

    def _load_strategy(self, path: str) -> str:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            return ""

    def _load_groq_client(self):
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set.")
        return Groq(api_key=api_key)

    def _generate_content(self, topic: str, content: str, motif: str) -> dict:
        """LLM generates ig_caption, bs_text, image_prompt in one JSON call."""
        prompt = (
            "You are the Sage AI Marketing CEO. Generate high-performing content for BOTH Instagram and Bluesky.\n\n"
            f"[STRATEGIES]\nInstagram: {self.ig_strategy}\nBluesky: {self.bs_strategy}\n[/STRATEGIES]\n\n"
            f"[RAW CONTENT]\nTopic: {topic}\nDetail: {content}\nDirection: {motif}\n[/RAW CONTENT]\n\n"
            "### TASK:\n"
            "1. INSTAGRAM CAPTION: Professional, save-rate optimized, with hashtags.\n"
            "2. BLUESKY SKEET: Punchy, high-energy tech vibe, US/EU market focus. (Max 240 chars)\n"
            f"3. UNIFIED IMAGE PROMPT: Unique visual for Stable Diffusion reflecting '{motif}' motif.\n\n"
            'Output strictly in JSON format:\n'
            '{\n    "ig_caption": "...",\n    "bs_text": "...",\n    "image_prompt": "..."\n}'
        )
        logger.info(f"🤖 Generating optimized SNS content using motif: {motif}")
        client = self._load_groq_client()
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        raw = response.choices[0].message.content.strip()

        try:
            # Strip code fences (```json ... ``` or ``` ... ```)
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json\n"):
                    raw = raw[5:]
            return json.loads(raw)
        except Exception:
            logger.warning("AI failed to return JSON. Using raw text fallback.")
            return {
                "ig_caption": raw[:2200],
                "bs_text": raw[:240],
                "image_prompt": topic,
            }

    def _quality_check(self, content: dict, topic: str) -> bool:
        if not self.quality_gate:
            return True
        error_signals = [
            "i have lost my connection",
            "i cannot",
            "error:",
            "traceback",
            "exception",
        ]
        combined = " ".join(str(v) for v in content.values()).lower()
        for sig in error_signals:
            if sig in combined:
                logger.warning(f"🚫 [GATE] Quality gate FAILED for topic '{topic}'. System errors detected in output.")
                logger.info("   -> [BLOCKED] Post cancelled due to quality gate failure.")
                return False
        logger.info(f"✅ [GATE] QUALITY_GATE_PASS for topic '{topic}'. No system errors detected.")
        return True

    def _generate_image(self, prompt: str) -> dict:
        seed = random.randint(100, 999999)
        logger.info(f"🎨 Generating visual (Seed: {seed})")
        try:
            from backend.integrations.image_generation import image_gen_enhanced
            path = image_gen_enhanced.generate_social_media_image(prompt, platform="instagram")
            if path:
                return {"status": "success", "path": path}
            return {"status": "error", "path": None}
        except Exception as e:
            logger.error(f"❌ Visual generation failed: {e}")
            return {"status": "error", "path": None}

    def _write_job(self, item_id: str, topic: str, ig_caption: str,
                   bs_text: str, image_path: str, status: str = "pending") -> None:
        job_id = f"sns_{item_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        _jobs_append({
            "id": job_id,
            "type": "pr_post",
            "targets": ["instagram", "bluesky"],
            "topic": topic,
            "ig_caption": ig_caption,
            "bs_text": bs_text,
            "image_path": image_path,
            "notion_item_id": item_id,
            "status": status,
            "created_at": datetime.utcnow().isoformat(),
        })
        logger.info(f"💾 Job Queued: {job_id}")

    def _post_now(self, ig_caption: str, bs_text: str, image_path: str | None) -> None:
        if image_path:
            ig_result = self.instagram.post_image(image_url=image_path, caption=ig_caption)
            if ig_result.get("success"):
                logger.info(f"📸 Instagram posted: {ig_result.get('id')}")
            else:
                logger.error(f"❌ Instagram post failed: {ig_result.get('error')}")
        else:
            logger.info("⏭️ Instagram skipped (no image).")

        try:
            bs_result = self.bluesky.post_skeet(bs_text)
            if bs_result and "uri" in bs_result:
                logger.info(f"🦋 Bluesky posted: {bs_result['uri']}")
        except Exception as e:
            logger.error(f"❌ Bluesky post failed: {e}")

    def run_cycle(self) -> None:
        """Check for 'Ready' content and post to both platforms."""
        logger.info("🔍 [SNS CEO] Scanning Notion for 'Ready' content...")

        items = self.notion_pool.get_ready_content(limit=1)

        if not items:
            fallback_path = "backend/data/local_content_pool.json"
            logger.info("Notion fetch failed: No items. Switching to LOCAL FALLBACK.")
            try:
                logger.info("📂 Loading content from LOCAL FALLBACK (local_content_pool.json)...")
                with open(fallback_path, 'r', encoding='utf-8') as f:
                    pool = json.load(f)
                items = pool if isinstance(pool, list) else pool.get("items", [])
            except Exception as e:
                logger.error(f"Local fallback read failed: {e}")
                items = []

        if not items:
            logger.info("📅 No content '予約済み' found in Notion or Local Fallback. SNS Loop Idle.")
            return

        self._process_item(items[0])

    def _process_item(self, item: dict) -> None:
        """Processes a single content item through the SNS pipeline."""
        topic = item.get("topic", "")
        content = item.get("content", "")
        category = item.get("category", "General")
        item_id = item.get("id", f"local_{datetime.utcnow().strftime('%H%M%S')}")

        logger.info(f"🎯 Processing: {topic} (Category: {category})")

        motif = topic.split()[0] if topic else category

        if item.get("ig_caption"):
            ig_caption = item["ig_caption"]
            bs_text = item.get("bs_text", topic)
            image_prompt = item.get("image_prompt", topic)
            logger.info("♻️ Using pre-existing optimized content from Notion/Test Item.")
        else:
            generated = self._generate_content(topic, content, motif)
            ig_caption = generated.get("ig_caption", content)
            bs_text = generated.get("bs_text", topic)
            image_prompt = generated.get("image_prompt", topic)

        if not self._quality_check({"ig_caption": ig_caption, "bs_text": bs_text}, topic):
            return

        if self.stability_gate and "I have lost my connection to all intelligence providers" in ig_caption:
            logger.error("🚫 [STABILITY] All LLM circuits are dead. Aborting SNS cycle.")
            return

        # --- DRY RUN: skip image generation and posting ---
        if self.dry_run:
            logger.info(f"🛠️ [DRY_RUN] SNS Cycle finished for '{topic}'. Notion flag NOT updated.")
            self._write_job(item_id, topic, ig_caption, bs_text, "[DRY_RUN_NO_IMAGE]", status="dry_run")
            return

        # --- PRODUCTION: generate image then post ---
        img_result = self._generate_image(image_prompt)
        if img_result.get("status") == "success":
            image_path = img_result["path"]
        else:
            logger.warning("🚫 [IMAGE GATE] Image generation failed. Posting Bluesky text-only; skipping Instagram.")
            image_path = None

        self._post_now(ig_caption, bs_text, image_path)
        self._write_job(item_id, topic, ig_caption, bs_text, image_path or "", status="pending")

        if item.get("id"):
            self.notion_pool.mark_as_posted(item["id"])

        logger.info(f"✅ SNS Cycle Completed for '{topic}'")


if __name__ == "__main__":
    import schedule
    import time

    scheduler = SNSDailyScheduler()

    # JST 12:00 = UTC 03:00
    schedule.every().day.at("03:00").do(scheduler.run_cycle)
    # EST 08:00 = UTC 13:00
    schedule.every().day.at("13:00").do(scheduler.run_cycle)
    # EST 21:00 = UTC 02:00
    schedule.every().day.at("02:00").do(scheduler.run_cycle)

    logger.info("🚀 SNSDailyScheduler started. Targets: JST 12:00 / EST 08:00 / EST 21:00")

    while True:
        schedule.run_pending()
        time.sleep(60)
