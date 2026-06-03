import os
import logging
from atproto import Client, models

# Configure logging
logger = logging.getLogger("BlueskyAgent")


class BlueskyAgent:
    """
    シングルアカウント Bluesky クライアント。
    handle / password を直接渡すか、env vars にフォールバックする。

    複数アカウントの並行運用は sns_daily_scheduler.py 側で
    別スレッド × 別インスタンスとして実現する。
    """

    def __init__(self, handle: str = None, password: str = None):
        # 引数優先 → env var フォールバック
        self.username = handle or os.getenv("BLUESKY_HANDLE") or os.getenv("BLUESKY_USERNAME")
        self.password = password or os.getenv("BLUESKY_PASSWORD") or os.getenv("BLUESKY_APP_PASSWORD")
        self.client = None
        self.mock_mode = False

        if not self.username or not self.password:
            logger.warning("⚠️ Bluesky credentials not found. Running in MOCK MODE.")
            self.mock_mode = True
        else:
            try:
                self.client = Client()
                self.client.login(self.username, self.password)
                logger.info(f"✅ Bluesky Connected: @{self.username}")
            except Exception as e:
                logger.error(f"❌ Bluesky Login Failed ({self.username}): {e}")
                self.mock_mode = True

    def post_skeet(self, text: str) -> dict:
        """指定テキストを Bluesky に投稿する。"""
        if self.mock_mode:
            logger.info(f"🦋 [MOCK] Bluesky Post (@{self.username}): {text[:60]}...")
            return {"uri": "at://mock.uri/post/123", "cid": "mock_cid_123"}

        try:
            response = self.client.send_post(text=text)
            logger.info(f"✅ Bluesky Posted (@{self.username}): {response.uri}")
            return {"uri": response.uri, "cid": response.cid}
        except Exception as e:
            logger.error(f"❌ Bluesky post failed (@{self.username}): {e}")
            raise

    def run_once(self):
        """Flask の /api/automations/bluesky/trigger から呼ばれるエントリポイント。
        Notion から最新トピックを取得して Bluesky に投稿する。"""
        import requests, json as _json

        notion_key  = os.getenv("NOTION_API_KEY")
        notion_db   = os.getenv("NOTION_CONTENT_POOL_DB_ID")
        groq_key    = os.getenv("GROQ_API_KEY")
        handle      = self.username

        logger.info(f"[BlueskyAgent] run_once() started — handle={handle}")

        # ─ Notionからトピック取得 ──────────────────────────────────────
        topic = "AI automation tips for solopreneurs"
        category = "General"
        page_id = None

        if notion_key and notion_db:
            try:
                res = requests.post(
                    f"https://api.notion.com/v1/databases/{notion_db}/query",
                    headers={"Authorization": f"Bearer {notion_key}",
                             "Notion-Version": "2022-06-28",
                             "Content-Type": "application/json"},
                    json={"filter": {"property": "Status", "status": {"equals": "Scheduled"}},
                          "page_size": 1,
                          "sorts": [{"property": "Created", "direction": "ascending"}]},
                    timeout=10,
                )
                data = res.json()
                page = (data.get("results") or [None])[0]
                if page:
                    page_id  = page["id"]
                    topic    = (page.get("properties", {}).get("Topic", {})
                                    .get("title", [{}])[0].get("text", {}).get("content", topic))
                    category = (page.get("properties", {}).get("Category", {})
                                    .get("select", {}).get("name", category))
                    logger.info(f"[BlueskyAgent] Topic from Notion: {topic}")
            except Exception as e:
                logger.warning(f"[BlueskyAgent] Notion fetch failed: {e}")

        # ─ Groqでコンテンツ生成（カテゴリローテーション対応）──────────────
        import random as _random

        _non_cta = ["build_in_public", "insight", "marketing_lesson", "question"]
        _cat = _random.choice(_non_cta)
        _cat_instructions = {
            "build_in_public": (
                "Write a raw BUILD-IN-PUBLIC post about a specific real moment building an AI automation system. "
                "Sound like a real developer, NOT ad copy. No CTAs."
            ),
            "insight": (
                "Share ONE concrete insight about AI automation or solopreneurship. "
                "Be specific. Educational, not promotional."
            ),
            "marketing_lesson": (
                "Share ONE practical marketing lesson (STP, 3C, PEST, customer psychology, etc.) "
                "as if you just learned it. Educational tone."
            ),
            "question": (
                "Ask your audience ONE genuine, specific question about AI or solopreneurship. "
                "Easy to answer. MUST end with a question mark."
            ),
        }
        _cat_hashtags = {
            "build_in_public": "#BuildInPublic #ShipIt #IndieHacker",
            "insight": "#AIAutomation #Solopreneur #BuildInPublic",
            "marketing_lesson": "#MarketingTips #GrowthHacking #MadeInJapan",
            "question": "#Solopreneur #IndieHacker #AITools",
        }

        content = None
        if groq_key:
            try:
                prompt = (
                    f"Write ONE Bluesky post (max 240 chars) about: {topic}.\n"
                    f"Category: {_cat.upper()}\n"
                    f"Instruction: {_cat_instructions[_cat]}\n"
                    f"Append these hashtags at the end: {_cat_hashtags[_cat]}\n"
                    f"Output post text ONLY. No extra commentary."
                )
                gr = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}",
                             "Content-Type": "application/json"},
                    json={"model": "llama-3.3-70b-versatile",
                          "messages": [{"role": "user", "content": prompt}],
                          "max_tokens": 300, "temperature": 0.85},
                    timeout=15,
                )
                content = gr.json()["choices"][0]["message"]["content"].strip()
                logger.info(f"[BlueskyAgent] Generated [{_cat}] ({len(content)} chars)")
            except Exception as e:
                logger.warning(f"[BlueskyAgent] Groq failed: {e}")

        if not content:
            content = "Building Sage in public — day by day. What is your biggest automation win this week? #BuildInPublic #Solopreneur"

        # Post
        result = self.post_skeet(content)
        logger.info(f"[BlueskyAgent] Posted: {result}")

        # Update Notion status to Done
        if page_id and notion_key:
            try:
                requests.patch(
                    f"https://api.notion.com/v1/pages/{page_id}",
                    headers={"Authorization": f"Bearer {notion_key}",
                             "Notion-Version": "2022-06-28",
                             "Content-Type": "application/json"},
                    json={"properties": {"Status": {"status": {"name": "Done"}}}},
                    timeout=10,
                )
                logger.info(f"[BlueskyAgent] Notion page {page_id} marked Done")
            except Exception as e:
                logger.warning(f"[BlueskyAgent] Notion status update failed: {e}")

        return result
