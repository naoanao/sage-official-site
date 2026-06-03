import os
import logging
import time
from datetime import datetime

from backend.data.jobs_store import load as _jobs_load, save as _jobs_save

logger = logging.getLogger("SageJobRunner")


class SageJobRunner:
    """
    Sage SNS Job Runner: Processes pending jobs from jobs.json.
    Runs as a background worker thread (called via runner.run()).
    """

    POLL_INTERVAL = 300  # check every 5 minutes

    def __init__(self):
        from backend.integrations.instagram_integration import InstagramBot
        from backend.integrations.bluesky_agent import BlueskyAgent

        self.instagram = InstagramBot()
        self.bluesky = BlueskyAgent()
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        logger.info(f"[JOB] SageJobRunner initialized. dry_run={self.dry_run}")

    def _load_jobs(self) -> list:
        return _jobs_load()

    def _save_jobs(self, jobs: list) -> None:
        _jobs_save(jobs)

    def _process_job(self, job: dict) -> bool:
        """Execute a single pending job. Returns True on success."""
        job_id = job.get("id", "?")
        ig_caption = job.get("ig_caption", "")
        bs_text = job.get("bs_text", "")
        image_path = job.get("image_path") or None

        # Skip dry-run placeholder images
        if image_path == "[DRY_RUN_NO_IMAGE]":
            image_path = None

        logger.info(f"[JOB] Processing job: {job_id}")

        if self.dry_run:
            logger.info(f"[JOB][DRY_RUN] Would post job {job_id}. Skipping.")
            return True

        # Instagram (requires image)
        if image_path:
            try:
                ig_result = self.instagram.post_image(
                    image_url=image_path, caption=ig_caption
                )
                if ig_result.get("success"):
                    logger.info(f"[JOB] Instagram posted: {ig_result.get('id')}")
                else:
                    logger.warning(
                        f"[JOB] Instagram failed: {ig_result.get('error')}"
                    )
            except Exception as e:
                logger.error(f"[JOB] Instagram exception: {e}")
        else:
            logger.info("[JOB] Instagram skipped (no image).")

        # Bluesky
        try:
            bs_result = self.bluesky.post_skeet(bs_text)
            if bs_result and "uri" in bs_result:
                logger.info(f"[JOB] Bluesky posted: {bs_result['uri']}")
        except Exception as e:
            logger.error(f"[JOB] Bluesky exception: {e}")

        return True

    # 環境変数で上書き可能。デフォルトは3件/日
    DAILY_POST_LIMIT = int(os.getenv("SAGE_JOB_DAILY_LIMIT", "3"))
    # pendingジョブの保持上限。これを超えた古いものは自動削除
    MAX_PENDING_JOBS = int(os.getenv("SAGE_MAX_PENDING_JOBS", "50"))

    def _prune_old_pending(self, jobs: list) -> list:
        """古いpendingジョブを削除して積み上がりを防ぐ。新しいものを優先。"""
        pending = [j for j in jobs if j.get("status") == "pending"]
        non_pending = [j for j in jobs if j.get("status") != "pending"]

        if len(pending) > self.MAX_PENDING_JOBS:
            # 作成日時で降順ソートし、新しい順に上限件数だけ残す
            pending.sort(key=lambda j: j.get("created_at", ""), reverse=True)
            dropped = len(pending) - self.MAX_PENDING_JOBS
            pending = pending[:self.MAX_PENDING_JOBS]
            logger.info(f"[JOB] Pruned {dropped} old pending jobs (kept newest {self.MAX_PENDING_JOBS}).")

        return non_pending + pending

    def process_pending(self) -> int:
        """pending ジョブを処理する。1日の上限は SAGE_JOB_DAILY_LIMIT 件。"""
        jobs = self._load_jobs()
        jobs = self._prune_old_pending(jobs)
        processed = 0
        changed = False
        today = datetime.utcnow().date().isoformat()

        # 本日すでに投稿した件数
        posted_today = sum(
            1 for j in jobs
            if j.get("status") == "posted" and j.get("posted_at", "")[:10] == today
        )

        for job in jobs:
            if job.get("status") == "pending":
                if posted_today >= self.DAILY_POST_LIMIT:
                    logger.info(
                        f"[JOB] Daily limit reached ({posted_today}/{self.DAILY_POST_LIMIT}). Stopping."
                    )
                    break
                success = self._process_job(job)
                if success:
                    job["status"] = "posted"
                    job["posted_at"] = datetime.utcnow().isoformat()
                    processed += 1
                    posted_today += 1
                    changed = True

        if changed:
            self._save_jobs(jobs)

        logger.info(f"[JOB] process_pending done: {processed} posted, {posted_today} total today.")
        return processed

    def run(self) -> None:
        """Main worker loop — runs indefinitely, polled every POLL_INTERVAL seconds."""
        logger.info(
            f"[JOB] SageJobRunner worker started. Poll interval: {self.POLL_INTERVAL}s"
        )
        while True:
            self.run_once()
            time.sleep(self.POLL_INTERVAL)

    def run_once(self) -> None:
        """Process pending jobs once without polling logic."""
        try:
            # Monthly Instagram token refresh check (approx 9:00 AM on the 1st)
            now = datetime.now()
            if now.day == 1 and now.hour == 9 and now.minute < 10:
                try:
                    from backend.modules.instagram_token_refresher import refresh_instagram_token
                    refresh_instagram_token()
                except Exception as e:
                    logger.error(f"[JOB] Failed to trigger token refresh: {e}")

            count = self.process_pending()
            if count:
                logger.info(f"[JOB] Processed {count} pending job(s).")
        except Exception as e:
            logger.error(f"[JOB] Worker error: {e}")

