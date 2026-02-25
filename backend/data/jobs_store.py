"""
Sage Jobs Store — centralised load/save/append for backend/data/jobs.json.

Handles:
  - Missing file          → returns [] / creates on first write
  - Corrupt JSON          → backs up to jobs.corrupted.<ts>.json, starts fresh
  - Parent dir missing    → auto-creates backend/data/
  - Root not a list       → same corrupt handling

Usage:
    from backend.data.jobs_store import load, save, append, JOBS_FILE

    jobs = load()
    append(job_dict)          # load → append → save in one call
    save(my_list)             # full overwrite
"""

import json
import logging
import os
import shutil
from datetime import datetime
from typing import List

logger = logging.getLogger(__name__)

JOBS_FILE = "backend/data/jobs.json"


# ── Public API ──────────────────────────────────────────────────────────────


def load() -> List[dict]:
    """Load all jobs.  Returns [] if file is missing or unreadable."""
    if not os.path.exists(JOBS_FILE):
        return []
    try:
        with open(JOBS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError(f"root element is {type(data).__name__}, expected list")
        return data
    except Exception as e:
        logger.error(f"[JobStore] Cannot read {JOBS_FILE}: {e} — starting fresh")
        _backup_corrupt()
        return []


def save(jobs: List[dict]) -> None:
    """Persist *jobs* to disk, creating parent directory as needed."""
    os.makedirs(os.path.dirname(JOBS_FILE), exist_ok=True)
    try:
        with open(JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump(jobs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[JobStore] Cannot write {JOBS_FILE}: {e}")


def append(job: dict) -> None:
    """Append one job entry and persist immediately (load → append → save)."""
    jobs = load()
    jobs.append(job)
    save(jobs)


# ── Internal helpers ─────────────────────────────────────────────────────────


def _backup_corrupt() -> None:
    """Move a corrupt jobs.json aside so the operator can inspect it."""
    if not os.path.exists(JOBS_FILE):
        return
    try:
        ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        backup = JOBS_FILE.replace(".json", f".corrupted.{ts}.json")
        shutil.move(JOBS_FILE, backup)
        logger.warning(f"[JobStore] Corrupt file moved to {backup}")
    except Exception as be:
        logger.error(f"[JobStore] Could not back up corrupt file: {be}")
