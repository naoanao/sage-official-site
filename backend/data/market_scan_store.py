"""
Market Scan Store — persistent JSON storage for MarketScanAgent results.

Usage:
    from backend.data.market_scan_store import load, save, append_scan

    results = load()
    append_scan(scan_dict)   # load → prepend → trim → save
    save(my_list)            # full overwrite
"""

import json
import logging
import os
import shutil
from datetime import datetime
from typing import List

logger = logging.getLogger(__name__)

SCAN_FILE = "backend/data/market_scans.json"
MAX_ENTRIES = 30  # Keep last 30 daily scans


# ── Public API ───────────────────────────────────────────────────────────────


def load() -> List[dict]:
    """Load all scan results. Returns [] if file is missing or unreadable."""
    if not os.path.exists(SCAN_FILE):
        return []
    try:
        with open(SCAN_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError(f"root element is {type(data).__name__}, expected list")
        return data
    except Exception as e:
        logger.error(f"[MarketScanStore] Cannot read {SCAN_FILE}: {e} — starting fresh")
        _backup_corrupt()
        return []


def save(scans: List[dict]) -> None:
    """Persist scans to disk, creating parent directory as needed."""
    os.makedirs(os.path.dirname(SCAN_FILE), exist_ok=True)
    try:
        with open(SCAN_FILE, "w", encoding="utf-8") as f:
            json.dump(scans, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[MarketScanStore] Cannot write {SCAN_FILE}: {e}")


def append_scan(scan: dict) -> None:
    """Prepend one scan result and persist (newest first, trimmed to MAX_ENTRIES)."""
    scans = load()
    scans.insert(0, scan)
    save(scans[:MAX_ENTRIES])


def latest() -> dict | None:
    """Return the most recent scan result, or None."""
    scans = load()
    return scans[0] if scans else None


# ── Internal helpers ──────────────────────────────────────────────────────────


def _backup_corrupt() -> None:
    if not os.path.exists(SCAN_FILE):
        return
    try:
        ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        backup = SCAN_FILE.replace(".json", f".corrupted.{ts}.json")
        shutil.move(SCAN_FILE, backup)
        logger.warning(f"[MarketScanStore] Corrupt file moved to {backup}")
    except Exception as be:
        logger.error(f"[MarketScanStore] Could not back up corrupt file: {be}")
