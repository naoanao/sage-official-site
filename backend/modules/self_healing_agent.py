"""
Self Healing Agent
Monitors system logs, detects critical errors, and autonomously fixes them.
Reports healing events to Notion task DB.
"""
import os
import time
import logging
import subprocess
import re
import json
from typing import Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class SelfHealingAgent:
    def __init__(self, log_path: str = None):
        base_dir = Path(__file__).resolve().parents[1]

        if log_path:
            self.log_path = Path(log_path)
        else:
            self.log_path = base_dir / "logs" / "sage_ultimate.log"

        self.recovery_map = {
            "ModuleNotFoundError": self._heal_missing_module,
            "ImportError": self._heal_missing_module,
            "TimeoutError": self._heal_timeout,
            "ConnectionError": self._heal_connection,
            "MemoryError": self._heal_memory,
            "serpapi key not found": self._heal_config_issue,
            "groq_api_key not found": self._heal_config_issue,
        }

        self.last_position = 0
        if self.log_path.exists():
            self.last_position = self.log_path.stat().st_size

        self.status_file = base_dir / "logs" / "healing_status.json"
        self.status_file.parent.mkdir(parents=True, exist_ok=True)

        self.last_reported: Dict[str, float] = {}
        self.REPORT_COOLDOWN = 60  # seconds

        self._update_status("active", "Monitoring system health...")
        logger.info(f"[HEAL] Self-Healing Agent initialized. Watching: {self.log_path}")

    # ── Status ──────────────────────────────────────────────────────────────

    def _update_status(self, state: str, message: str, extra: Optional[Dict] = None):
        """Write current healing state to healing_status.json for frontend polling."""
        payload = {
            "state": state,
            "message": message,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        if extra:
            payload.update(extra)
        try:
            with open(self.status_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"[HEAL] Could not write status file: {e}")

    # ── Main loop ────────────────────────────────────────────────────────────

    def watch_and_heal(self, interval: float = 1.0):
        """Tail log file and trigger recovery on known error patterns."""
        logger.info("[HEAL] Starting watch loop...")
        while True:
            try:
                if self.log_path.exists():
                    current_size = self.log_path.stat().st_size
                    if current_size > self.last_position:
                        with open(self.log_path, "r", encoding="utf-8", errors="replace") as f:
                            f.seek(self.last_position)
                            new_lines = f.read()
                            self.last_position = f.tell()

                        for line in new_lines.splitlines():
                            for pattern in self.recovery_map:
                                if pattern in line:
                                    self._trigger_recovery(pattern, line)
                                    break
            except Exception as e:
                logger.error(f"[HEAL] watch_and_heal error: {e}")

            time.sleep(interval)

    # ── Recovery dispatcher ──────────────────────────────────────────────────

    def _trigger_recovery(self, error_type: str, details: str):
        last_time = self.last_reported.get(error_type, 0)
        if time.time() - last_time < self.REPORT_COOLDOWN:
            return

        logger.info(f"[HEAL] Detected: {error_type}")
        self.last_reported[error_type] = time.time()
        self._update_status("healing", f"Fixing: {error_type}...", {"error": error_type})

        strategy = self.recovery_map.get(error_type)
        if not strategy:
            return

        result = strategy(details)
        if result:
            self._report_to_notion(error_type, details, result)
            status_key = "healed" if result.get("auto_healed") else "failed"
            self._update_status(status_key, result.get("action") or "", result)

    # ── Healing strategies ───────────────────────────────────────────────────

    def _heal_missing_module(self, log_line: str) -> Dict:
        match = re.search(r"No module named ['\"]([^'\"]+)['\"]", log_line)
        if match:
            module_name = match.group(1)
            pkg_map = {"cv2": "opencv-python", "sklearn": "scikit-learn",
                       "PIL": "Pillow", "googleapiclient": "google-api-python-client"}
            package_name = pkg_map.get(module_name, module_name)
            logger.info(f"[HEAL] Installing missing package: {package_name}")
            try:
                subprocess.check_call(["pip", "install", package_name])
                return {"status": "success", "action": f"Installed: {package_name}", "auto_healed": True}
            except subprocess.CalledProcessError as e:
                return {"status": "failed", "action": f"pip install failed: {e}", "auto_healed": False}
        return None

    def _heal_timeout(self, log_line: str) -> Dict:
        return {"status": "analysis", "action": "Timeout detected. Consider increasing API timeout in .env", "auto_healed": False}

    def _heal_connection(self, log_line: str) -> Dict:
        return {"status": "analysis", "action": "Connection error detected. Check network/tunnel status.", "auto_healed": False}

    def _heal_memory(self, log_line: str) -> Dict:
        return {"status": "analysis", "action": "Memory limit reached. Restart backend recommended.", "auto_healed": False}

    def _heal_config_issue(self, log_line: str) -> Dict:
        return {"status": "needs_config", "action": "Missing API key detected. Update .env file.", "auto_healed": False}

    # ── Reporting (Notion) ───────────────────────────────────────────────────

    def _report_to_notion(self, error_type: str, details: str, result: Dict):
        """Log healing event to Notion task DB."""
        try:
            import requests  # type: ignore[import]
            notion_token = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
            db_id = os.getenv("NOTION_TASK_DB_ID", "8d8c383a61274721817da0abc065d35c")
            if not notion_token:
                logger.warning("[HEAL] NOTION_API_KEY not set; skipping Notion report.")
                return

            icon = "✅" if result.get("auto_healed") else "⚠️"
            title = f"[Self-Healing] {icon} {error_type}"
            body = {
                "parent": {"database_id": db_id},
                "properties": {
                    "タスク名": {"title": [{"text": {"content": title}}]},
                    "ステータス": {"select": {"name": "完了" if result.get("auto_healed") else "要確認"}},
                },
            }
            headers = {
                "Authorization": f"Bearer {notion_token}",
                "Content-Type": "application/json",
                "Notion-Version": "2022-06-28",
            }
            resp = requests.post("https://api.notion.com/v1/pages", json=body, headers=headers, timeout=10)
            if resp.status_code in (200, 201):
                logger.info(f"[HEAL] Notion report created: {title}")
            else:
                logger.warning(f"[HEAL] Notion report failed: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            logger.error(f"[HEAL] Notion report error: {e}")


if __name__ == "__main__":
    agent = SelfHealingAgent()
    print("[HEAL] Self-Healing Agent running...")
    agent.watch_and_heal()
