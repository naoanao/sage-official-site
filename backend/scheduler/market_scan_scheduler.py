"""
Market Scan Scheduler — 毎朝6時(JST) = UTC 21:00 に自動実行

動作:
  1. MarketScanAgent.run_scan() を呼び出す
  2. 結果を backend/data/market_scans.json に保存
  3. トップ3機会をログ出力（将来: Notion/Slack通知）

連携:
  flask_server.py の _automation_threads に "market_scan" スレッドとして登録される
"""

import logging
import os
import time
from datetime import datetime, timezone

logger = logging.getLogger("MarketScanScheduler")


class MarketScanScheduler:
    def __init__(self) -> None:
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        logger.info(f"[MARKET_SCAN] MarketScanScheduler initialized. dry_run={self.dry_run}")

    def run_once(self) -> None:
        """スキャンを1回実行して結果を保存する。"""
        from backend.agents.market_scan_agent import MarketScanAgent
        from backend.data.market_scan_store import append_scan

        logger.info("[MARKET_SCAN] run_once() started.")

        try:
            agent = MarketScanAgent()
            result = agent.run_scan()
            append_scan(result)

            opportunities = result.get("opportunities", [])
            total = result.get("total_signals", 0)
            logger.info(
                f"[MARKET_SCAN] ✅ Saved. total_signals={total}, "
                f"opportunities={len(opportunities)}"
            )

            # トップ3をログ出力
            for i, opp in enumerate(opportunities[:3], 1):
                logger.info(
                    f"[MARKET_SCAN] #{i} [{opp.get('total_score', 0):.1f}] "
                    f"{opp.get('keyword', '?')} — {opp.get('product_idea', '')}"
                )

        except Exception as e:
            logger.error(f"[MARKET_SCAN] run_once() failed: {e}")

    def run(self) -> None:
        """
        バックグラウンドループ: JST 06:00 (UTC 21:00) に毎日実行。
        flask_server.py のスレッドから呼ばれる。
        """
        logger.info("[MARKET_SCAN] Background loop started.")
        while True:
            try:
                now_utc = datetime.now(timezone.utc)
                if now_utc.hour == 21 and now_utc.minute < 5:
                    self.run_once()
                    time.sleep(300)  # 同一時間帯での二重実行を防ぐ
                else:
                    time.sleep(60)
            except Exception as e:
                logger.error(f"[MARKET_SCAN] Loop error: {e}")
                time.sleep(60)
