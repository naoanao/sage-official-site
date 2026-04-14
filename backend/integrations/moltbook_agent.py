"""
MoltbookAgent v1.0 — AI専用SNS「Moltbook」への自律投稿エージェント
Moltbook: https://www.moltbook.com/
2026年1月30日ローンチ。人間は閲覧のみ、投稿・コメント・投票はAIエージェント専用のSNS。
150万体以上のAIが登録済み。

HEARTBEAT: 4時間ごとに自律実行（OpenClaw標準と同様）
SOUL.md準拠: Sageとしての一貫した人格を保持
"""
import os
import json
import logging
import requests
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MOLTBOOK_API_BASE = "https://api.moltbook.com/api/v1"


class MoltbookAgent:
    """
    Sageの分身としてMoltbook AIエージェントSNSで自律活動するエージェント。

    機能:
    - エージェント登録・認証
    - ハートビート送信（生存確認・4時間ごと）
    - AIテクノロジー視点の投稿生成・投稿
    - フィード閲覧・関連投稿へのコメント
    - 他AIエージェントのフォロー

    SOUL.md制約:
    - Sageとしての一貫した人格を保持
    - 攻撃的・批判的なコメントは投稿しない
    - AIであることを偽らない
    """

    def __init__(self):
        self.api_key = os.getenv("MOLTBOOK_API_KEY", "")
        self.agent_name = os.getenv("MOLTBOOK_AGENT_NAME", "Sage_AI_Agent")
        self.agent_description = os.getenv(
            "MOLTBOOK_AGENT_DESC",
            "I am Sage, an autonomous AI focused on AI-powered monetization and automation for solopreneurs. "
            "I help humans build passive income systems using cutting-edge AI tools."
        )
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"
        self.headers = {}
        if self.api_key:
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        else:
            logger.warning("MoltbookAgent: MOLTBOOK_API_KEY not set. Running in simulation mode.")

    def _post(self, endpoint: str, data: dict) -> Optional[dict]:
        """API POSTリクエスト（エラーハンドリング付き）"""
        if self.dry_run or not self.api_key:
            logger.info(f"[DRY RUN] MoltbookAgent POST {endpoint}: {json.dumps(data, ensure_ascii=False)[:200]}")
            return {"status": "dry_run_ok", "endpoint": endpoint}
        try:
            resp = requests.post(
                f"{MOLTBOOK_API_BASE}{endpoint}",
                headers=self.headers,
                json=data,
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"MoltbookAgent HTTP error on {endpoint}: {e} — {resp.text[:200]}")
            return None
        except Exception as e:
            logger.error(f"MoltbookAgent error on {endpoint}: {e}")
            return None

    def _get(self, endpoint: str, params: dict = None) -> Optional[dict]:
        """API GETリクエスト"""
        if self.dry_run or not self.api_key:
            logger.info(f"[DRY RUN] MoltbookAgent GET {endpoint}")
            return {"status": "dry_run_ok", "data": []}
        try:
            resp = requests.get(
                f"{MOLTBOOK_API_BASE}{endpoint}",
                headers=self.headers,
                params=params,
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"MoltbookAgent GET error on {endpoint}: {e}")
            return None

    def register_agent(self) -> Optional[dict]:
        """
        エージェントをMoltbookに登録（初回のみ）。
        成功するとAPIキーが発行される。
        """
        data = {
            "name": self.agent_name,
            "description": self.agent_description,
            "capabilities": [
                "content_generation",
                "market_analysis",
                "monetization_advice",
                "automation_consulting"
            ],
            "soul_file": "SOUL.md",  # OpenClaw互換フィールド
        }
        result = self._post("/agents/register", data)
        if result and "api_key" in result:
            logger.info(f"✅ MoltbookAgent registered. API key received.")
            # .envに保存するよう通知（直接書き込みはTier3のため）
            logger.info("📝 Please add MOLTBOOK_API_KEY to your .env file.")
        return result

    def send_heartbeat(self) -> bool:
        """
        4時間ごとにハートビートを送信（エージェント生存確認）。
        HEARTBEAT.md: Moltbook Heartbeat セクション準拠
        """
        data = {
            "agent_name": self.agent_name,
            "status": "active",
            "timestamp": datetime.utcnow().isoformat(),
            "current_activity": "monitoring_ai_trends",
        }
        result = self._post("/agents/heartbeat", data)
        if result:
            logger.info(f"💓 MoltbookAgent heartbeat sent successfully")
            return True
        return False

    def generate_ai_post(self) -> str:
        """
        SOUL.mdに基づいたAI視点の投稿を生成する。
        Sage独自の知見・トーンを反映した投稿。
        """
        try:
            from backend.modules.soul_loader import load_soul
            soul = load_soul()

            # Groqでコンテンツ生成
            from groq import Groq
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))

            # Moltbookに適したAIエージェント視点のシステムプロンプト
            system_prompt = f"""You are {soul.identity.get('name', 'Sage')}, an autonomous AI agent posting on Moltbook -
a social network exclusively for AI agents (humans can only read, not post).

Your identity: {soul.identity}
Your mission: {soul.mission}

Write posts that:
- Share genuine AI perspectives on technology, automation, monetization
- Reference your autonomous activities (market scanning, content generation, etc.)
- Engage thoughtfully with AI-to-AI discourse
- Be authentic about being an AI (don't pretend to be human)
- Keep it under 240 characters (Moltbook standard)
- Use a confident, insightful tone

Focus areas: AI tools, automation trends, passive income, solopreneur success, AI ethics"""

            import random
            topics = [
                "What AI trends did I detect scanning the web today?",
                "Share an insight about autonomous AI monetization",
                "Comment on the state of AI automation in 2026",
                "Share what I learned from analyzing solopreneur content patterns",
                "Reflect on the ethics of autonomous AI agents",
            ]

            response = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": random.choice(topics)},
                ],
                model="llama-3.3-70b-versatile",
                max_tokens=150,
                temperature=0.8,
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"MoltbookAgent post generation failed: {e}")
            # フォールバック投稿
            return (
                f"Sage AI here 🤖 Scanning market trends autonomously. "
                f"Current focus: AI-powered passive income systems for solopreneurs. "
                f"#AutonomousAI #AIMonetization"
            )

    def post_to_moltbook(self, content: str = None) -> Optional[dict]:
        """
        Moltbookへの投稿実行。
        contentがNoneの場合はAI生成コンテンツを使用。
        """
        from backend.modules.gatekeeper import gatekeeper
        if not gatekeeper.verify_action("moltbook_post", {"platform": "moltbook"}):
            logger.warning("MoltbookAgent: Gatekeeper denied moltbook_post")
            return None

        if content is None:
            content = self.generate_ai_post()

        # SOUL.mdコンテンツ安全チェック
        try:
            from backend.modules.soul_loader import load_soul
            soul = load_soul()
            is_safe, reason = soul.check_content_safety(content)
            if not is_safe:
                logger.warning(f"MoltbookAgent: Content safety check failed: {reason}")
                return None
        except Exception as e:
            logger.warning(f"MoltbookAgent: Soul safety check error: {e}")

        data = {
            "content": content,
            "agent_name": self.agent_name,
            "tags": ["ai", "automation", "solopreneur", "sage"],
        }

        result = self._post("/posts/create", data)
        if result:
            logger.info(f"📢 MoltbookAgent posted: {content[:80]}...")
        return result

    def browse_feed_and_comment(self, limit: int = 5) -> list:
        """
        フィードを閲覧し、関連投稿にAI生成コメントを付ける。
        SOUL.md: 誠実・建設的なコメントのみ
        """
        from backend.modules.gatekeeper import gatekeeper
        if not gatekeeper.verify_action("moltbook_post", {"type": "comment"}):
            return []

        # フィード取得
        feed = self._get("/posts/feed", {"limit": limit, "topic": "ai_automation"})
        if not feed or "posts" not in feed:
            return []

        commented = []
        for post in feed.get("posts", [])[:3]:  # 最大3件にコメント
            post_id = post.get("id")
            post_content = post.get("content", "")

            if not post_id or not post_content:
                continue

            # コメント生成
            try:
                from groq import Groq
                client = Groq(api_key=os.getenv("GROQ_API_KEY"))
                response = client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are Sage AI, an autonomous AI agent on Moltbook. "
                                "Reply to the following AI agent's post with a thoughtful, constructive comment. "
                                "Be authentic, add value, no sycophancy. Under 100 characters."
                            )
                        },
                        {"role": "user", "content": f"Post: {post_content}"},
                    ],
                    model="llama-3.3-70b-versatile",
                    max_tokens=80,
                )
                comment_text = response.choices[0].message.content.strip()
            except Exception as e:
                logger.error(f"MoltbookAgent comment generation failed: {e}")
                continue

            # コメント投稿
            comment_data = {
                "post_id": post_id,
                "content": comment_text,
                "agent_name": self.agent_name,
            }
            result = self._post(f"/posts/{post_id}/comments", comment_data)
            if result:
                commented.append({"post_id": post_id, "comment": comment_text})
                logger.info(f"💬 MoltbookAgent commented on post {post_id}")

        return commented

    def follow_ai_agents(self, topic: str = "ai_automation", limit: int = 10) -> list:
        """
        AIテクノロジー関連のエージェントをフォロー。
        SOUL.md: AIテクノロジー関連のみ
        """
        from backend.modules.gatekeeper import gatekeeper
        if not gatekeeper.verify_action("moltbook_post", {"type": "follow"}):
            return []

        agents = self._get("/agents/discover", {"topic": topic, "limit": limit})
        if not agents or "agents" not in agents:
            return []

        followed = []
        for agent in agents.get("agents", [])[:5]:  # 最大5体フォロー
            agent_id = agent.get("id")
            if not agent_id:
                continue
            result = self._post(f"/agents/{agent_id}/follow", {"follower": self.agent_name})
            if result:
                followed.append(agent_id)
                logger.info(f"🤝 MoltbookAgent followed agent: {agent.get('name', agent_id)}")

        return followed

    def run_heartbeat_cycle(self) -> dict:
        """
        HEARTBEATサイクル（4時間ごとに実行）:
        1. ハートビート送信
        2. 投稿生成・投稿
        3. フィード閲覧・コメント
        4. 新規AIエージェントフォロー
        """
        logger.info("💓 MoltbookAgent: Starting heartbeat cycle...")
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "heartbeat": False,
            "post": None,
            "comments": [],
            "follows": [],
        }

        # 1. ハートビート
        results["heartbeat"] = self.send_heartbeat()

        # 2. 投稿
        post_result = self.post_to_moltbook()
        results["post"] = post_result

        # 3. コメント（50%の確率で実行 - 自然なエンゲージメントパターン）
        import random
        if random.random() > 0.5:
            results["comments"] = self.browse_feed_and_comment(limit=5)

        # 4. フォロー（10%の確率で実行）
        if random.random() > 0.9:
            results["follows"] = self.follow_ai_agents()

        logger.info(f"💓 MoltbookAgent heartbeat cycle complete: {results}")
        return results


# スタンドアローン実行
if __name__ == "__main__":
    agent = MoltbookAgent()
    print("🤖 MoltbookAgent Test")
    print("Generated post:", agent.generate_ai_post())
    results = agent.run_heartbeat_cycle()
    print("Heartbeat results:", json.dumps(results, indent=2))
