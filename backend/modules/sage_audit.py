import json
import os
import time
from datetime import datetime

from pathlib import Path

class SageAudit:
    def __init__(self):
        # Resolve path relative to THIS file (backend/modules/sage_audit.py)
        # We want backend/logs/audit.jsonl
        self.log_dir = Path(__file__).parent.parent / "logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.log_dir / "audit.jsonl"

    def log_event(self, event_type, user_id, details=None):
        """
        Logs a security or significant operational event.
        """
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "details": details or {}
        }
        
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as e:
            # Fallback to standard logging if audit fails
            print(f"[AUDIT FAILURE] Could not write to audit log: {e}")

# Global instance
audit_logger = SageAudit()
