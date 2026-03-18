"""
SelfTestScheduler — Sage OODA ループ自己診断スケジューラー

スケジュール:
  Tier 1 : 起動時 + 30 分ごと（軽量ユニットテスト）
  Tier 2 : 2 時間ごと（統合テスト、フロントエンド起動が前提）
  Tier 3 : 24 時間ごと（E2E OODA ループ、重テスト）

flask_server.py の _automation_threads に "self_test" として登録される。
"""

import logging
import os
import time
from datetime import datetime, timezone

logger = logging.getLogger("SelfTestScheduler")

# インターバル (秒)
_TIER1_INTERVAL_SEC = int(os.getenv("SAGE_SELF_TEST_TIER1_INTERVAL", 1800))   # 30 min
_TIER2_INTERVAL_SEC = int(os.getenv("SAGE_SELF_TEST_TIER2_INTERVAL", 7200))   # 2 h
_TIER3_INTERVAL_SEC = int(os.getenv("SAGE_SELF_TEST_TIER3_INTERVAL", 86400))  # 24 h


class SelfTestScheduler:
    """Tier 1 / 2 / 3 の自己診断を定期実行するスケジューラー。"""

    def __init__(self) -> None:
        self._last_tier1: float = 0.0
        self._last_tier2: float = 0.0
        self._last_tier3: float = 0.0
        logger.info(
            "[SELF_TEST_SCHED] Initialized. Intervals → T1:%ds T2:%ds T3:%ds",
            _TIER1_INTERVAL_SEC,
            _TIER2_INTERVAL_SEC,
            _TIER3_INTERVAL_SEC,
        )

    # ─────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────

    def run_once(self) -> None:
        """現在時刻を見て、期限切れの Tier を実行する。"""
        from backend.agents.self_test_agent import SelfTestAgent

        now = time.monotonic()
        agent = SelfTestAgent()

        if now - self._last_tier1 >= _TIER1_INTERVAL_SEC:
            self._execute_tier(agent, 1)
            self._last_tier1 = now

        if now - self._last_tier2 >= _TIER2_INTERVAL_SEC:
            self._execute_tier(agent, 2)
            self._last_tier2 = now

        if now - self._last_tier3 >= _TIER3_INTERVAL_SEC:
            self._execute_tier(agent, 3)
            self._last_tier3 = now

    def run(self) -> None:
        """
        バックグラウンドループ。
        flask_server.py のスレッドから daemon=True で呼ばれる。
        """
        logger.info("[SELF_TEST_SCHED] Background loop started.")

        # 起動直後に Tier 1 を即時実行
        try:
            from backend.agents.self_test_agent import SelfTestAgent
            agent = SelfTestAgent()
            self._execute_tier(agent, 1)
            self._last_tier1 = time.monotonic()
        except Exception as e:
            logger.error("[SELF_TEST_SCHED] Startup Tier 1 failed: %s", e)

        while True:
            try:
                self.run_once()
                time.sleep(60)  # 1 分ごとに期限チェック
            except Exception as e:
                logger.error("[SELF_TEST_SCHED] Loop error: %s", e)
                time.sleep(60)

    # ─────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────

    def _execute_tier(self, agent, tier: int) -> None:
        """指定 Tier を実行し、結果をログに出力する。"""
        try:
            if tier == 1:
                report = agent.run_tier1()
            elif tier == 2:
                report = agent.run_tier2()
            else:
                report = agent.run_tier3()

            s = report["summary"]
            status_icon = "✅" if s["fail"] == 0 else "❌"
            logger.info(
                "[SELF_TEST] %s Tier %d → PASS:%d FAIL:%d SKIP:%d (ran_at=%s)",
                status_icon,
                tier,
                s["pass"],
                s["fail"],
                s["skip"],
                report["ran_at"],
            )

            # 失敗テストを個別に警告ログへ
            for t in report["tests"]:
                if t["status"] == "FAIL":
                    logger.warning(
                        "[SELF_TEST] Tier %d FAIL — %s: %s",
                        tier,
                        t["name"],
                        t.get("reason", ""),
                    )

        except Exception as e:
            logger.error("[SELF_TEST_SCHED] _execute_tier(%d) raised: %s", tier, e)
