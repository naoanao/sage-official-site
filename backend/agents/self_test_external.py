"""
ExternalHealthChecker — Sage 外部 HTTP ヘルスチェック

内部サニティチェック（self_test_agent.py）を補完する外部視点の死活監視。
「設定・imports は正常」でも Flask がクラッシュ/ポート詰まりしていると
内部チェックだけでは検知できないケースをカバーする。

チェック対象 (5本):
  1. GET  /health                         — Flask 基本生存確認
  2. GET  /api/system/health              — オーケストレーター稼働確認
  3. GET  /api/telegram/health            — Telegram 統合確認
  4. GET  /api/research/check?topic=ai    — Research エンドポイント確認
  5. GET  /api/system/stats               — システム統計エンドポイント確認

判定基準:
  - HTTP ステータス < 500 かつ レイテンシ < LATENCY_THRESHOLD_SEC

ログ:
  backend/logs/external_test/YYYY-MM-DD.json
  （1日1ファイル、各実行結果を append）

Telegram 通知:
  同一エンドポイントが CONSECUTIVE_FAIL_THRESHOLD 回連続 FAIL した時点で通知

Tier 3 連携:
  run_checks() の戻り値に internal_status を受け取ると
  「外部 FAIL + 内部 PASS」を "flask_runtime_failure" として分類する。
"""

import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

logger = logging.getLogger("ExternalHealthChecker")

_FLASK_PORT = int(os.getenv("SAGE_PORT", 8080))
_BASE_URL = f"http://localhost:{_FLASK_PORT}"

# 判定しきい値
LATENCY_THRESHOLD_SEC = float(os.getenv("SAGE_EXT_LATENCY_THRESHOLD", 3.0))
CONSECUTIVE_FAIL_THRESHOLD = int(os.getenv("SAGE_EXT_CONSECUTIVE_FAILS", 2))

# ログ保存先
_BACKEND_DIR = Path(__file__).parent.parent.resolve()
_LOG_DIR = _BACKEND_DIR / "logs" / "external_test"

# チェック対象エンドポイント
_ENDPOINTS = [
    {
        "name": "flask_health",
        "method": "GET",
        "path": "/health",
        "expected_status_max": 499,
    },
    {
        "name": "system_health",
        "method": "GET",
        "path": "/api/system/health",
        "expected_status_max": 499,
    },
    {
        "name": "telegram_health",
        "method": "GET",
        "path": "/api/telegram/health",
        "expected_status_max": 499,
    },
    {
        "name": "research_check",
        "method": "GET",
        "path": "/api/research/check?topic=ai",
        "expected_status_max": 499,
    },
    {
        "name": "system_stats",
        "method": "GET",
        "path": "/api/system/stats",
        "expected_status_max": 499,
    },
]


class ExternalHealthChecker:
    """Flask の外部 HTTP ヘルスチェックを実行し、結果を記録・通知する。"""

    def __init__(self) -> None:
        # エンドポイントごとの連続 FAIL カウンター
        self._consecutive_fails: dict[str, int] = {ep["name"]: 0 for ep in _ENDPOINTS}
        _LOG_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(
            "[EXT_HEALTH] Initialized. base_url=%s latency_threshold=%.1fs",
            _BASE_URL,
            LATENCY_THRESHOLD_SEC,
        )

    # ──────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────

    def run_checks(self, internal_tier1_passed: Optional[bool] = None) -> dict:
        """
        全 5 エンドポイントをチェックしてレポートを返す。

        Args:
            internal_tier1_passed: 内部 Tier 1 結果。True なのに外部 FAIL なら
                                   flask_runtime_failure と分類する。
        Returns:
            {
              "results": [...],
              "summary": {"pass": int, "fail": int, "skip": int},
              "classification": str | None,
              "ran_at": ISO8601 str
            }
        """
        ran_at = datetime.now(timezone.utc).isoformat()
        results = []

        for ep in _ENDPOINTS:
            result = self._check_endpoint(ep)
            results.append(result)
            self._update_consecutive_fails(ep["name"], result["status"])

        summary = {
            "pass": sum(1 for r in results if r["status"] == "PASS"),
            "fail": sum(1 for r in results if r["status"] == "FAIL"),
            "skip": sum(1 for r in results if r["status"] == "SKIP"),
        }

        # 分類（Tier 3 連携）
        classification = None
        has_external_fail = summary["fail"] > 0
        if has_external_fail and internal_tier1_passed is True:
            classification = "flask_runtime_failure"
        elif has_external_fail and internal_tier1_passed is False:
            classification = "internal_and_external_failure"
        elif has_external_fail:
            classification = "external_failure"

        report = {
            "results": results,
            "summary": summary,
            "classification": classification,
            "ran_at": ran_at,
        }

        self._save_log(report)

        status_icon = "✅" if summary["fail"] == 0 else "❌"
        logger.info(
            "[EXT_HEALTH] %s PASS:%d FAIL:%d SKIP:%d%s",
            status_icon,
            summary["pass"],
            summary["fail"],
            summary["skip"],
            f" classification={classification}" if classification else "",
        )

        # 連続 FAIL 通知
        self._notify_if_needed(results)

        return report

    # ──────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────

    def _check_endpoint(self, ep: dict) -> dict:
        """単一エンドポイントを HTTP チェックする。"""
        url = _BASE_URL + ep["path"]
        try:
            start = time.monotonic()
            resp = requests.request(ep["method"], url, timeout=LATENCY_THRESHOLD_SEC + 1)
            latency = round(time.monotonic() - start, 3)

            status_ok = resp.status_code <= ep["expected_status_max"]
            latency_ok = latency <= LATENCY_THRESHOLD_SEC

            if status_ok and latency_ok:
                return {
                    "name": ep["name"],
                    "status": "PASS",
                    "http_status": resp.status_code,
                    "latency_sec": latency,
                    "reason": None,
                }
            else:
                reasons = []
                if not status_ok:
                    reasons.append(f"http_{resp.status_code}")
                if not latency_ok:
                    reasons.append(f"latency_{latency}s_over_{LATENCY_THRESHOLD_SEC}s")
                return {
                    "name": ep["name"],
                    "status": "FAIL",
                    "http_status": resp.status_code,
                    "latency_sec": latency,
                    "reason": "; ".join(reasons),
                }
        except requests.exceptions.ConnectionError:
            return {
                "name": ep["name"],
                "status": "FAIL",
                "http_status": None,
                "latency_sec": None,
                "reason": "connection_refused",
            }
        except requests.exceptions.Timeout:
            return {
                "name": ep["name"],
                "status": "FAIL",
                "http_status": None,
                "latency_sec": LATENCY_THRESHOLD_SEC,
                "reason": f"timeout_over_{LATENCY_THRESHOLD_SEC}s",
            }
        except Exception as e:
            return {
                "name": ep["name"],
                "status": "FAIL",
                "http_status": None,
                "latency_sec": None,
                "reason": str(e),
            }

    def _update_consecutive_fails(self, name: str, status: str) -> None:
        if status == "FAIL":
            self._consecutive_fails[name] = self._consecutive_fails.get(name, 0) + 1
        else:
            self._consecutive_fails[name] = 0

    def _notify_if_needed(self, results: list[dict]) -> None:
        """連続 FAIL が閾値に達したエンドポイントを Telegram 通知する。"""
        triggered = [
            r for r in results
            if r["status"] == "FAIL"
            and self._consecutive_fails.get(r["name"], 0) >= CONSECUTIVE_FAIL_THRESHOLD
        ]
        if not triggered:
            return

        try:
            from backend.integrations.telegram_bot import TelegramBot
            bot = TelegramBot()
            lines = [f"*[Sage 外部ヘルスチェック ALERT]*"]
            for r in triggered:
                lines.append(
                    f"• `{r['name']}` — {CONSECUTIVE_FAIL_THRESHOLD} 回連続 FAIL"
                    f" (reason: {r.get('reason', '?')})"
                )
            lines.append(f"_ran_at: {datetime.now(timezone.utc).isoformat()}_")
            bot.send_message("\n".join(lines))
            logger.warning("[EXT_HEALTH] Telegram alert sent for: %s", [r["name"] for r in triggered])
        except Exception as e:
            logger.error("[EXT_HEALTH] Telegram notify failed: %s", e)

    def _save_log(self, report: dict) -> None:
        """logs/external_test/YYYY-MM-DD.json に追記する。"""
        try:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            log_file = _LOG_DIR / f"{today}.json"

            existing: list = []
            if log_file.exists():
                try:
                    existing = json.loads(log_file.read_text(encoding="utf-8"))
                    if not isinstance(existing, list):
                        existing = []
                except Exception:
                    existing = []

            existing.append(report)
            log_file.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning("[EXT_HEALTH] Log save failed: %s", e)
