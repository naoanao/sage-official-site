
import json
import time
import os
from pathlib import Path
from datetime import datetime, timedelta

class PersistentRateLimiter:
    """
    Hardened Rate Limiter
    Ensures Sage stays within API budgets even after server restarts.
    """
    def __init__(self, name: str, limit: int, window_seconds: int):
        self.name = name
        self.limit = limit
        self.window_seconds = window_seconds
        self.log_dir = Path(__file__).parent.parent / "logs"
        self.log_dir.mkdir(exist_ok=True)
        self.file_path = self.log_dir / f"rate_limit_{name}.json"
        
    def _load_data(self):
        if not self.file_path.exists():
            return []
        try:
            with open(self.file_path, "r") as f:
                return json.load(f)
        except:
            return []

    def _save_data(self, data):
        with open(self.file_path, "w") as f:
            json.dump(data, f)

    def is_allowed(self) -> bool:
        """Check if request is within the allowed window."""
        now = time.time()
        cutoff = now - self.window_seconds
        
        timestamps = self._load_data()
        # Clean up old timestamps
        valid_timestamps = [t for t in timestamps if t > cutoff]
        
        if len(valid_timestamps) >= self.limit:
            return False
            
        valid_timestamps.append(now)
        self._save_data(valid_timestamps)
        return True

    def get_remaining(self) -> int:
        now = time.time()
        cutoff = now - self.window_seconds
        timestamps = self._load_data()
        valid_timestamps = [t for t in timestamps if t > cutoff]
        return max(0, self.limit - len(valid_timestamps))

# Pre-defined limiters
groq_limiter = PersistentRateLimiter("groq", limit=1000, window_seconds=3600)  # 1000/hour
produce_limiter = PersistentRateLimiter("produce", limit=10, window_seconds=7 * 86400)  # 10/week
