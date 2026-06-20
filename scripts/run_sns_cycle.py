#!/usr/bin/env python3
"""One-shot SNS posting entry point for the GitHub Actions cron.

The GitHub Actions workflow (.github/workflows/sns-auto-post.yml) runs this on a
schedule. It must run ONE posting cycle and exit — unlike
backend/scheduler/sns_daily_scheduler.py's __main__ block, which runs an infinite
`schedule` loop unsuitable for CI.
"""
import os
import sys

# Ensure the repo root is importable so the `backend` package resolves
# regardless of the working directory the runner uses.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


def main() -> int:
    from backend.scheduler.sns_daily_scheduler import SNSDailyScheduler

    scheduler = SNSDailyScheduler()
    scheduler.run_cycle()
    return 0


if __name__ == "__main__":
    sys.exit(main())
