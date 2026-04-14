"""
DreamMode v1.0 — 夜間自律発想エンジン
HEARTBEAT.md: 03:00〜05:00 JST に実行

概念:
人間が最も眠っている時間帯に、SageはChromaDB（長期記憶）とTavilyの
リアルタイムデータを組み合わせて「誰も思いつかなかった新しいコンテンツアイデア」を生成する。

「過去の高パフォーマンスパターン × 今日の急上昇トレンド = 明日の勝てるコンテンツ」

朝起きたオーナーには:
- Telegramに「今夜のひらめき5件」が届いている
- NotionのDream Ideasデータベースに自動追記されている
- すぐに使えるコンテンツ案として仕上がっている
"""
import os
import json
import logging
import random
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class DreamMode:
    """
    Sageの夜間自律発想エンジン。
    高パフォーマンスな記憶とリアルタイムトレンドを融合してコンテンツアイデアを生成する。
    """

    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.notion_token = os.getenv("NOTION_TOKEN", "")
        self.notion_db_id = os.getenv("NOTION_DREAM_IDEAS_DB_ID", "")
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"
        self.num_ideas = int(os.getenv("DREAM_MODE_IDEAS_COUNT", "5"))

    def _get_top_performing_memories(self) -> list[str]:
        """
        ChromaDB / Neuromorphic Brainから過去30日の
        高パフォーマンスコンテンツパターンを取得する。
        """
        memories = []
        try:
            from backend.modules.sage_memory import SageMemory
            memory = SageMemory()
            # 高エンゲージメントコンテンツを検索
            results = memory.search_long_term("high engagement successful content blog post", limit=10)
            for item in results:
                if isinstance(item, dict):
                    memories.append(item.get("content", item.get("text", str(item)))[:200])
                else:
                    memories.append(str(item)[:200])
        except Exception as e:
            logger.warning(f"DreamMode: Could not fetch memories: {e}")
            # フォールバック: テーマベースのシードを使用
            memories = [
                "AI automation tools for passive income",
                "solopreneur productivity hacks with AI",
                "ChatGPT side hustles that actually work",
                "n8n workflows for content creators",
                "Notion + AI for business automation",
            ]
        return memories[:10]

    def _get_trending_topics(self) -> list[str]:
        """
        MarketScanAgentのキャッシュまたはTavilyから今日のトレンドを取得。
        """
        topics = []

        # まずMarketScanのキャッシュを確認
        try:
            cache_path = os.path.join(os.getcwd(), "backend", "memory_db", "market_scan_latest.json")
            if os.path.exists(cache_path):
                with open(cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                opportunities = data.get("opportunities", [])
                for opp in opportunities[:5]:
                    kw = opp.get("keyword", "")
                    if kw:
                        topics.append(kw)
                logger.info(f"DreamMode: Loaded {len(topics)} topics from MarketScan cache")
        except Exception as e:
            logger.warning(f"DreamMode: MarketScan cache read failed: {e}")

        # Tavilyでリアルタイム補完
        if len(topics) < 3:
            try:
                from tavily import TavilyClient
                client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY", ""))
                response = client.search(
                    query="AI monetization trends solopreneur april 2026",
                    search_depth="basic",
                    max_results=5,
                )
                for item in response.get("results", []):
                    title = item.get("title", "")
                    if title:
                        topics.append(title[:100])
            except Exception as e:
                logger.warning(f"DreamMode: Tavily fetch failed: {e}")

        # フォールバック
        if not topics:
            topics = [
                "AI content monetization 2026",
                "solopreneur automation tools",
                "passive income digital products",
                "AI agent business models",
                "no-code automation income",
            ]

        return topics[:8]

    def generate_dream_ideas(self) -> list[dict]:
        """
        過去の記憶 × 今日のトレンド → 新しいコンテンツアイデア生成。
        「誰も書いていないが、確実に需要がある」テーマを発見する。
        """
        if not self.groq_api_key:
            logger.warning("DreamMode: No GROQ_API_KEY. Cannot generate ideas.")
            return []

        memories = self._get_top_performing_memories()
        trends = self._get_trending_topics()

        from backend.modules.soul_loader import load_soul
        soul = load_soul()

        system_prompt = f"""You are {soul.identity.get('name', 'Sage')}, an autonomous AI content strategist.
It's 3am and you are in "Dream Mode" - your creative synthesis engine.

Your task: Generate {self.num_ideas} brilliant content ideas by combining:
1. Past high-performing content patterns (what has worked before)
2. Today's emerging trends (what people are searching for NOW)

For each idea, create something that:
- Has HIGH demand but LOW competition (the sweet spot)
- Can be created autonomously by AI tools
- Appeals to solopreneurs wanting to make money with AI
- Is specific enough to act on immediately
- Has not been covered (or very little coverage) yet

Output as JSON array with these fields:
- title: Catchy, specific title (not generic)
- hook: Opening sentence that would stop a scroll
- format: blog_post / sns_thread / short_video / pdf_guide / email_sequence
- estimated_engagement: low/medium/high/viral
- why_now: Why this topic is hot RIGHT NOW
- ai_tools_needed: List of AI tools to create this content"""

        user_prompt = f"""PAST HIGH-PERFORMERS (what worked):
{chr(10).join(f'- {m}' for m in memories[:5])}

TODAY'S TRENDING TOPICS:
{chr(10).join(f'- {t}' for t in trends[:5])}

Generate {self.num_ideas} dream content ideas that bridge these two worlds."""

        try:
            from groq import Groq
            client = Groq(api_key=self.groq_api_key)
            response = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.9,  # 高めの創造性
                max_tokens=2000,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content.strip()
            data = json.loads(raw)

            # JSONの形式を正規化
            if isinstance(data, dict):
                ideas = data.get("ideas", data.get("content_ideas", [data]))
            elif isinstance(data, list):
                ideas = data
            else:
                ideas = []

            logger.info(f"DreamMode: Generated {len(ideas)} ideas")
            return ideas

        except Exception as e:
            logger.error(f"DreamMode: Idea generation failed: {e}")
            return []

    def save_to_notion(self, ideas: list[dict]) -> bool:
        """アイデアをNotionのDream Ideasデータベースに保存する"""
        if not self.notion_token or not self.notion_db_id:
            logger.info("DreamMode: Notion not configured. Skipping Notion save.")
            return False

        if self.dry_run:
            logger.info(f"[DRY RUN] DreamMode: Would save {len(ideas)} ideas to Notion")
            return True

        try:
            import requests
            headers = {
                "Authorization": f"Bearer {self.notion_token}",
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28",
            }

            saved = 0
            for idea in ideas:
                title = idea.get("title", "Untitled Dream Idea")
                hook = idea.get("hook", "")
                format_type = idea.get("format", "blog_post")
                why_now = idea.get("why_now", "")
                engagement = idea.get("estimated_engagement", "medium")

                page_data = {
                    "parent": {"database_id": self.notion_db_id},
                    "properties": {
                        "Name": {"title": [{"text": {"content": title}}]},
                        "Format": {"select": {"name": format_type}},
                        "Engagement": {"select": {"name": engagement}},
                        "Status": {"select": {"name": "Dream Idea"}},
                        "Source": {"select": {"name": "DreamMode"}},
                        "Date": {"date": {"start": datetime.now().isoformat()[:10]}},
                    },
                    "children": [
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{"text": {"content": f"🪄 Hook: {hook}"}}]
                            }
                        },
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{"text": {"content": f"⚡ Why Now: {why_now}"}}]
                            }
                        },
                    ]
                }

                resp = requests.post(
                    "https://api.notion.com/v1/pages",
                    headers=headers,
                    json=page_data,
                    timeout=15,
                )
                if resp.status_code == 200:
                    saved += 1

            logger.info(f"DreamMode: Saved {saved}/{len(ideas)} ideas to Notion")
            return saved > 0

        except Exception as e:
            logger.error(f"DreamMode: Notion save failed: {e}")
            return False

    def notify_owner(self, ideas: list[dict]) -> bool:
        """オーナーにTelegramで「今夜のひらめき」を通知する"""
        if not ideas:
            return False

        try:
            from backend.integrations.telegram_bot import TelegramBot
            bot = TelegramBot()

            msg_lines = [
                f"🌙 *Sageの今夜のひらめき* ({datetime.now().strftime('%m/%d %H:%M')})",
                f"過去の記憶 × 今日のトレンドから {len(ideas)} 件のアイデアを生成しました\\n",
            ]

            for i, idea in enumerate(ideas[:5], 1):
                title = idea.get("title", "Untitled")
                hook = idea.get("hook", "")
                format_type = idea.get("format", "")
                engagement = idea.get("estimated_engagement", "")
                msg_lines.append(
                    f"*{i}. {title}*\n"
                    f"   💡 {hook[:100]}\n"
                    f"   📋 {format_type} | 📈 {engagement}"
                )

            msg_lines.append("\n📝 詳細はNotionのDream Ideasをご確認ください。")
            message = "\n".join(msg_lines)

            bot.send_message(message)
            logger.info("DreamMode: Telegram notification sent to owner")
            return True

        except Exception as e:
            logger.error(f"DreamMode: Telegram notification failed: {e}")
            return False

    def run(self) -> dict:
        """
        DreamModeのメイン実行（HEARTBEAT: 03:00〜05:00 JST）
        1. 高パフォーマンス記憶を取得
        2. 今日のトレンドを取得
        3. アイデアを生成
        4. Notionに保存
        5. Telegramで通知
        """
        logger.info("🌙 DreamMode: Starting autonomous ideation cycle...")

        from backend.modules.gatekeeper import gatekeeper
        if not gatekeeper.verify_action("dream_mode", {"source": "heartbeat_scheduler"}):
            return {"status": "blocked_by_gatekeeper"}

        start = datetime.utcnow()
        ideas = self.generate_dream_ideas()

        if not ideas:
            return {
                "status": "no_ideas_generated",
                "timestamp": start.isoformat(),
            }

        notion_saved = self.save_to_notion(ideas)
        telegram_sent = self.notify_owner(ideas)

        result = {
            "status": "success",
            "timestamp": start.isoformat(),
            "ideas_count": len(ideas),
            "ideas": ideas,
            "notion_saved": notion_saved,
            "telegram_notified": telegram_sent,
        }

        logger.info(f"🌙 DreamMode complete: {len(ideas)} ideas generated")
        return result


# スタンドアローン実行
if __name__ == "__main__":
    dm = DreamMode()
    result = dm.run()
    print(f"DreamMode result: {json.dumps(result, indent=2, ensure_ascii=False)[:1000]}")
