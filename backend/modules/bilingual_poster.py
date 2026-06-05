"""
bilingual_poster.py
──────────────────────────────────────────────────────────────────
EN + JP を同一トピックで同時投稿するモジュール。

Gap分析の「多言語展開が手動」を解消する。

フロー:
  1. 1つのトピックから EN・JP 両方のコンテンツをGroqで並列生成
  2. Bluesky に EN 投稿 → JP 投稿（どちらも独立したポスト）
  3. Instagram に EN/JP 混在キャプション（グローバル向け）で投稿

呼び出し元:
  - /api/sns/post_bilingual エンドポイント（手動）
  - sns_daily_scheduler.py で BILINGUAL_MODE=true 時に自動切替
"""

import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class BilingualPoster:
    """英語・日本語を同時に投稿する分身AI。"""

    def __init__(self):
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"
        self.groq_key = os.getenv("GROQ_API_KEY", "")

    # ── コンテンツ生成 ─────────────────────────────────────────────
    def _generate_bilingual_content(self, topic: str) -> dict:
        """
        1回のGroqコールで EN と JP の両方を生成する。

        Returns:
            {
              "en": { "bluesky": "...", "instagram_caption": "..." },
              "jp": { "bluesky": "...", "instagram_caption": "..." },
              "image_prompt": "..."
            }
        """
        if not self.groq_key:
            return self._fallback_content(topic)

        from groq import Groq
        client = Groq(api_key=self.groq_key)

        prompt = f"""You are Sage, an AI automation expert. Generate social media content in BOTH English and Japanese for the same topic.

Topic: {topic}

Return ONLY valid JSON with this exact structure:
{{
  "en": {{
    "bluesky": "English Bluesky post (max 300 chars, no hashtags, value-first, 1-2 sentences)",
    "instagram_caption": "English IG caption (2-3 sentences + 5 relevant hashtags)"
  }},
  "jp": {{
    "bluesky": "Japanese Bluesky post (max 300 chars, 価値先行, hashtag不要)",
    "instagram_caption": "Japanese IG caption (2-3 sentences + 5 Japanese hashtags)"
  }},
  "image_prompt": "Minimalist tech visual prompt for FLUX.1 (English, no text in image)"
}}

Rules:
- EN: Direct, authoritative, data-driven. Target: indie hackers / devs.
- JP: Warm, knowledgeable, slightly formal. Target: Japanese creators / engineers.
- Both must convey the SAME core insight, not translations of each other.
- No emojis in Bluesky. Emojis OK in Instagram.
"""

        try:
            res = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=800,
                response_format={"type": "json_object"},
            )
            return json.loads(res.choices[0].message.content)
        except Exception as e:
            logger.error(f"[BilingualPoster] Groq generation failed: {e}")
            return self._fallback_content(topic)

    def _fallback_content(self, topic: str) -> dict:
        """APIエラー時のフォールバック。"""
        return {
            "en": {
                "bluesky": f"AI automation insight: {topic[:200]}",
                "instagram_caption": f"Deep dive into {topic}. The future of solopreneurship is AI-powered. #AIAutomation #SageAI #IndieHacker #PassiveIncome #AITools",
            },
            "jp": {
                "bluesky": f"AIオートメーション：{topic[:150]}について考察します。",
                "instagram_caption": f"{topic}について。AIで仕事を自動化する時代が来ています。#AI自動化 #SageAI #副業 #AI副業 #フリーランス",
            },
            "image_prompt": f"minimalist tech dashboard, dark background, purple accent, representing {topic[:50]}",
        }

    # ── Bluesky投稿 ────────────────────────────────────────────────
    def _post_to_bluesky(self, text: str, lang_label: str) -> dict:
        """Blueskyに1件投稿。"""
        if self.dry_run:
            logger.info(f"[BilingualPoster][DRY_RUN] Bluesky {lang_label}: {text[:80]}...")
            return {"success": True, "dry_run": True, "lang": lang_label}

        try:
            from backend.integrations.bluesky_agent import BlueskyAgent
            agent = BlueskyAgent()
            result = agent.post_text(text)
            logger.info(f"[BilingualPoster] Bluesky {lang_label} posted: {text[:60]}...")
            return {"success": True, "lang": lang_label, "result": str(result)[:100]}
        except Exception as e:
            logger.error(f"[BilingualPoster] Bluesky {lang_label} failed: {e}")
            return {"success": False, "lang": lang_label, "error": str(e)}

    # ── Instagram投稿 ──────────────────────────────────────────────
    def _post_to_instagram(self, en_caption: str, jp_caption: str,
                           image_prompt: str) -> dict:
        """Instagram に EN+JP 混合キャプションで投稿。"""
        # EN + JP を縦に並べてグローバル向けキャプションを作成
        combined_caption = f"{en_caption}\n\n---\n\n{jp_caption}"

        if self.dry_run:
            logger.info(f"[BilingualPoster][DRY_RUN] Instagram: {combined_caption[:80]}...")
            return {"success": True, "dry_run": True}

        try:
            # 画像生成
            image_url = self._generate_image(image_prompt)
            if not image_url:
                return {"success": False, "error": "Image generation failed"}

            from backend.integrations.instagram_integration import InstagramBot
            bot = InstagramBot()
            result = bot.post_image(image_url=image_url, caption=combined_caption)
            logger.info(f"[BilingualPoster] Instagram posted bilingual content.")
            return result
        except Exception as e:
            logger.error(f"[BilingualPoster] Instagram bilingual post failed: {e}")
            return {"success": False, "error": str(e)}

    def _generate_image(self, prompt: str) -> Optional[str]:
        """FLUX.1 → Gemini → Pollinationsの順で画像URLを取得。"""
        try:
            from backend.modules.image_generator import ImageGenerator
            gen = ImageGenerator()
            result = gen.generate(prompt)
            if isinstance(result, dict):
                return result.get("url") or result.get("image_url")
            return str(result) if result else None
        except Exception as e:
            logger.warning(f"[BilingualPoster] Image gen failed, trying Pollinations: {e}")
            # フォールバック: Pollinations.ai (無料・認証不要)
            try:
                import urllib.parse
                encoded = urllib.parse.quote(prompt[:200])
                return f"https://image.pollinations.ai/prompt/{encoded}?width=1080&height=1080&nologo=true"
            except Exception:
                return None

    # ── メインエントリポイント ────────────────────────────────────
    def post_bilingual(self, topic: str) -> dict:
        """
        EN+JPで同時投稿する。

        Args:
            topic: 投稿するトピック（例: "AI automation tools for solopreneurs"）

        Returns:
            {
              "content": { "en": {...}, "jp": {...} },
              "bluesky_en": { "success": True },
              "bluesky_jp": { "success": True },
              "instagram":  { "success": True },
            }
        """
        logger.info(f"[BilingualPoster] post_bilingual() start: topic={topic[:60]}")

        # 1. EN + JP コンテンツ生成
        content = self._generate_bilingual_content(topic)
        logger.info(f"[BilingualPoster] Content generated for EN + JP")

        en = content.get("en", {})
        jp = content.get("jp", {})
        image_prompt = content.get("image_prompt", topic)

        results = {"topic": topic, "content": content}

        # 2. Bluesky EN投稿
        results["bluesky_en"] = self._post_to_bluesky(
            en.get("bluesky", ""), lang_label="EN"
        )

        # 3. Bluesky JP投稿（ENの直後）
        results["bluesky_jp"] = self._post_to_bluesky(
            jp.get("bluesky", ""), lang_label="JP"
        )

        # 4. Instagram EN+JP混合キャプション投稿
        results["instagram"] = self._post_to_instagram(
            en_caption=en.get("instagram_caption", ""),
            jp_caption=jp.get("instagram_caption", ""),
            image_prompt=image_prompt,
        )

        # 集計
        success_count = sum(1 for k in ["bluesky_en", "bluesky_jp", "instagram"]
                            if results.get(k, {}).get("success"))
        results["summary"] = {
            "platforms_succeeded": success_count,
            "platforms_total": 3,
        }

        logger.info(f"[BilingualPoster] Done: {success_count}/3 platforms succeeded.")
        return results


# ── CLI テスト ────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO)

    poster = BilingualPoster()
    result = poster.post_bilingual(
        topic="How AI automation replaced 8 hours of work with 20 minutes per day"
    )
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
