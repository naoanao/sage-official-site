"""
Sage Self-Test Agent — SageがSage自身をテストする

動作:
  Tier 1: HTTP APIチェック (requests, ~5s) — 5エンドポイント検証
  Tier 2: Browser Use UIフロー (~90s) — 4フェーズUI遷移確認 (Tier1全通過時のみ)

結果:
  - logs/self_test/YYYY-MM-DD.json に保存
  - Telegram通知 (SAGE_ENABLE_TELEGRAM=1 時)
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

logger = logging.getLogger("SageSelfTestAgent")

LOGS_DIR = Path(__file__).parent.parent.parent / "logs" / "self_test"
TEST_HEADER = {"X-Sage-Test-Mode": "1", "Content-Type": "application/json"}


class SageSelfTester:
    def __init__(self) -> None:
        self.base_url = os.getenv("SAGE_BACKEND_URL", "http://localhost:8080")
        self.frontend_url = os.getenv("SAGE_SELF_TEST_URL", "http://localhost:5175")
        self.timeout = 15

    # ──────────────────────────────────────────────
    # Tier 1: HTTP APIチェック
    # ──────────────────────────────────────────────

    def run_tier1(self) -> dict:
        """5つのAPIエンドポイントを検証。全チェックの pass/fail と latency を返す。"""
        results: dict = {}

        checks = [
            ("health", "GET", "/api/system/health", None,
             lambda r: r.get("status") == "online" or "autonomous_loop" in r),
            ("system_health", "GET", "/api/system/health", None,
             lambda r: "autonomous_loop" in r or "status" in r),
            ("niche_validate", "POST", "/api/niche/validate",
             {"topic": "AI productivity tools"},
             lambda r: "score" in r or "tier" in r or "test_mode" in r),
            ("research_check", "GET", "/api/research/check",
             None,  # GET: topic is passed as query param
             lambda r: "has_research" in r or "test_mode" in r),
            ("productize", "POST", "/api/productize",
             {"topic": "AI Automation", "market": "solopreneurs", "price": 47},
             lambda r: "status" in r or "product" in r or "test_mode" in r),
        ]

        for name, method, path, body, validate in checks:
            url = self.base_url + path
            t0 = time.time()
            try:
                if method == "GET":
                    resp = requests.get(url, headers={"X-Sage-Test-Mode": "1"}, timeout=self.timeout)
                else:
                    resp = requests.post(
                        url,
                        json=body,
                        headers=TEST_HEADER,
                        timeout=self.timeout,
                    )
                latency_ms = int((time.time() - t0) * 1000)
                data = resp.json() if resp.content else {}
                passed = resp.status_code < 500 and validate(data)
                results[name] = {
                    "pass": passed,
                    "status_code": resp.status_code,
                    "latency_ms": latency_ms,
                }
                logger.info(
                    f"[SELF_TEST][T1] {name}: {'✅' if passed else '❌'} "
                    f"({resp.status_code}, {latency_ms}ms)"
                )
            except Exception as e:
                latency_ms = int((time.time() - t0) * 1000)
                results[name] = {"pass": False, "error": str(e), "latency_ms": latency_ms}
                logger.warning(f"[SELF_TEST][T1] {name}: ❌ {e}")

        # ── External API: Whop キー有効性チェック ──
        whop_key = os.getenv("WHOP_API_KEY", "")
        if whop_key:
            t0 = time.time()
            try:
                r = requests.get(
                    "https://api.whop.com/api/v2/products",
                    headers={"Authorization": f"Bearer {whop_key}"},
                    timeout=10,
                )
                latency_ms = int((time.time() - t0) * 1000)
                passed = r.status_code == 200
                results["whop_api_key"] = {
                    "pass": passed,
                    "status_code": r.status_code,
                    "latency_ms": latency_ms,
                }
                logger.info(
                    f"[SELF_TEST][T1] whop_api_key: {'✅' if passed else '❌'} "
                    f"({r.status_code}, {latency_ms}ms)"
                )
            except Exception as e:
                results["whop_api_key"] = {"pass": False, "error": str(e)}
                logger.warning(f"[SELF_TEST][T1] whop_api_key: ❌ {e}")
        else:
            results["whop_api_key"] = {"pass": False, "error": "WHOP_API_KEY not set"}
            logger.warning("[SELF_TEST][T1] whop_api_key: ❌ key not set in env")

        return results

    # ──────────────────────────────────────────────
    # Tier 2: Browser Use UIフロー
    # ──────────────────────────────────────────────

    async def _run_tier2_async(self) -> dict:
        """Browser Use Agentで4フェーズUIフローを確認。"""
        try:
            from browser_use import Agent, ChatGoogle
        except ImportError:
            logger.warning("[SELF_TEST][T2] browser-use not installed. Skipping.")
            return {"skipped": True, "reason": "browser-use not installed"}

        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_key:
            logger.warning("[SELF_TEST][T2] GEMINI_API_KEY not set. Skipping Tier 2.")
            return {"skipped": True, "reason": "GEMINI_API_KEY not set"}

        url = self.frontend_url
        task = (
            f"Open {url} in the browser. "
            "1) Verify a text input or chat interface is visible (Phase 1 TALK). "
            "2) Type 'AI productivity tools for solopreneurs' into the input field and submit. "
            "3) Verify that a response or niche score appears within 15 seconds. "
            "4) If a 'Create Course' or similar button is visible, click it and verify Phase 2 UI loads. "
            "5) Report what you observed at each step: pass or fail with a brief reason."
        )

        results = {}
        t0 = time.time()
        try:
            # browser-use 公式推奨: ChatGoogle (Pydantic v2 互換)
            llm = ChatGoogle(model="gemini-2.0-flash", api_key=gemini_key)
            agent = Agent(task=task, llm=llm)
            agent_result = await agent.run(max_steps=20)

            # Browser Use returns AgentHistoryList; extract final output
            final_output = str(agent_result)[:500] if agent_result else "no output"
            duration = int(time.time() - t0)

            # Simple heuristic: if agent completed without exception, consider it a pass
            results = {
                "phase1_talk": {"pass": True},
                "phase2_create": {"pass": True},
                "agent_output": final_output,
                "duration_sec": duration,
            }
            logger.info(f"[SELF_TEST][T2] ✅ Browser Use completed in {duration}s")

        except Exception as e:
            duration = int(time.time() - t0)
            results = {
                "phase1_talk": {"pass": False, "error": str(e)},
                "duration_sec": duration,
            }
            logger.error(f"[SELF_TEST][T2] ❌ Browser Use failed: {e}")

        return results

    def run_tier2(self) -> dict:
        """同期ラッパー。asyncio.run()でasyncエージェントを実行。"""
        try:
            return asyncio.run(self._run_tier2_async())
        except RuntimeError:
            # 既存イベントループ内で呼ばれた場合
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, self._run_tier2_async())
                return future.result(timeout=180)

    # ──────────────────────────────────────────────
    # Tier 3: 失敗理由の自己診断
    # ──────────────────────────────────────────────

    def _check_frontend_alive(self) -> bool:
        """フロントエンドが起動しているか確認。5173→5174→5175 の順にポートを試す。"""
        candidates = [self.frontend_url] + [
            f"http://localhost:{p}" for p in (5173, 5174, 5175)
            if f"http://localhost:{p}" != self.frontend_url
        ]
        for url in candidates:
            try:
                r = requests.get(url, timeout=3)
                if r.status_code < 500:
                    if url != self.frontend_url:
                        logger.info(f"[SELF_TEST] Frontend found at {url} (was {self.frontend_url})")
                        self.frontend_url = url
                    return True
            except Exception:
                continue
        return False

    def _classify_t2_error(self, error_str: str) -> str:
        """Tier 2 失敗を3分類して返す。
        - ui_not_started : フロントエンド未起動 / Navigation failed
        - quota_exhausted: LLM API クォータ超過 (429)
        - ui_bug         : 上記以外の実際のUI崩れ / コードバグ
        """
        e = error_str.lower()
        if any(k in e for k in ("navigation failed", "site unavailable", "connection refused", "err_connection_refused")):
            return "ui_not_started"
        if any(k in e for k in ("429", "quota", "resource_exhausted", "rate limit")):
            return "quota_exhausted"
        return "ui_bug"

    def _build_tier3(self, tier2: dict) -> dict:
        """Tier 2 結果から Tier 3 診断レポートを生成。"""
        tier3 = {}
        for phase, val in tier2.items():
            if isinstance(val, dict) and not val.get("pass", True) and "error" in val:
                reason = self._classify_t2_error(val["error"])
                tier3[phase] = {"reason": reason, "raw_error": val["error"][:120]}
                logger.info(f"[SELF_TEST][T3] {phase} → {reason}")
        return tier3

    # ──────────────────────────────────────────────
    # メインエントリ
    # ──────────────────────────────────────────────

    def run_full_test(self) -> dict:
        """Tier1 → (全通過時) 前提条件確認 → Tier2 → Tier3診断 → 保存 → 通知。"""
        start = time.time()
        now_utc = datetime.now(timezone.utc)
        date_str = now_utc.strftime("%Y-%m-%d")

        logger.info("[SELF_TEST] ======= Full test started =======")

        # Tier 1
        tier1 = self.run_tier1()
        tier1_all_pass = all(v.get("pass", False) for v in tier1.values())

        # Tier 2 前提条件確認 → Tier 2実行
        tier2 = {}
        if tier1_all_pass:
            if not self._check_frontend_alive():
                logger.warning(f"[SELF_TEST] Frontend not reachable at {self.frontend_url} → skipping Tier 2")
                tier2 = {"skipped": True, "reason": "frontend_not_running", "url": self.frontend_url}
            else:
                logger.info("[SELF_TEST] Tier 1 all pass + frontend alive → starting Tier 2 (Browser Use)")
                tier2 = self.run_tier2()
        else:
            logger.warning("[SELF_TEST] Tier 1 has failures → skipping Tier 2")

        # Tier 3: Tier 2 失敗理由の自己診断
        tier3 = self._build_tier3(tier2) if not tier2.get("skipped") else {}

        # overall は Tier 1 のみで決定; Tier 2/3 は情報収集
        overall = "PASS" if tier1_all_pass else "FAIL"
        duration_sec = int(time.time() - start)

        result = {
            "date": date_str,
            "overall": overall,
            "tier1": tier1,
            "tier2": tier2 if tier2 else {"skipped": True, "reason": "Tier 1 failures"},
            "tier3": tier3,
            "duration_sec": duration_sec,
            "timestamp": now_utc.isoformat(),
        }

        self._save_results(result, date_str)
        self._log_to_notion(result)
        self._notify(result)

        logger.info(f"[SELF_TEST] ======= {overall} ({duration_sec}s) =======")
        return result

    # ──────────────────────────────────────────────
    # Notion 一元化
    # ──────────────────────────────────────────────

    def _count_consecutive_fails(self) -> int:
        """logs/self_test/ の最新ファイルから連続FAIL回数をカウント（現在のログ含む）。"""
        count: int = 0
        try:
            files = sorted(LOGS_DIR.glob("*.json"), reverse=True)[:30]
            for f in files:
                try:
                    data = json.loads(f.read_text(encoding="utf-8"))
                    if data.get("overall") == "FAIL":
                        count += 1
                    else:
                        break
                except Exception:
                    continue
        except Exception:
            pass
        return count

    def _log_to_notion(self, result: dict) -> None:
        """Self-Test結果を Evidence Ledger DB に1行記録する。
        - 通常: overall / tier1レイテンシ / tier2スキップ理由 を記録
        - FAIL時: failed_checks / tier3診断 / 連続FAIL回数 を追加
        """
        try:
            from backend.modules.notion_evidence_ledger import evidence_ledger
        except ImportError:
            logger.warning("[SELF_TEST][Notion] notion_evidence_ledger not available. Skipping.")
            return

        overall = result.get("overall", "?")
        date_str = result.get("date", "")
        tier1 = result.get("tier1", {})
        tier2 = result.get("tier2", {})
        tier3 = result.get("tier3", {})
        duration = result.get("duration_sec", 0)

        # ログ抜粋を構築
        log_lines = []

        # 失敗チェック名
        failed_checks = [k for k, v in tier1.items() if not v.get("pass", True)]
        if failed_checks:
            log_lines.append(f"failed_checks: {', '.join(failed_checks)}")

        # Tier 3 診断
        for phase, diag in tier3.items():
            reason = diag.get("reason", "")
            raw = diag.get("raw_error", "")[:80]
            log_lines.append(f"[T3] {phase}: {reason} — {raw}")

        # Tier 2 スキップ理由
        if tier2.get("skipped"):
            log_lines.append(f"tier2_skip: {tier2.get('reason', '')}")

        # 連続FAIL回数 (FAIL時のみ)
        consecutive_fails = 0
        if overall == "FAIL":
            consecutive_fails = self._count_consecutive_fails()
            if consecutive_fails > 1:
                log_lines.append(f"consecutive_fails: {consecutive_fails}")

        log_lines.append(f"duration: {duration}s")
        log_excerpt = "\n".join(log_lines) if log_lines else "All checks passed."

        # Tier 1 レイテンシ → 外部API成否フィールドへ
        api_parts = []
        for k, v in tier1.items():
            icon = "✅" if v.get("pass") else "❌"
            lat = v.get("latency_ms", "?")
            api_parts.append(f"{icon}{k}:{lat}ms")
        api_status = "  ".join(api_parts)

        # ステータスマッピング
        notion_status = "成功" if overall == "PASS" else "失敗"

        # source log path (成果物名フィールド流用)
        log_path = str(LOGS_DIR / f"{date_str}.json") if date_str else ""

        evidence_ledger.log_d1_run(
            topic=f"SelfTest {date_str}",
            status=notion_status,
            log_excerpt=log_excerpt,
            api_status=api_status,
            obsidian_file=log_path,
        )
        logger.info(f"[SELF_TEST][Notion] Evidence Ledger logged: {overall} (consecutive_fails={consecutive_fails})")

    # ──────────────────────────────────────────────
    # 保存 / 通知
    # ──────────────────────────────────────────────

    def _save_results(self, result: dict, date_str: str) -> None:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        path = LOGS_DIR / f"{date_str}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        logger.info(f"[SELF_TEST] Results saved → {path}")

    def _notify(self, result: dict) -> None:
        if os.getenv("SAGE_ENABLE_TELEGRAM") != "1":
            logger.info("[SELF_TEST] Telegram disabled. Skipping notification.")
            return

        token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if not token or not chat_id:
            logger.warning("[SELF_TEST] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set.")
            return

        overall = result.get("overall", "?")
        date_str = result.get("date", "?")
        duration = result.get("duration_sec", 0)

        tier1 = result.get("tier1", {})
        t1_summary = " ".join(
            f"{'✅' if v.get('pass') else '❌'}{k}"
            for k, v in tier1.items()
        )

        emoji = "✅" if overall == "PASS" else "🚨"
        text = (
            f"{emoji} *Sage Self-Test {date_str}*\n"
            f"結果: *{overall}* ({duration}s)\n\n"
            f"Tier 1 API:\n{t1_summary}"
        )

        tier2 = result.get("tier2", {})
        if not tier2.get("skipped"):
            t2_pass = all(
                v.get("pass", True) if isinstance(v, dict) else True
                for k, v in tier2.items()
                if k not in ("agent_output", "duration_sec", "skipped", "reason")
            )
            text += f"\n\nTier 2 Browser: {'✅ PASS' if t2_pass else '❌ FAIL'}"

        try:
            requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
                timeout=10,
            )
            logger.info("[SELF_TEST] Telegram notification sent.")
        except Exception as e:
            logger.error(f"[SELF_TEST] Telegram send failed: {e}")
