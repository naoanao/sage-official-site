"""
Sage Self-Test Scheduler — 毎朝7時(JST) = UTC 22:00 に自動実行

動作:
  1. SageSelfTester.run_full_test() を呼び出す
  2. Tier 1 API + Tier 2 Browser Use UIフローを検証
  3. 結果を logs/self_test/YYYY-MM-DD.json に保存
  4. Telegram に通知 (SAGE_ENABLE_TELEGRAM=1 時)

ゲート:
  SAGE_ENABLE_SELF_TEST=1 が設定されている場合のみ実行

連携:
  flask_server.py の automation threads に "self_test" スレッドとして登録される
"""

import logging
import os
import time
from datetime import datetime, timezone

logger = logging.getLogger("SelfTestScheduler")


class SelfTestScheduler:
    def __init__(self) -> None:
        self.enabled = os.getenv("SAGE_ENABLE_SELF_TEST", "0") == "1"
        logger.info(f"[SELF_TEST] SelfTestScheduler initialized. enabled={self.enabled}")

    def run_once(self) -> None:
        """テストを1回実行して結果を保存・通知する。"""
        if not self.enabled:
            logger.info("[SELF_TEST] SAGE_ENABLE_SELF_TEST is not 1. Skipping.")
            return

        from backend.agents.self_test_agent import SageSelfTester

        logger.info("[SELF_TEST] run_once() started.")
        try:
            tester = SageSelfTester()
            result = tester.run_full_test()
            overall = result.get("overall", "?")
            duration = result.get("duration_sec", 0)
            logger.info(f"[SELF_TEST] ✅ Completed. overall={overall} ({duration}s)")
        except Exception as e:
            logger.error(f"[SELF_TEST] run_once() failed: {e}")

    def run(self) -> None:
        """
        バックグラウンドループ: JST 07:00 (UTC 22:00) に毎日実行。
        flask_server.py のスレッドから呼ばれる。
        """
        logger.info("[SELF_TEST] Background loop started.")
        while True:
            try:
                now_utc = datetime.now(timezone.utc)
                if now_utc.hour == 22 and now_utc.minute < 5:
                    self.run_once()
                    time.sleep(300)  # 同一時間帯での二重実行を防ぐ
                else:
                    time.sleep(60)
            except Exception as e:
                logger.error(f"[SELF_TEST] Loop error: {e}")
                time.sleep(60)
