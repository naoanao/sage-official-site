"""
dream_scheduler.py
──────────────────────────────────────────────────────────────────
HEARTBEAT.md 定義: 03:00〜05:00 JST（UTC 18:00〜20:00）に実行

動作:
  1. 前日の高エンゲージメントコンテンツパターンを記憶から取得
  2. リアルタイムトレンドと融合してコンテンツアイデアを5件生成
  3. Notionの「Dream Ideas」データベースに自動追記
  4. TelegramでオーナーにAM3時の「ひらめき通知」を送信

flask_server.py の _automation_threads に "dream" スレッドとして登録される。
run_sage.ps1 起動時に自動でスレッドが立ち上がる。
"""

import logging
import os
import time
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("DreamScheduler")

# JST = UTC+9
JST = timezone(timedelta(hours=9))
DREAM_HOUR_JST = 3   # 03:00 JST に実行


class DreamScheduler:
    """毎晩03:00 JSTにDreamModeを起動するスケジューラー。"""

    def __init__(self) -> None:
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        self.enabled = os.getenv("DREAM_MODE_ENABLED", "true").lower() == "true"
        logger.info(
            f"[DREAM] DreamScheduler initialized. enabled={self.enabled} dry_run={self.dry_run}"
        )

    def _seconds_until_next_dream(self) -> float:
        """次の03:00 JSTまでの秒数を返す。"""
        now_jst = datetime.now(JST)
        target = now_jst.replace(hour=DREAM_HOUR_JST, minute=0, second=0, microsecond=0)
        if now_jst >= target:
            target += timedelta(days=1)
        delta = (target - now_jst).total_seconds()
        return delta

    def run_once(self) -> dict:
        """DreamModeを1回だけ実行して結果を返す（手動トリガー用）。"""
        logger.info("[DREAM] run_once() called.")
        try:
            from backend.modules.dream_mode import DreamMode
            dm = DreamMode()
            result = dm.run()
            logger.info(f"[DREAM] Completed. ideas_generated={result.get('ideas_count', 0)}")
            return result
        except Exception as e:
            logger.error(f"[DREAM] run_once() failed: {e}", exc_info=True)
            return {"error": str(e)}

    def run_loop(self) -> None:
        """
        バックグラウンドループ。
        毎晩03:00 JSTを待ってDreamModeを起動する。

        flask_server.py から threading.Thread(target=scheduler.run_loop) で呼ばれる。
        """
        if not self.enabled:
            logger.info("[DREAM] DreamScheduler disabled via DREAM_MODE_ENABLED=false")
            return

        logger.info("[DREAM] DreamScheduler loop started. Waiting for 03:00 JST...")

        while True:
            wait_sec = self._seconds_until_next_dream()
            now_jst  = datetime.now(JST)
            logger.info(
                f"[DREAM] Next run at {(now_jst + timedelta(seconds=wait_sec)).strftime('%Y-%m-%d %H:%M JST')} "
                f"(in {wait_sec/3600:.1f}h)"
            )

            # ── 待機（60秒ごとにSTOPチェック） ────────────────────
            elapsed = 0
            while elapsed < wait_sec:
                # SAGE_STOP ファイルチェック
                if os.path.exists("SAGE_STOP"):
                    logger.warning("[DREAM] SAGE_STOP detected. Loop exiting.")
                    return
                sleep_chunk = min(60, wait_sec - elapsed)
                time.sleep(sleep_chunk)
                elapsed += sleep_chunk

            # ── 実行 ──────────────────────────────────────────────
            logger.info(f"[DREAM] 03:00 JST! Starting DreamMode...")
            try:
                result = self.run_once()
                logger.info(f"[DREAM] Done: {result}")
            except Exception as e:
                logger.error(f"[DREAM] Error in run_once: {e}", exc_info=True)

            # 実行後60秒待って次のループへ（同日の二重実行を防ぐ）
            time.sleep(60)
