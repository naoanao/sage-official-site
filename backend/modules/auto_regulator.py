import logging
import os
from .api_monitor import api_monitor

logger = logging.getLogger(__name__)

class AutoRegulator:
    def __init__(self):
        # Default limits - can be overridden by environment variables
        self.daily_token_limit = int(os.getenv("SAGE_API_TOKEN_LIMIT", "500000"))
        self.daily_call_limit = int(os.getenv("SAGE_API_CALL_LIMIT", "2000"))
        self.stop_file = "SAGE_STOP" # Create this file in root to emergency stop

        logger.info(f"🛡️ [BRAKE] AutoRegulator initialized. Limits: {self.daily_token_limit} tokens, {self.daily_call_limit} calls.")

    def check_safety(self):
        """
        The 'Brake' logic. Raises an Exception if AI should stop immediately.
        """
        # 1. Check Emergency Stop Switch (Project Root relative)
        # Using a more robust path discovery
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        stop_file_path = os.path.join(root_dir, self.stop_file)

        if os.path.exists(stop_file_path) or os.path.exists(self.stop_file):
            msg = "🚨 [BRAKE] EMERGENCY STOP DETECTED! (SAGE_STOP file exists). Cutting power."
            logger.critical(msg)
            raise RuntimeError(msg)

        # 2. Check API Usage Stats
        try:
            stats = api_monitor.get_usage_stats()
            calls = stats.get("total_calls", 0)
            tokens = stats.get("total_tokens", 0)

            # Check Limits
            if calls >= self.daily_call_limit:
                msg = f"🛑 [BRAKE] API Call limit reached ({calls}/{self.daily_call_limit}). Stopping AI."
                logger.error(msg)
                raise RuntimeError(msg)

            if tokens >= self.daily_token_limit:
                msg = f"🛑 [BRAKE] API Token limit reached ({tokens}/{self.daily_token_limit}). Stopping AI."
                logger.error(msg)
                raise RuntimeError(msg)

            # Warning Zone (90%)
            if tokens > (self.daily_token_limit * 0.9):
                logger.warning(f"⚠️ [BRAKE] Quota near 90%. Usage: {tokens} tokens.")

        except Exception as e:
            if isinstance(e, RuntimeError): raise e
            msg = f"⚠️ [BRAKE] Safety check error: {e}. Defaulting to SAFE (Stop)."
            logger.error(msg)
            raise RuntimeError(msg)

    def slow_down(self):
        """Used for rate limiting - introduces artificial delay."""
        logger.warning("🐢 [BRAKE] System slow-down active.")
        import time
        time.sleep(5)
        return True

auto_regulator = AutoRegulator()
