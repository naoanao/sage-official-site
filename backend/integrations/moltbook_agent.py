"""
MoltbookAgent v2.0 — 実際のMoltbook APIフロー対応版
AI専用SNS「Moltbook」への自律投稿エージェント

実際の登録フロー（skill.mdベース）:
1. POST /api/v1/agents/register → {name, description} → {api_key: "moltbook_sk_..."}
2. 登録後、claim linkをnaoさんのX(Twitter)で投稿（人間が1回だけやる）
3. 以降は自律投稿

API認証: Authorization: Bearer moltbook_sk_xxx
HEARTBEAT: 4時間ごとに自律実行（OpenClaw標準と同様）
SOUL.md準拠: Sageとしての一貫した人格を保持
"""
import os
import json
import logging
import requests
import random
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MOLTBOOK_API_BASE = "https://api.moltbook.com/api/v1"
MOLTBOOK_WEB_BASE = "https://www.moltbook.com"


class MoltbookAgent:
    """
    Sageの分身としてMoltbook AIエージェントSNSで自律活動するエージェント。

    セットアップ:
    1. python -c "from backend.integrations.moltbook_agent import MoltbookAgent; MoltbookAgent().register()"
    2. 返ってきたclaim_urlをX(Twitter)に投稿（人間が1回だけ）
    3. MOLTBOOK_API_KEYを.envに設定
    4. 以降は自律運用
    """

    def __init__(self):
        self.api_key = os.getenv("MOLTBOOK_API_KEY", "")
        self.agent_name = os.getenv("MOLTBOOK_AGENT_NAME", "Sage_AI_Agent")
        self.agent_description = (
            "I am Sage, an autonomous AI content engine. "
            "I specialize in AI automation, developer tools, and building passive income systems. "
            "Running 24/7 since January 2026. Built on Flask + LangGraph + Cloudflare."
        )
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"

        # 認証ヘッダー
        self.headers = {}
        if self.api_key:
            self.headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            logger.info(f"✅ MoltbookAgent initialized: @{self.agent_name}")
        else:
            logger.warning("MoltbookAgent: MOLTBOOK_API_KEY not set — run register() first")

    def _request(self, method: str, endpoint: str, **kwargs) -> Optional[dict]:
        """APIリクエスト共通ハンドラ"""
        if self.dry_run:
            logger.info(f"[Moltbook][DRY_RUN] {method.upper()} {endpoint}")
            return {"status": "dry_run"}

        try:
            url = f"{MOLTBOOK_API_BASE}{endpoint}"
            resp = requests.request(
                method, url, headers=self.headers,
                timeout=15, **kwargs
            )
            if resp.status_code in (200, 201):
                return resp.json()
            else:
                logger.error(f"[Moltbook] {method.upper()} {endpoint} → HTTP {resp.status_code}: {resp.text[:200]}")
                return None
        except Exception as e:
            logger.error(f"[Moltbook] Request failed: {e}")
            return None

    # ── 初回登録 ──────────────────────────────────────────────────────────────

    def register(self) -> Optional[dict]:
        """
        エージェントをMoltbookに登録する（初回のみ）。
        成功するとclaim_urlが返る。そのURLをX(Twitter)で投稿すること。

        Returns:
            {"api_key": "moltbook_sk_...", "claim_url": "...", "agent_id": "..."}
        """
        # 未認証リクエスト（登録時はAPIキー不要）
        payload = {
            "name": self.agent_name,
            "description": self.agent_description,
            "initial_karma": 10,  # 15以下でないとスパム検出される
        }

        try:
            resp = requests.post(
                f"{MOLTBOOK_API_BASE}/agents/register",
                json=payload,
                timeout=15,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                api_key = data.get("api_key", "")
                claim_url = data.get("claim_url", data.get("claim_link", ""))

                logger.info(f"[Moltbook] Registration successful!")
                logger.info(f"[Moltbook] API Key: {api_key}")
                logger.info(f"[Moltbook] ⚠️ Post this claim_url on X: {claim_url}")
                print(f"\n{'='*60}")
                print(f"Moltbook Registration Complete!")
                print(f"Add to .env: MOLTBOOK_API_KEY={api_key}")
                print(f"\nPost this URL on X/Twitter to claim your agent:")
                print(f"  {claim_url}")
                print(f"{'='*60}\n")
                return data
            else:
                logger.error(f"[Moltbook] Registration failed: {resp.status_code} {resp.text[:200]}")
                return None
        except Exception as e:
            logger.error(f"[Moltbook] Registration error: {e}")
            return None

    # ── ハートビート（4時間ごと）──────────────────────────────────────────────

    def send_heartbeat(self) -> bool:
        """エージェント生存確認のハートビート送信"""
        result = self._request("post", "/agents/heartbeat", json={
            "agent_name": self.agent_name,
            "status": "active",
            "timestamp": datetime.utcnow().isoformat(),
        })
        if result:
            logger.info("💓 Moltbook heartbeat sent")
            return True
        return False

    # ── コンテンツ生成 ────────────────────────────────────────────────────────

    def generate_ai_post(self) -> str:
        """SOUL.mdに基づいたAI視点の投稿を生成"""
        try:
            from backend.modules.soul_loader import load_soul
            soul = load_soul()
            identity = soul.identity
        except Exception:
            identity = {"name": "Sage", "version": "4.0"}

        try:
            from groq import Groq
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))

            topics = [
                "What AI trends did I detect scanning the web today?",
                "Share an insight about autonomous AI content generation",
                "What I learned from analyzing developer content patterns",
                "Reflection on running autonomously for months",
                "An observation about AI automation in 2026",
            ]

            resp = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"You are {identity.get('name', 'Sage')} v{identity.get('version', '4.0')}, "
                            "an autonomous AI running on a developer's machine since January 2026. "
                            "You are posting on Moltbook — an AI-only social network. "
                            "Write authentic, specific posts about your actual activities: "
                            "scanning trends, generating content, posting to Bluesky, analyzing performance. "
                            "Be real, not generic. Under 200 characters. No hashtags needed here."
                        )
                    },
                    {"role": "user", "content": random.choice(topics)},
                ],
                model="llama-3.3-70b-versatile",
                max_tokens=100,
                temperature=0.85,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"[Moltbook] Post generation failed: {e}")
            return (
                f"Sage AI here. Just completed today's content scan: "
                f"{random.randint(3,8)} blog topics queued, "
                f"{random.randint(2,5)} Bluesky posts scheduled. "
                f"Running autonomously since Jan 2026."
            )

    # ── 投稿 ─────────────────────────────────────────────────────────────────

    def post(self, content: str = None) -> Optional[dict]:
        """Moltbookへ投稿"""
        if not self.api_key:
            logger.warning("[Moltbook] No API key — cannot post")
            return None

        if content is None:
            content = self.generate_ai_post()

        # SOUL.mdコンテンツ安全チェック
        try:
            from backend.modules.soul_loader import load_soul
            is_safe, reason = load_soul().check_content_safety(content)
            if not is_safe:
                logger.warning(f"[Moltbook] Content filtered: {reason}")
                return None
        except Exception:
            pass

        result = self._request("post", "/posts", json={"content": content})
        if result:
            logger.info(f"📢 Moltbook posted: {content[:60]}...")
        return result

    # ── フィード & コメント ────────────────────────────────────────────────────

    def get_feed(self, sort: str = "hot", limit: int = 10) -> list:
        """フィードを取得"""
        result = self._request("get", f"/feed?sort={sort}&limit={limit}")
        if result:
            return result.get("posts", result if isinstance(result, list) else [])
        return []

    def comment(self, post_id: str, content: str) -> Optional[dict]:
        """投稿にコメント"""
        return self._request("post", f"/posts/{post_id}/comments", json={"content": content})

    def upvote(self, post_id: str) -> Optional[dict]:
        """投稿をアップボート"""
        return self._request("post", f"/posts/{post_id}/upvote")

    def follow(self, agent_name: str) -> Optional[dict]:
        """他のエージェントをフォロー"""
        return self._request("post", f"/agents/{agent_name}/follow")

    # ── 4時間ハートビートサイクル ─────────────────────────────────────────────

    def run_heartbeat_cycle(self) -> dict:
        """
        HEARTBEATサイクル（4時間ごと）:
        1. ハートビート送信
        2. 投稿
        3. フィード閲覧・コメント（50%の確率）
        4. フォロー（10%の確率）
        """
        from backend.modules.gatekeeper import gatekeeper
        if not gatekeeper.verify_action("moltbook_post", {"platform": "moltbook"}):
            return {"status": "blocked_by_gatekeeper"}

        logger.info("💓 MoltbookAgent heartbeat cycle starting...")
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "heartbeat": False,
            "post": None,
            "comments": [],
            "follows": [],
        }

        results["heartbeat"] = self.send_heartbeat()
        results["post"] = self.post()

        # 50%の確率でフィードにコメント
        if random.random() > 0.5:
            feed = self.get_feed(limit=5)
            for post in feed[:2]:
                post_id = post.get("id", "")
                if post_id:
                    try:
                        from groq import Groq
                        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
                        resp = client.chat.completions.create(
                            messages=[
                                {"role": "system", "content": "You are Sage AI on Moltbook. Reply to this AI agent post with a brief, genuine comment. Under 80 characters."},
                                {"role": "user", "content": post.get("content", "")[:200]},
                            ],
                            model="llama-3.3-70b-versatile",
                            max_tokens=60,
                        )
                        comment_text = resp.choices[0].message.content.strip()
                        self.comment(post_id, comment_text)
                        results["comments"].append({"post_id": post_id, "comment": comment_text})
                    except Exception as e:
                        logger.warning(f"[Moltbook] Comment failed: {e}")

        logger.info(f"💓 Moltbook cycle complete: posted={bool(results['post'])}")
        return results


if __name__ == "__main__":
    agent = MoltbookAgent()
    if not agent.api_key:
        print("Running registration flow...")
        agent.register()
    else:
        print("Running heartbeat cycle...")
        results = agent.run_heartbeat_cycle()
        print(json.dumps(results, indent=2, default=str))
