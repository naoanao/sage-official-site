import os
import time
import logging
import subprocess
from datetime import datetime, timedelta
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("NotionSyncScheduler")

class NotionSyncScheduler:
    """
    Unified Notion Synchronization Scheduler for Sage 3.0.
    Handles Git Log Sync and Milestone Reports.
    """
    def __init__(self):
        self.api_key = os.getenv("NOTION_API_KEY")
        self.daily_log_id = "306f7a7d-a95e-80f9-bfa9-ee2b3d5a6e60"
        self.client = None
        if self.api_key:
            self.client = Client(auth=self.api_key)
            logger.info("NotionSyncScheduler: Notion Client initialized.")
        else:
            logger.warning("NotionSyncScheduler: NOTION_API_KEY missing.")

    def get_recent_commits(self, days=1):
        """Fetch git commits since the specified number of days."""
        since_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        try:
            cmd = ["git", "log", f"--since={since_date}", "--pretty=format:- %ad: %s (%h)", "--date=short"]
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
            if result.returncode != 0:
                return f"Error fetching git log: {result.stderr}"
            return result.stdout.strip()
        except Exception as e:
            return f"Exception during git log: {e}"

    def run_git_sync(self):
        """Syncs git log to Notion Daily Log block."""
        if not self.client: return
        
        logger.info("🚀 Starting Git to Notion Daily Log Sync...")
        commits = self.get_recent_commits(days=1)
        
        if not commits:
            commits = "No new commits today. System is active."

        today_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        content_blocks = [
            {
                "object": "block",
                "type": "heading_3",
                "heading_3": {"rich_text": [{"type": "text", "text": {"content": f"📅 {today_str} 自動日報 (Git Sync)"}}]}
            },
            {
                "object": "block",
                "type": "code",
                "code": {
                    "rich_text": [{"type": "text", "text": {"content": commits}}, {"type": "text", "text": {"content": "\n\n---\n*Verified by Sage OS*"}}],
                    "language": "markdown"
                }
            }
        ]
        
        try:
            self.client.blocks.children.append(block_id=self.daily_log_id, children=content_blocks)
            logger.info("✅ Git sync complete. Logs appended to Notion.")
            
            # Update status to Active
            self.client.blocks.update(
                block_id=self.daily_log_id,
                bulleted_list_item={"rich_text": [{"type": "text", "text": {"content": "Notion日報化 [✅ Active]"}}]}
            )
        except Exception as e:
            logger.error(f"❌ Error syncing to Notion: {e}")

    def run(self):
        """Runs the main loop for the thread."""
        logger.info("NotionSyncScheduler: Loop started.")
        while True:
            # Sync once per hour to catch commits
            # But we could also just run it at a specific time (e.g. 23:59)
            # For now, let's do once per hour for high reactivity
            try:
                self.run_git_sync()
            except Exception as e:
                logger.error(f"NotionSyncScheduler Error in loop: {e}")
            
            time.sleep(3600) # Wait 1 hour

if __name__ == "__main__":
    # Test run
    scheduler = NotionSyncScheduler()
    scheduler.run_git_sync()
