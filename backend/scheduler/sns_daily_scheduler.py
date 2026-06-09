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
        from backend.integrations.bluesky_agent import BlueskyAgent

        try:
            from backend.modules.notion_content_pool import NotionContentPool
            self.notion_pool = NotionContentPool()
        except ImportError:
            self.notion_pool = None
            logger.warning("[SNS] NotionContentPool not available; using local fallback only.")

        try:
            from backend.integrations.instagram_integration import InstagramBot
            self.instagram = InstagramBot()
        except ImportError:
            self.instagram = None
            logger.warning("[SNS] InstagramBot not available; Instagram posting disabled.")

        self.bluesky = BlueskyAgent()

        self.ig_strategy = self._load_strategy("backend/cognitive/instagram_strategy.md")
        self.bs_strategy = self._load_strategy("backend/cognitive/bluesky_strategy.md")

        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        self.quality_gate = os.getenv("SAGE_QUALITY_GATE_STRICT", "True").lower() == "true"
        self.stability_gate = os.getenv("SAGE_STABILITY_GATE_STRICT", "True").lower() == "true"

        # identity.jsonを読み込んで分身の設定をロード
        self.identity = self._load_identity()
        logger.info(f"[SNS] Identity loaded: niche={self.identity.get('niche')}")

    def _load_identity(self) -> dict:
        """identity.jsonを読み込む。失敗時はデフォルト値を返す"""
        import json
        try:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "identity.json")
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {
                "role": "AI content creator",
                "niche": "AI tools and automation",
                "tone": "professional yet approachable",
                "brand_name": "Sage AI",
                "target_audience": "solopreneurs and developers",
            }

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

    def _call_llm(self, messages: list, max_tokens: int = 1500) -> str:
        """DeepSeek（primary）→ Groq（fallback）でLLMを呼び出す"""
        import requests as _req
        ds_key = os.getenv("DEEPSEEK_API_KEY")
        if ds_key:
            try:
                resp = _req.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {ds_key}", "Content-Type": "application/json"},
                    json={"model": "deepseek-chat", "messages": messages, "max_tokens": max_tokens, "temperature": 0.7},
                    timeout=20,
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
            except Exception as e:
                logger.warning(f"[LLM] DeepSeek failed: {e}, falling back to Groq")
        # Groq fallback
        client = self._load_groq_client()
        response = client.chat.completions.create(
            messages=messages, model="llama-3.3-70b-versatile", max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()

    def _generate_content(self, topic: str, content: str, motif: str) -> dict:
        """LLM generates ig_caption, bs_text, image_prompt in one JSON call."""
        # identity.jsonから動的に設定を読み込む（分身AI対応）
        niche = self.identity.get("niche", "AI tools and automation")
        tone = self.identity.get("tone", "professional yet approachable")
        brand = self.identity.get("brand_name", "Sage AI")
        target = self.identity.get("target_audience", "solopreneurs and developers")

        prompt = (
            f"You are a {tone} solopreneur building AI tools for small businesses.\n"
            f"Brand niche: {niche}\n"
            f"Target audience: {target}\n"
            f"Tone: {tone}\n\n"
            "[STRATEGIES]\n"
            "Bluesky: Real, personal, builder perspective. Conversation trigger required in every post.\n"
            "No hard selling. No CTA links in the post body. End with a question people can answer in 1-2 sentences.\n"
            "Instagram: Professional, save-rate optimized caption with hashtags.\n"
            "[/STRATEGIES]\n\n"
            "[RAW CONTENT]\n"
            f"Topic: {topic}\nDetail: {content}\nDirection: {motif}\n"
            "[/RAW CONTENT]\n\n"
            "### TASK:\n"
            "1. BLUESKY POST (max 240 chars): Authentic, real experience. First-person. End with a conversation-triggering question.\n"
            "   Example: 'Been testing this for 3 weeks. What surprised me: consistency beat perfection. What's one thing you kept up for 30 days?'\n"
            "   Do NOT include links, CTAs, or product names. Never start with 'Day N.'.\n"
            "2. INSTAGRAM CAPTION: Professional, save-rate optimized, with 3-5 hashtags. (Only if relevant)\n"
            "3. IMAGE PROMPT: Minimalist visual reflecting the topic, suitable for social media.\n\n"
            "ACCURACY RULES:\n"
            "- Do NOT invent income figures or specific results.\n"
            "- Use only first-hand, factual statements.\n"
            "- Never mention pricing or product URLs.\n\n"
            'Output strictly in JSON format:\n'
            '{\n    "bs_text": "...",\n    "ig_caption": "...",\n    "image_prompt": "..."\n}'
        )
        logger.info(f"🤖 Generating optimized SNS content using motif: {motif}")
        raw = self._call_llm([{"role": "user", "content": prompt}])

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
        if image_path and self.instagram:
            ig_result = self.instagram.post_image(image_url=image_path, caption=ig_caption)
            if ig_result.get("success"):
                logger.info(f"📸 Instagram posted: {ig_result.get('id')}")
            else:
                logger.error(f"❌ Instagram post failed: {ig_result.get('error')}")
        else:
            logger.info("⏭️ Instagram skipped (no image or Instagram disabled).")

        try:
            bs_result = self.bluesky.post_skeet(bs_text)
            if bs_result and "uri" in bs_result:
                logger.info(f"🦋 Bluesky posted: {bs_result['uri']}")
        except Exception as e:
            logger.error(f"❌ Bluesky post failed: {e}")

    def run_cycle(self) -> None:
        """Check for 'Ready' content and post to both platforms."""
        items = []
        if self.notion_pool:
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

        if item.get("id") and self.notion_pool:
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
