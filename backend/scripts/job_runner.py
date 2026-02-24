import os
import json
import logging
import time
from datetime import datetime

logger = logging.getLogger("SageJobRunner")

JOBS_FILE = "backend/data/jobs.json"


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
        if not os.path.exists(JOBS_FILE):
            return []
        try:
            with open(JOBS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"[JOB] Failed to load jobs.json: {e}")
            return []

    def _save_jobs(self, jobs: list) -> None:
        try:
            with open(JOBS_FILE, "w", encoding="utf-8") as f:
                json.dump(jobs, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[JOB] Failed to save jobs.json: {e}")

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

    def process_pending(self) -> int:
        """Process all pending jobs. Returns count of processed jobs."""
        jobs = self._load_jobs()
        processed = 0
        changed = False

        for job in jobs:
            if job.get("status") == "pending":
                success = self._process_job(job)
                if success:
                    job["status"] = "posted"
                    job["posted_at"] = datetime.utcnow().isoformat()
                    processed += 1
                    changed = True

        if changed:
            self._save_jobs(jobs)

        return processed

    def run(self) -> None:
        """Main worker loop — runs indefinitely, polled every POLL_INTERVAL seconds."""
        logger.info(
            f"[JOB] SageJobRunner worker started. Poll interval: {self.POLL_INTERVAL}s"
        )
        while True:
            try:
                count = self.process_pending()
                if count:
                    logger.info(f"[JOB] Processed {count} pending job(s).")
            except Exception as e:
                logger.error(f"[JOB] Worker error: {e}")
            time.sleep(self.POLL_INTERVAL)
