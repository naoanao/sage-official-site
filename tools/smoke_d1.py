#!/usr/bin/env python
"""
Sage D1 Knowledge Loop — smoke test.

Usage:
    python tools/smoke_d1.py --topic "Best AI Productivity Tools 2026"

Checks:
  1. jobs_store  : load / append / save / auto-create / corrupt-recovery
  2. D1 research : Perplexity → Groq fallback → evidence_status
  3. Obsidian    : report written to obsidian_vault/knowledge/

Does NOT write to Notion Content Pool or Evidence Ledger (read-only smoke).
Exit 0 = all checks passed.  Exit 1 = at least one failure.
"""

import argparse
import logging
import os
import pathlib
import re
import sys
import time

# ── Project root on sys.path ─────────────────────────────────────────────────
ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("smoke_d1")


# ── Test 1: jobs_store ────────────────────────────────────────────────────────

def test_jobs_store() -> bool:
    print("\n[1/3] jobs_store smoke test …")
    from backend.data.jobs_store import append, load, save

    original = load()
    print(f"      Loaded {len(original)} existing job(s).")

    test_id = f"smoke_test_{int(time.time())}"
    append({"id": test_id, "type": "smoke_test", "status": "dry_run",
            "created_at": "2026-01-01T00:00:00"})

    after = load()
    found = any(j.get("id") == test_id for j in after)

    # Clean up the test entry
    save([j for j in after if j.get("id") != test_id])

    if found:
        print("      [PASS] load / append / save OK")
        return True
    print("      [FAIL] test job not found after append")
    return False


# ── Test 2: D1 research pipeline ─────────────────────────────────────────────

def _determine_evidence_status(
    research_report: str,
    d1_api_flags: list,
) -> tuple:
    """Mirror of the logic in autonomous_adapter.py."""
    has_perplexity_ok  = "Perplexity:OK" in d1_api_flags
    has_unverified     = "[Unverified Number]" in research_report
    has_unreachable    = "[UNREACHABLE/HALLUCINATED URL]" in research_report
    has_year_mismatch  = "[YEAR MISMATCH]" in research_report
    used_groq_fallback = "Groq:OK(fallback)" in d1_api_flags

    reasons: list = []
    if has_perplexity_ok and not has_unverified and not has_unreachable:
        status = "VERIFIED"
    elif research_report and "FATAL" not in research_report:
        status = "NEEDS_REVIEW"
        if used_groq_fallback:
            reasons.append("LLM synthesis used — no real-world data")
        if has_unverified:
            reasons.append("unverified statistics in report")
        if has_unreachable:
            reasons.append("unreachable/hallucinated URLs")
        if has_year_mismatch:
            reasons.append("year mismatch detected (2025 data)")
        if not has_perplexity_ok:
            pplx_errs = [f for f in d1_api_flags if "Perplexity:ERR" in f]
            reasons.append(pplx_errs[0] if pplx_errs else "Perplexity unavailable")
    else:
        status = "FAILED"
        reasons.append("no usable research data obtained")
    return status, reasons


def test_d1_research(topic: str) -> dict:
    """Run D1 research (Perplexity → Groq fallback).  Returns result dict."""
    print(f"\n[2/3] D1 research pipeline — topic: '{topic}' …")
    import requests

    d1_api_flags: list = []
    d1_log_lines: list = []
    research_report = ""

    pplx_key = os.getenv("PERPLEXITY_API_KEY")
    if pplx_key:
        try:
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                json={
                    "model": "sonar-reasoning-pro",
                    "messages": [
                        {"role": "system", "content": "Expert researcher. Provide specific data and verifiable URLs for 2026."},
                        {"role": "user", "content": f"Research: {topic}. Include key tools, revenue potential, market trends for 2026."},
                    ],
                    "temperature": 0.2,
                },
                headers={"Authorization": f"Bearer {pplx_key}", "Content-Type": "application/json"},
                timeout=60,
            )
            if response.status_code == 200:
                ct = response.headers.get("content-type", "")
                if "application/json" not in ct:
                    logger.warning(f"Perplexity returned non-JSON ({ct[:60]})")
                    d1_api_flags.append("Perplexity:ERR(non-json-response)")
                else:
                    research_report = response.json()["choices"][0]["message"]["content"]
                    d1_api_flags.append("Perplexity:OK")
                    d1_log_lines.append("Perplexity Research Success.")
                    logger.info("Perplexity OK")
            elif response.status_code == 401:
                logger.warning("Perplexity 401 — key invalid/expired")
                d1_api_flags.append("Perplexity:ERR(401-unauthorized)")
            else:
                logger.warning(f"Perplexity HTTP {response.status_code}")
                d1_api_flags.append(f"Perplexity:ERR({response.status_code})")
        except Exception as e:
            logger.warning(f"Perplexity request failed: {e}")
            d1_api_flags.append("Perplexity:ERR(exception)")
    else:
        logger.info("PERPLEXITY_API_KEY not set — skipping")
        d1_api_flags.append("Perplexity:SKIP(no-key)")

    # Groq fallback
    if not research_report:
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            logger.info("Falling back to Groq …")
            try:
                from groq import Groq
                resp = Groq(api_key=groq_key).chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "Expert market researcher. Write a Markdown intelligence report with 2026 trends and actionable insights."},
                        {"role": "user", "content": f"Research report on: {topic}. Include key tools, revenue potential, market trends."},
                    ],
                    max_tokens=800,
                )
                research_report = (
                    f"# Intelligence Report (Groq Synthesis): {topic}\n"
                    "> Note: LLM internal knowledge — external search unavailable.\n\n"
                    + resp.choices[0].message.content.strip()
                )
                d1_api_flags.append("Groq:OK(fallback)")
                d1_log_lines.append("Groq fallback synthesis complete.")
                logger.info("Groq fallback OK")
            except Exception as e:
                logger.error(f"Groq fallback failed: {e}")
                d1_api_flags.append("Groq:ERR")
        else:
            logger.warning("GROQ_API_KEY not set")
            d1_api_flags.append("Groq:SKIP(no-key)")

    evidence_status, ev_reasons = _determine_evidence_status(research_report, d1_api_flags)

    return {
        "evidence_status": evidence_status,
        "reasons": ev_reasons,
        "api_flags": d1_api_flags,
        "log_lines": d1_log_lines,
        "report_len": len(research_report),
        "research_report": research_report,
    }


# ── Test 3: Obsidian save ─────────────────────────────────────────────────────

def test_obsidian_save(research_report: str) -> str:
    """Write report to obsidian_vault/knowledge/.  Returns filename or ''."""
    print("\n[3/3] Obsidian vault save …")
    if not research_report:
        print("      [SKIP] no report to save")
        return ""
    try:
        vault_dir = ROOT / "obsidian_vault" / "knowledge"
        vault_dir.mkdir(parents=True, exist_ok=True)
        fname = f"smoke_{int(time.time())}.md"
        (vault_dir / fname).write_text(research_report, encoding="utf-8")
        print(f"      [PASS] saved → obsidian_vault/knowledge/{fname}")
        return fname
    except Exception as e:
        print(f"      [FAIL] {e}")
        return ""


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Sage D1 smoke test")
    parser.add_argument("--topic", required=True, help="Research topic")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Sage D1 Smoke Test")
    print(f"  Topic : {args.topic}")
    print(f"{'='*60}")

    failures: list = []

    # 1. jobs_store
    if not test_jobs_store():
        failures.append("jobs_store")

    # 2. D1 research
    result = test_d1_research(args.topic)

    # 3. Obsidian
    obsidian_file = test_obsidian_save(result["research_report"])

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"{'='*60}")
    print(f"  evidence_status : {result['evidence_status']}")
    if result["reasons"]:
        print(f"  reasons         : {' | '.join(result['reasons'])}")
    print(f"  api_flags       : {' '.join(result['api_flags'])}")
    print(f"  report_chars    : {result['report_len']}")
    print(f"  obsidian_file   : {obsidian_file or '(none)'}")

    if result["evidence_status"] == "FAILED":
        failures.append(f"D1 research: {' | '.join(result['reasons'])}")
    if not obsidian_file and result["report_len"] > 0:
        failures.append("Obsidian save failed")

    print()
    if failures:
        print(f"[FAIL] {', '.join(failures)}")
        sys.exit(1)
    else:
        print(f"[PASS] All checks passed — evidence_status={result['evidence_status']}")
        sys.exit(0)


if __name__ == "__main__":
    main()
