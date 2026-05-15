import os
import json
import logging
import random
from datetime import datetime
from dotenv import load_dotenv

from backend.data.jobs_store import append as _jobs_append

load_dotenv('.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("InstagramScheduler")

VISUAL_VIBES = [
    "Neon Noir",
    "Minimalist Zen",
    "Hyper-realistic",
    "Lo-fi Cozy",
    "Cyberpunk Glow",
    "Soft Pastel Dream",
    "Dark Academia",
    "Futuristic Glass",
    "Vintage Film",
    "Ethereal White Studio",
]


class InstagramDailyScheduler:
    """
    Automates Instagram posts based on Notion Content Pool.
    Target: 12:00 JST Daily.
    Ensures visual variety and applies Wise Person Strategy.
    """

    def __init__(self):
        from backend.modules.notion_content_pool import NotionContentPool
        from backend.integrations.instagram_integration import InstagramBot

        self.notion_pool = NotionContentPool()
        self.instagram = InstagramBot()
        self.strategy = self._load_strategy("backend/cognitive/instagram_strategy.md")
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"

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

    def _optimize_content(self, topic: str, content: str, seed_time: str) -> dict:
        """Generate caption and unique image_prompt via LLM."""
        vibe = random.choice(VISUAL_VIBES)
        prompt = (
            "You are an expert Instagram Marketer (Wise Person Edition).\n"
            "Generate a high-converting Instagram post based on the following strategy and raw content.\n\n"
            f"[STRATEGY]\n{self.strategy}\n[/STRATEGY]\n\n"
            f"[RAW CONTENT]\nTopic: {topic}\nDetail: {content}\nSeed Time: {seed_time}\n[/RAW CONTENT]\n\n"
            "### TASK:\n"
            "1. CREATE A CAPTION: Use psychological triggers (Save Rate optimization).\n"
            "2. CREATE A UNIQUE IMAGE PROMPT: Ensure this is DIFFERENT every time.\n"
            f'   - Specify a unique "Visual Vibe" (e.g. {vibe}).\n'
            '   - Specify a specific "Color Palette".\n'
            '   - Specify a detailed "Subject Action" or "Abstract Composition" related to the topic.\n\n'
            'Output strictly in JSON format:\n'
            '{\n'
            '    "caption": "Your optimized caption with hashtags",\n'
            '    "image_prompt": "A highly detailed, unique image prompt for stable diffusion"\n'
            '}'
        )
        logger.info("🧠 Thinking: Optimizing for variety and resonance...")
        client = self._load_groq_client()
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        raw = response.choices[0].message.content.strip()

        try:
            if '`' in raw:
                raw = raw.split('`')[1]
                if raw.startswith("json\n"):
                    raw = raw[5:]
            result = json.loads(raw)
            logger.info(f"✨ Strategy Applied. Vibe: {vibe[:50]}...")
            return result
        except Exception:
            logger.warning("AI failed to return JSON. Using raw text as fallback.")
            return {
                "caption": raw[:2200],
                "image_prompt": f"{topic}, {vibe} style, high quality",
            }

    def _generate_image(self, prompt: str) -> dict:
        logger.info(f"🎨 Generating UNIQUE visual for: {prompt[:50]}...")
        try:
            from backend.integrations.image_generation import image_gen_enhanced
            path = image_gen_enhanced.generate_social_media_image(prompt, platform="instagram")
            if path:
                return {"status": "success", "path": path}
            return {"status": "error", "message": "Empty path returned"}
        except Exception as e:
            logger.error(f"❌ Image generation failed: {e}")
            return {"status": "error", "message": str(e)}

    def _write_job(self, item_id: str, topic: str, caption: str,
                   image_path: str, status: str = "pending") -> None:
        job_id = f"insta_val_{item_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        _jobs_append({
            "id": job_id,
            "type": "pr_post",
            "targets": ["instagram"],
            "topic": topic,
            "ig_caption": caption,
            "image_path": image_path,
            "notion_item_id": item_id,
            "status": status,
            "created_at": datetime.utcnow().isoformat(),
        })
        logger.info(f"✅ Instagram Job {job_id} queued successfully.")

    def run_video_reel_cycle(self, topic: str = "", slides: list = None,
                              language: str = "en") -> None:
        """
        動画Reelsを自動生成してInstagramに投稿する。

        Args:
            topic   : 動画のトピック（省略時はNotionから取得）
            slides  : スライドテキストリスト（省略時はトピックから自動生成）
            language: ナレーション言語 "en" | "ja"

        Flow:
            1. Notionからコンテンツ取得 (topicが空の場合)
            2. LLMでキャプション生成
            3. video_generator.py で動画生成
            4. Cloudflare R2 にアップロード → 公開URL取得
            5. InstagramBot.post_video_reel() で投稿
        """
        logger.info("🎬 Starting Instagram Reel video cycle...")

        # --- コンテンツ取得 ---
        if not topic:
            items = self.notion_pool.get_ready_content(limit=1)
            if not items:
                logger.info("📅 No content in Notion. Skipping video cycle.")
                return
            item = items[0]
            topic = item.get("topic", "")
            content = item.get("content", "")
            item_id = item.get("id", f"local_{datetime.utcnow().strftime('%H%M%S')}")
        else:
            content = topic
            item_id = f"manual_{datetime.utcnow().strftime('%H%M%S')}"
            item = None

        logger.info(f"📂 Topic: {topic}")

        # --- キャプション生成 ---
        seed_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        try:
            optimized = self._optimize_content(topic, content, seed_time)
            caption = optimized.get("caption", content)
        except Exception as e:
            logger.warning(f"🛡️ Caption generation failed: {e}. Using topic as caption.")
            caption = content or topic

        # --- DRY RUN ---
        if self.dry_run:
            logger.info(f"🛠️ [DRY_RUN] Reel cycle finished for '{topic}'.")
            return

        # --- 動画生成 ---
        try:
            from backend.integrations.video_generator import generate_sns_short_video
        except ImportError:
            from video_generator import generate_sns_short_video

        # スライドテキストが未指定の場合はトピックを分割して使う
        if not slides:
            import re
            sentences = re.split(r'[。！？\.\!\?]\s*', (content or topic).strip())
            slides = [s.strip() for s in sentences if len(s.strip()) > 5][:5]
            if not slides:
                slides = [topic]

        cta_text = "Follow for more AI insights!" if language == "en" else "詳しくはプロフのリンクから"

        logger.info(f"🎬 Generating Reel video ({len(slides)} slides, lang={language})...")
        video_path = generate_sns_short_video(
            title=topic,
            slides=slides,
            cta_text=cta_text,
            enable_narration=True,
            narration_language=language,
            enable_bgm=True,
            enable_ken_burns=True,
            enable_text_fadein=True,
        )

        if not video_path:
            logger.error("❌ Video generation failed.")
            return

        logger.info(f"✅ Video generated: {video_path}")

        # --- Cloudflare R2 にアップロード ---
        try:
            from backend.integrations.cloudflare_r2 import CloudflareR2Uploader
        except ImportError:
            from cloudflare_r2 import CloudflareR2Uploader

        r2 = CloudflareR2Uploader()
        import os
        object_name = f"reels/{os.path.basename(video_path)}"
        video_public_url = r2.upload_file(video_path, object_name=object_name)

        if not video_public_url:
            logger.error("❌ R2 upload failed. Cannot post Reel without public URL.")
            logger.error("   Check CF_R2_ACCOUNT_ID / CF_R2_ACCESS_KEY / CF_R2_SECRET_KEY / CF_R2_BUCKET / CF_R2_PUBLIC_URL in .env")
            return

        logger.info(f"☁️ Video uploaded to R2: {video_public_url}")

        # --- Instagram Reel 投稿 ---
        reel_result = self.instagram.post_video_reel(
            video_url=video_public_url,
            caption=caption,
            share_to_feed=True,
        )

        if reel_result.get("success"):
            logger.info(f"✅ Instagram Reel posted! ID: {reel_result.get('id')}")
            if item and item.get("id"):
                self.notion_pool.mark_as_posted(item["id"])
        else:
            logger.error(f"❌ Reel posting failed: {reel_result.get('error')}")

        logger.info(f"✅ Reel cycle completed for '{topic}'")

    def run_cycle(self) -> None:
        """Check if we have ready content and queue it for the job_runner."""
        logger.info("🔍 Checking for scheduled Instagram content...")

        items = self.notion_pool.get_ready_content(limit=1)
        if not items:
            logger.info("📅 No content '予約済み' in Notion. Skipping.")
            return

        item = items[0]
        topic = item.get("topic", "")
        content = item.get("content", "")
        item_id = item.get("id", f"local_{datetime.utcnow().strftime('%H%M%S')}")

        logger.info(f"📂 Picking content: {topic}")

        seed_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        try:
            optimized = self._optimize_content(topic, content, seed_time)
            caption = optimized.get("caption", content)
            image_prompt = optimized.get("image_prompt", topic)
        except Exception as e:
            logger.warning(f"🛡️ Optimization failed: {e}. Falling back to defaults.")
            caption = content or topic
            image_prompt = topic

        # --- DRY RUN: skip image generation and posting ---
        if self.dry_run:
            logger.info(f"🛠️ [DRY_RUN] Instagram Cycle finished for '{topic}'. Notion flag NOT updated.")
            self._write_job(item_id, topic, caption, "[DRY_RUN_NO_IMAGE]", status="dry_run")
            return

        # --- PRODUCTION: generate image then post ---
        img_result = self._generate_image(image_prompt)
        if img_result.get("status") != "success":
            logger.error(f"❌ Image generation failed: {img_result.get('message')}")
            return

        image_path = img_result["path"]
        logger.info(f"📸 Image generated: {image_path}")

        ig_result = self.instagram.post_image(image_url=image_path, caption=caption)
        if ig_result.get("success"):
            logger.info(f"✅ Instagram posted: {ig_result.get('id')}")
        else:
            logger.error(f"❌ Instagram post failed: {ig_result.get('error')}")

        self._write_job(item_id, topic, caption, image_path, status="pending")

        if item.get("id"):
            self.notion_pool.mark_as_posted(item["id"])

        logger.info(f"✅ Instagram Cycle Completed for '{topic}'")


if __name__ == "__main__":
    import schedule
    import time

    scheduler = InstagramDailyScheduler()

    # 画像投稿: JST 12:00 = UTC 03:00
    schedule.every().day.at("03:00").do(scheduler.run_cycle)

    # Reels動画投稿: JST 20:00 = UTC 11:00
    schedule.every().day.at("11:00").do(
        scheduler.run_video_reel_cycle, language="en"
    )

    logger.info("🚀 InstagramDailyScheduler started.")
    logger.info("   📸 Image post : JST 12:00 daily")
    logger.info("   🎬 Reel video : JST 20:00 daily")

    while True:
        schedule.run_pending()
        time.sleep(60)
