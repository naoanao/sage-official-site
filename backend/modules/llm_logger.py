import json
import os
import time
import logging
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler

class LLMLogger:
    """
    📜 Sage LLM Auditor
    Records all neural interactions for transparency and troubleshooting.
    """
    def __init__(self):
        self.log_dir = Path(__file__).parent.parent / "logs"
        self.log_dir.mkdir(exist_ok=True)
        self.log_file = self.log_dir / "llm_calls.jsonl"
        
        # Configure dedicated logger for LLM calls with rotation
        self.logger = logging.getLogger("sage_llm_auditor")
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False
        if not self.logger.handlers:
            handler = RotatingFileHandler(str(self.log_file), maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
            self.logger.addHandler(handler)

    def log_call(self, provider: str, messages: list, response: str, latency_ms: float, model: str = "unknown", request_id: str = None):
        """Append a structured log entry to the JSONL file."""
        log_entry = {
            "timestamp": datetime.isoformat(datetime.now()),
            "request_id": request_id,
            "provider": provider,
            "model": model,
            "latency_ms": latency_ms,
            "input_len": sum(len(str(m.get('content', ''))) for m in messages if isinstance(m, dict)),
            "output_len": len(str(response)) if response else 0,
            "response_preview": (str(response)[:200] + "...") if response and len(str(response)) > 200 else str(response)
        }

        try:
            self.logger.info(json.dumps(log_entry, ensure_ascii=False))
        except Exception as e:
            # Fallback to direct print if logging fails
            print(f"[ERROR] LLMLogger failed: {e}")

llm_logger = LLMLogger()
