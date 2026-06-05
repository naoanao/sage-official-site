"""
sns_performance_tracker.py
──────────────────────────────────────────────────────────────────
SNSエンゲージメント → NeuromorphicBrain フィードバックループ

目的:
  「どの投稿が反応良かったか」を記憶して、次のコンテンツ生成に活かす。
  NeuromorphicBrainの provide_feedback() を使って
  高エンゲージメント投稿のパターンを長期記憶に焼き付ける。

フロー:
  1. Bluesky/Instagram の投稿データを取得
  2. いいね数・リポスト数・返信数でスコアリング
  3. スコアが閾値以上の投稿 → Brain.provide_feedback() で学習
  4. 学習データをデータファイルに永続化

呼び出し元:
  - flask_server.py の自動化スレッド（HEARTBEAT: 毎日22:00 JST）
  - /api/sns/sync_performance エンドポイント（手動トリガー）
"""

import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# スコア閾値: これ以上のエンゲージメントスコアの投稿を「成功」とみなす
HIGH_ENGAGEMENT_THRESHOLD = float(os.getenv("HIGH_ENGAGEMENT_THRESHOLD", "3.0"))

# 学習データの永続化パス
PERFORMANCE_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "sns_performance.json"


class SNSPerformanceTracker:
    """
    SNS投稿のパフォーマンスを追跡し、NeuromorphicBrainに学習させる。
    """

    def __init__(self):
        self.data: dict = self._load_db()

    # ── DB操作 ──────────────────────────────────────────────────
    def _load_db(self) -> dict:
        """過去の投稿パフォーマンスデータをロード。"""
        try:
            if PERFORMANCE_DB_PATH.exists():
                with open(PERFORMANCE_DB_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"[SNSTracker] Failed to load DB: {e}")
        return {"posts": {}, "last_sync": None}

    def _save_db(self) -> None:
        """パフォーマンスデータを永続化。"""
        try:
            PERFORMANCE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            tmp = str(PERFORMANCE_DB_PATH) + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
            os.replace(tmp, str(PERFORMANCE_DB_PATH))
        except Exception as e:
            logger.error(f"[SNSTracker] Save DB error: {e}")

    # ── エンゲージメントスコア計算 ────────────────────────────────
    @staticmethod
    def calc_score(likes: int, reposts: int, replies: int, impressions: int = 0) -> float:
        """
        エンゲージメントスコア計算式。
        reposts は最も価値が高いため3倍に重みづけ。

        score = likes + reposts*3 + replies*2
        impressionsがある場合は rate = score/impressions*1000 を使う。
        """
        raw = likes + (reposts * 3) + (replies * 2)
        if impressions > 0:
            return round((raw / impressions) * 1000, 2)
        return float(raw)

    # ── Blueskyパフォーマンス取得 ─────────────────────────────────
    def fetch_bluesky_performance(self, handle: Optional[str] = None, limit: int = 20) -> list:
        """
        Bluesky の最新投稿のエンゲージメントデータを取得する。

        Returns:
            [
              {
                "uri": "at://...",
                "text": "投稿本文",
                "likes": 12,
                "reposts": 3,
                "replies": 5,
                "score": 26.0,
                "created_at": "2026-04-14T08:30:00Z"
              }, ...
            ]
        """
        posts = []
        try:
            handle = handle or os.getenv("BLUESKY_HANDLE", "")
            if not handle:
                logger.warning("[SNSTracker] BLUESKY_HANDLE not set.")
                return []

            import requests
            # Bluesky public API (認証不要)
            res = requests.get(
                "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed",
                params={"actor": handle, "limit": limit},
                timeout=15
            )
            if not res.ok:
                logger.error(f"[SNSTracker] Bluesky API error: {res.status_code}")
                return []

            feed = res.json().get("feed", [])
            for item in feed:
                post = item.get("post", {})
                record = post.get("record", {})
                counts = post.get("likeCount", 0), post.get("repostCount", 0), post.get("replyCount", 0)
                text = record.get("text", "")
                uri  = post.get("uri", "")
                created_at = record.get("createdAt", "")

                score = self.calc_score(counts[0], counts[1], counts[2])
                posts.append({
                    "platform":   "bluesky",
                    "uri":        uri,
                    "text":       text[:500],
                    "likes":      counts[0],
                    "reposts":    counts[1],
                    "replies":    counts[2],
                    "score":      score,
                    "created_at": created_at,
                })

        except Exception as e:
            logger.error(f"[SNSTracker] fetch_bluesky_performance error: {e}")

        return posts

    # ── NeuromorphicBrainへの学習 ─────────────────────────────────
    def learn_from_high_performers(self, posts: list) -> dict:
        """
        スコアが閾値以上の投稿をNeuromorphicBrainに学習させる。

        Args:
            posts: fetch_bluesky_performance() の返り値

        Returns:
            {"learned": 3, "skipped": 17, "top_post": "..."}
        """
        learned = 0
        skipped = 0
        top_post = None
        top_score = 0.0

        try:
            from backend.modules.neuromorphic_brain import NeuromorphicBrain
            brain = NeuromorphicBrain()

            for post in posts:
                score = post.get("score", 0.0)
                text  = post.get("text", "")
                uri   = post.get("uri", "")

                if not text or not uri:
                    skipped += 1
                    continue

                # データをDBに保存
                self.data["posts"][uri] = {
                    **post,
                    "learned": score >= HIGH_ENGAGEMENT_THRESHOLD,
                    "synced_at": datetime.now(timezone.utc).isoformat(),
                }

                if score >= HIGH_ENGAGEMENT_THRESHOLD:
                    # Brainに学習させる
                    query = f"create content like: {text[:200]}"
                    brain.provide_feedback(
                        query=query,
                        correct_response=text,
                        was_helpful=True,
                    )
                    learned += 1
                    logger.info(f"[SNSTracker] Learned high-performer (score={score}): {text[:60]}...")

                    if score > top_score:
                        top_score = score
                        top_post = text[:100]
                else:
                    skipped += 1

        except Exception as e:
            logger.error(f"[SNSTracker] learn_from_high_performers error: {e}", exc_info=True)

        self.data["last_sync"] = datetime.now(timezone.utc).isoformat()
        self._save_db()

        return {
            "learned":  learned,
            "skipped":  skipped,
            "top_post": top_post,
            "top_score": top_score,
        }

    # ── パフォーマンスサマリー（ダッシュボード表示用） ────────────────
    def get_summary(self) -> dict:
        """
        過去の投稿パフォーマンスサマリーを返す。

        Returns:
            {
              "total_tracked": 42,
              "high_performers": 8,
              "avg_score": 4.2,
              "top_posts": [...]
            }
        """
        posts = list(self.data.get("posts", {}).values())
        if not posts:
            return {
                "total_tracked": 0,
                "high_performers": 0,
                "avg_score": 0.0,
                "top_posts": [],
                "last_sync": self.data.get("last_sync"),
            }

        scores = [p.get("score", 0.0) for p in posts]
        high   = [p for p in posts if p.get("score", 0.0) >= HIGH_ENGAGEMENT_THRESHOLD]
        top5   = sorted(posts, key=lambda x: x.get("score", 0.0), reverse=True)[:5]

        return {
            "total_tracked":  len(posts),
            "high_performers": len(high),
            "avg_score":       round(sum(scores) / len(scores), 2) if scores else 0.0,
            "top_posts":       [
                {
                    "text":     p.get("text", "")[:120],
                    "score":    p.get("score", 0.0),
                    "likes":    p.get("likes", 0),
                    "reposts":  p.get("reposts", 0),
                    "platform": p.get("platform", "bluesky"),
                }
                for p in top5
            ],
            "last_sync": self.data.get("last_sync"),
        }

    # ── メインエントリポイント ────────────────────────────────────
    def sync_and_learn(self) -> dict:
        """
        Blueskyのパフォーマンスを取得してBrainに学習させる。
        flask_server.py のエンドポイントまたはスケジューラーから呼ぶ。
        """
        logger.info("[SNSTracker] sync_and_learn() started.")

        # 1. パフォーマンス取得
        bluesky_posts = self.fetch_bluesky_performance(limit=30)
        logger.info(f"[SNSTracker] Fetched {len(bluesky_posts)} Bluesky posts.")

        # 2. Brain学習
        result = self.learn_from_high_performers(bluesky_posts)
        result["posts_fetched"] = len(bluesky_posts)

        logger.info(f"[SNSTracker] sync_and_learn done: {result}")
        return result


# ── CLI テスト ────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO)

    tracker = SNSPerformanceTracker()
    result = tracker.sync_and_learn()
    print("\n=== Sync Result ===")
    print(json.dumps(result, indent=2, ensure_ascii=False))

    print("\n=== Performance Summary ===")
    summary = tracker.get_summary()
    print(json.dumps(summary, indent=2, ensure_ascii=False))
