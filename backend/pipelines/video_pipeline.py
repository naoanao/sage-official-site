"""
VideoPipeline v1.0 — ブログ記事 → ショート動画 → Reels自動投稿
Phase 2: 動画パイプライン

フロー:
  1. ブログ記事（タイトル + 本文）→ 30秒動画台本をGroqで生成
  2. FLUX.1で静止画を生成（既存パイプライン）
  3. Suno AIでBGMを生成
  4. Kling v2.1で動画を生成（画像 + テキスト）
  5. Instagram ReelsにAPI投稿

HEARTBEAT: 週2〜3回（ブログ5本に1本動画を生成）
"""
import os
import json
import logging
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class VideoPipeline:
    """
    ブログ記事を元に縦型ショート動画を自動生成・投稿するパイプライン。
    identity.jsonのnicheに合わせたスタイルで生成する。
    """

    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"
        self.identity = self._load_identity()

    def _load_identity(self) -> dict:
        import json as _json
        try:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "identity.json")
            with open(path, "r", encoding="utf-8") as f:
                return _json.load(f)
        except Exception:
            return {"niche": "AI automation", "brand_name": "Sage AI", "target_audience": "developers"}

    def _generate_video_script(self, title: str, blog_excerpt: str) -> str:
        """ブログ記事から30秒動画の台本を生成"""
        if not self.groq_api_key:
            return f"Discover: {title}. Learn how to automate your workflow with AI. Link in bio."

        try:
            from groq import Groq
            client = Groq(api_key=self.groq_api_key)
            niche = self.identity.get("niche", "AI automation")
            brand = self.identity.get("brand_name", "Sage AI")
            target = self.identity.get("target_audience", "developers")

            resp = client.chat.completions.create(
                messages=[{
                    "role": "user",
                    "content": f"""Write a 30-second video script for Instagram Reels/TikTok.
Brand: {brand}
Niche: {niche}
Target: {target}

Blog title: {title}
Excerpt: {blog_excerpt[:300]}

Rules:
- Hook in first 3 seconds (question or bold statement)
- 3 key points, each 5-8 seconds
- CTA at end: "Full guide at [link in bio]"
- Under 100 words total
- Energetic, direct tone
- No emojis in script

Output: Just the script text, nothing else."""
                }],
                model="llama-3.3-70b-versatile",
                max_tokens=200,
                temperature=0.7,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"[VideoPipeline] Script generation failed: {e}")
            return f"{title} — Learn more at link in bio."

    def _generate_image_prompt(self, title: str, script: str) -> str:
        """動画のサムネイル画像プロンプトを生成"""
        niche = self.identity.get("niche", "AI automation")
        return (
            f"Cinematic vertical 9:16 image, {niche} theme. "
            f"Abstract tech visualization representing: {title[:60]}. "
            "Clean, modern, high contrast, suitable for Instagram Reels thumbnail. "
            "No text overlay, professional quality, 4K."
        )

    def run(self, blog_title: str, blog_excerpt: str = "", image_url: str = None) -> dict:
        """
        動画パイプラインを実行する。

        Args:
            blog_title: ブログ記事のタイトル
            blog_excerpt: ブログ記事の抜粋（最初の300字程度）
            image_url: 既に生成済みの画像URL（任意）

        Returns:
            {"status": "success", "video_url": "...", "instagram_post_id": "..."}
        """
        logger.info(f"[VideoPipeline] Starting for: {blog_title[:60]}")
        result = {
            "status": "started",
            "title": blog_title,
            "timestamp": datetime.utcnow().isoformat(),
            "script": None,
            "image_url": image_url,
            "bgm_url": None,
            "video_url": None,
            "instagram_post_id": None,
        }

        # Step 1: 台本生成
        script = self._generate_video_script(blog_title, blog_excerpt)
        result["script"] = script
        logger.info(f"[VideoPipeline] Script: {script[:80]}...")

        # Step 2: 画像生成（image_urlがない場合）
        if not image_url:
            try:
                from backend.modules.image_generator import ImageGenerator
                img_gen = ImageGenerator()
                img_prompt = self._generate_image_prompt(blog_title, script)
                image_url = img_gen.generate(img_prompt)
                result["image_url"] = image_url
                logger.info(f"[VideoPipeline] Image generated: {image_url[:60] if image_url else 'None'}")
            except Exception as e:
                logger.warning(f"[VideoPipeline] Image generation failed: {e}")

        # Step 3: BGM生成（Suno AI）
        try:
            from backend.integrations.suno_agent import SunoAgent
            suno = SunoAgent()
            bgm_result = suno.generate_bgm(
                topic=blog_title,
                niche=self.identity.get("niche", ""),
                duration_seconds=30,
            )
            if bgm_result.get("status") in ("success", "dry_run"):
                result["bgm_url"] = bgm_result.get("audio_url")
                result["bgm_local"] = bgm_result.get("local_path")
            logger.info(f"[VideoPipeline] BGM: {bgm_result.get('status')}")
        except Exception as e:
            logger.warning(f"[VideoPipeline] BGM generation skipped: {e}")

        # Step 4: 動画生成（Kling）
        try:
            from backend.integrations.kling_agent import KlingAgent
            kling = KlingAgent()
            video_result = kling.generate_video(
                prompt=script,
                image_url=image_url,
                duration=5,
                aspect_ratio="9:16",
            )
            if video_result.get("status") in ("success", "dry_run"):
                result["video_url"] = video_result.get("video_url")
                result["video_local"] = video_result.get("local_path")
            logger.info(f"[VideoPipeline] Video: {video_result.get('status')}")
        except Exception as e:
            logger.warning(f"[VideoPipeline] Video generation skipped: {e}")

        # Step 5: Instagram Reels投稿
        if result.get("video_url") and not self.dry_run:
            try:
                from backend.integrations.instagram_integration import InstagramBot
                ig = InstagramBot()
                caption = f"{script}\n\n👉 Full guide at link in bio\n\n#AI #automation #developer"
                post_result = ig.post_video_reel(
                    video_url=result["video_url"],
                    caption=caption,
                )
                if post_result.get("success"):
                    result["instagram_post_id"] = post_result.get("id")
                    logger.info(f"[VideoPipeline] ✅ Instagram Reel posted: {post_result.get('id')}")
            except Exception as e:
                logger.warning(f"[VideoPipeline] Instagram post skipped: {e}")

        result["status"] = "success" if (result.get("video_url") or self.dry_run) else "partial"
        logger.info(f"[VideoPipeline] Complete: {result['status']}")

        # Notionにログ
        try:
            from backend.integrations.notion_logger import notion_logger
            notion_logger.log_event(
                "video_pipeline",
                f"Video generated for: {blog_title[:60]}",
                result.get("status"),
            )
        except Exception:
            pass

        return result


if __name__ == "__main__":
    pipeline = VideoPipeline()
    test_result = pipeline.run(
        blog_title="How to Build an Autonomous AI Content Engine in 2026",
        blog_excerpt="Developers are increasingly building autonomous systems that generate and distribute content 24/7...",
    )
    print(json.dumps(test_result, indent=2, ensure_ascii=False, default=str))
