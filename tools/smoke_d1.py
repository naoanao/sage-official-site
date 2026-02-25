#!/usr/bin/env python
"""
Sage D1 Knowledge Loop — integration smoke test.

Calls AutonomousAdapter._execute_decision directly with a mock orchestrator.
Exercises the full D1 path: Perplexity → Groq fallback → Obsidian save → Notion queue.

Usage:
    python tools/smoke_d1.py --topic "Best AI Productivity Tools 2026"

Expected log lines (INFO):
    [D1] START topic=...
    [D1] SOURCE=Perplexity  OR  [D1] SOURCE=Groq fallback
    [D1] OBSIDIAN saved: obsidian_vault/knowledge/research_*.md
    [D1] NOTION queued: title=... status=予約済み

Exit 0 = D1 completed without FATAL error.
Exit 1 = exception raised by _execute_decision.
"""

import argparse
import logging
import pathlib
import sys

# ── Project root on sys.path ─────────────────────────────────────────────────
ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("smoke_d1")


# ── Minimal mock objects ──────────────────────────────────────────────────────

class _MockOrchestrator:
    """No browser_agent → D1 takes the Perplexity → Groq fallback path."""
    browser_agent = None


class _MockMemory:
    pass


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Sage D1 integration smoke test")
    parser.add_argument("--topic", required=True, help="Research topic")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Sage D1 Smoke Test (AutonomousAdapter)")
    print(f"  Topic : {args.topic}")
    print(f"{'='*60}\n")

    from backend.modules.autonomous_adapter import AutonomousAdapter

    adapter = AutonomousAdapter(
        orchestrator=_MockOrchestrator(),
        memory=_MockMemory(),
    )
    adapter.phase_2_execute = True  # ensure execution is enabled

    decision = {
        "type": "research_ai_trends",
        "data": {"topic": args.topic},
    }

    try:
        adapter._execute_decision(decision)
        print(f"\n{'='*60}")
        print("[PASS] D1 completed successfully")
        print(f"{'='*60}")
        sys.exit(0)
    except Exception as e:
        print(f"\n{'='*60}")
        print(f"[FAIL] _execute_decision raised: {e}")
        print(f"{'='*60}")
        sys.exit(1)


if __name__ == "__main__":
    main()
