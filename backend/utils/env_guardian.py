"""
EnvGuardian — API key validation and .env backup on Flask startup.
"""
import os
import shutil
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

REQUIRED_KEYS = {
    "HF_TOKEN":       "HuggingFace Flux image generation",
    "IMGBB_API_KEY":  "imgbb image hosting",
    "GEMINI_API_KEY": "Gemini AI (image + text fallback)",
    "GROQ_API_KEY":   "Groq LLM (primary text AI)",
    "NOTION_API_KEY": "Notion integration",
}


class EnvGuardian:
    def __init__(self, project_root: str | None = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).parent.parent.parent

    def backup_env(self) -> str | None:
        """Back up .env to .env.backup_YYYYMMDD_HHMMSS. Returns backup path or None."""
        env_file = self.project_root / ".env"
        if not env_file.exists():
            logger.warning(f"EnvGuardian: .env not found at {env_file}")
            return None
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup = self.project_root / f".env.backup_{ts}"
        shutil.copy(env_file, backup)
        logger.info(f"EnvGuardian: .env backed up → {backup.name}")
        return str(backup)

    def validate(self) -> list[str]:
        """Check required API keys. Logs status for each key. Returns list of missing keys."""
        missing = []
        lines = []
        for key, description in REQUIRED_KEYS.items():
            value = os.getenv(key)
            if value:
                masked = value[:8] + "..." if len(value) > 8 else "***"
                lines.append(f"  ✅ {key}: {masked}  ({description})")
            else:
                lines.append(f"  ❌ {key}: NOT SET  ({description})")
                missing.append(key)

        logger.info("EnvGuardian API Key Status:\n" + "\n".join(lines))
        if missing:
            logger.warning(f"EnvGuardian: Missing keys: {missing}")
        else:
            logger.info("EnvGuardian: All required API keys are set.")
        return missing

    def run(self) -> list[str]:
        """Backup .env and validate keys. Call this on Flask startup."""
        self.backup_env()
        return self.validate()


# Singleton
env_guardian = EnvGuardian()
