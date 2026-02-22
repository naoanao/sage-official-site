"""
Self Healing Agent
Monitors system logs, detects critical errors, and autonomously fixes them.
Integrates with Jira to report self-healing actions.
"""
import os
import time
import logging
import subprocess
import re
import json
from typing import Dict, Optional, List
from pathlib import Path

# Import JiraAgent for reporting
try:
    from backend.modules.jira_agent import JiraAgent
except ImportError:
    # Fallback if running standalone
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from backend.modules.jira_agent import JiraAgent

logger = logging.getLogger(__name__)

class SelfHealingAgent:
    def __init__(self, log_path: str = None):
        """
        Initialize Self Healing Agent
        """
        if log_path:
            self.log_path = Path(log_path)
        else:
            # Default to backend/logs/sage_ultimate.log
            base_dir = Path(__file__).resolve().parents[1]
            self.log_path = base_dir / "logs" / "sage_ultimate.log"
            
        self.jira_agent = JiraAgent()
        
        # Recovery strategies map
        self.recovery_map = {
            "ModuleNotFoundError": self._heal_missing_module,
            "ImportError": self._heal_missing_module,
            "TimeoutError": self._heal_timeout,
            "ConnectionError": self._heal_connection,
            "MemoryError": self._heal_memory,
            "serpapi key not found": self._heal_config_issue,
            "groq_api_key not found": self._heal_config_issue
        }
        
        self.last_position = 0
        # Start at end of file if it exists to avoid reprocessing old logs on restart
        if self.log_path.exists():
            self.last_position = self.log_path.stat().st_size

        self.status_file = base_dir / "logs" / "healing_status.json"
        
        # Throttling tracking
        self.last_reported = {}
        self.REPORT_COOLDOWN = 60 # seconds

        self._update_status("active", "Monitoring system health...")

        logger.info(f"❤️‍🩹 Self-Healing Agent initialized. Watching: {self.log_path}")

    # ... (skipping to _trigger_recovery) ...

    def _trigger_recovery(self, error_type: str, details: str):
        """Execute recovery logic and report results"""
        
        # Check throttling to prevent spamming Jira
        last_time = self.last_reported.get(error_type, 0)
        if time.time() - last_time < self.REPORT_COOLDOWN:
            # logger.info(f"⏳ Skipping report for {error_type} (cooldown detected)")
            return

        logger.info(f"🚨 Detected Error: {error_type}")
        self.last_reported[error_type] = time.time()
        
        self._update_status("healing", f"Fixing detected error: {error_type}...", {"error": error_type})

        # Determine strategy
        strategy = self.recovery_map.get(error_type)
        if not strategy:
            return

        # Execute Fix
        result = strategy(details)
        
        # Report to Jira if fix was attempted
        if result:
            self._report_to_jira(error_type, details, result)
            
            # Update status for frontend success message
            success = result.get("auto_healed", False)
            status_key = "healed" if success else "failed"
            self._update_status(status_key, result.get("action"), result)

    # --- Healing Strategies ---

    def _heal_missing_module(self, log_line: str) -> Dict:
        """
        Fix: Install missing python package
        Pattern: "ModuleNotFoundError: No module named 'xyz'"
        """
        match = re.search(r"No module named ['\"]([^'\"]+)['\"]", log_line)
        if match:
            module_name = match.group(1)
            # Map module name to package name (basic mapping)
            package_name = module_name
            if module_name == "cv2": package_name = "opencv-python"
            if module_name == "sklearn": package_name = "scikit-learn"
            if module_name == "PIL": package_name = "Pillow"
            if module_name == "googleapiclient": package_name = "google-api-python-client"

            logger.info(f"🔧 Self-Healing: Installing missing package '{package_name}'...")
            try:
                subprocess.check_call(["pip", "install", package_name])
                return {"status": "success", "action": f"Installed package: {package_name}", "auto_healed": True}
            except subprocess.CalledProcessError as e:
                return {"status": "failed", "action": f"Failed to install {package_name}: {e}", "auto_healed": False}
        return None

    def _heal_timeout(self, log_line: str) -> Dict:
        """
        Fix: Suggest increasing timeout or retry
        (For now, just logs analysis as we can't easily hot-patch code variables safely without restarting)
        """
        return {"status": "analysis", "action": "Detected timeout. Recommended action: Increase API timeout settings in .env", "auto_healed": False}

    def _heal_connection(self, log_line: str) -> Dict:
        """
        Fix: Network issues
        """
        return {"status": "analysis", "action": "Detected connection error. Checking network status...", "auto_healed": False}

    def _heal_memory(self, log_line: str) -> Dict:
        """
        Fix: Suggest clearing cache or restart
        """
        # Simulating cache clear
        return {"status": "analysis", "action": "Memory Limit Reached. Suggested: Restart Backend.", "auto_healed": False}

    def _heal_config_issue(self, log_line: str) -> Dict:
        """
        Fix: Report missing API key configuration
        """
        return {"status": "needs_config", "action": "Missing API Key detected. Please update .env file.", "auto_healed": False}

    # --- Reporting ---

    def _report_to_jira(self, error_type: str, details: str, result: Dict):
        """Create a Jira ticket for the incident"""
        summary = f"[Self-Healing] {error_type} detected and handled"
        
        status_icon = "✅" if result.get("auto_healed") else "⚠️"
        description = (
            f"h3. Self-Healing Report\n"
            f"*Error Type:* {error_type}\n"
            f"*Timestamp:* {time.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"*Action Taken:* {result.get('action')}\n"
            f"*Status:* {status_icon} {result.get('status')}\n\n"
            f"h4. Log Details\n"
            f"{{noformat}}\n{details.strip()}\n{{noformat}}"
        )
        
        # Only create tickets for real issues (prevent spamming for same error? - Todo: implementing throttling)
        logger.info(f"🎫 Reporting incident to Jira: {summary}")
        
        # Call Jira Agent
        try:
            # Try with "Task" as it's universally available
            self.jira_agent.create_issue(
                summary=summary,
                description=description,
                issue_type="Task", 
                priority="Medium",
                labels=["self-healing", "sage-auto"]
            )
        except Exception as e:
            logger.error(f"Failed to report to Jira: {e}")
            # Fallback to simple print if Jira fails
            print(f"FAILED TO REPORT TO JIRA: {e}")

if __name__ == "__main__":
    # Test run
    agent = SelfHealingAgent()
    print("🏥 Self-Healing Agent running in monitoring mode...")
    agent.watch_and_heal()
