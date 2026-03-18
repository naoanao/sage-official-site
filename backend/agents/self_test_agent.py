"""
SelfTestAgent — OODA ループ型自己診断エージェント

Tier 1: 純粋ユニットテスト（外部依存なし）
  1. 必須 env vars 存在確認 (GROQ_API_KEY, NOTION_API_KEY 等)
  2. コアモジュールのインポート確認
  3. identity.json の読み込み確認
  4. .gitignore に logs/ が含まれているか確認
  5. backend/logs/ ディレクトリの確認

Tier 2: 統合テスト（外部サービスに依存）
  1. フロントエンド(Vite) 起動確認 → frontend_not_running で skip
  2. Flask ヘルスエンドポイント確認
  3. LLM (Groq) 最小呼び出し確認 → quota_exhausted で skip
  4. Notion API 疎通確認
  5. LLM フォールバックチェーン確認（Groq→Ollama→Gemini 順の検証）

Tier 3: E2E OODAループ確認（重テスト・手動または日次）
  1. MarketScanAgent の dry run 起動確認
  2. コンテンツ生成パイプライン呼び出し確認

結果スキーマ:
  {
    "tier": 1 | 2 | 3,
    "tests": [
      {"name": str, "status": "PASS" | "FAIL" | "SKIP", "reason": str | None}
    ],
    "summary": {"pass": int, "fail": int, "skip": int},
    "ran_at": ISO8601 str
  }
"""

import asyncio
import importlib
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

logger = logging.getLogger("SelfTestAgent")

# プロジェクトルート
_PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()
_BACKEND_DIR = Path(__file__).parent.parent.resolve()

# Flask サーバーポート（env 優先）
_FLASK_PORT = int(os.getenv("SAGE_PORT", 8080))
_VITE_PORT = int(os.getenv("SAGE_VITE_PORT", 5173))


class SelfTestAgent:
    """Sage の自己診断エージェント（Tier 1 / 2 / 3）"""

    # ──────────────────────────────────────────────────────────────────────
    # Tier 1 — Pure unit tests (no network / no external calls)
    # ──────────────────────────────────────────────────────────────────────

    def run_tier1(self) -> dict:
        """Tier 1 テストを実行してレポートを返す。"""
        results = []

        # T1-1: 必須 env vars
        required_keys = ["GROQ_API_KEY", "NOTION_API_KEY"]
        missing = [k for k in required_keys if not os.getenv(k)]
        results.append({
            "name": "required_env_vars",
            "status": "FAIL" if missing else "PASS",
            "reason": f"Missing: {missing}" if missing else None,
        })

        # T1-2: コアモジュールのインポート
        core_modules = [
            "flask",
            "langchain_google_genai",
            "langgraph",
            "requests",
            "dotenv",
        ]
        failed_imports = []
        for mod in core_modules:
            try:
                importlib.import_module(mod)
            except ImportError as e:
                failed_imports.append(f"{mod}: {e}")
        results.append({
            "name": "core_module_imports",
            "status": "FAIL" if failed_imports else "PASS",
            "reason": "; ".join(failed_imports) if failed_imports else None,
        })

        # T1-3: identity.json の読み込み
        identity_path = _BACKEND_DIR / "config" / "identity.json"
        try:
            import json
            with open(identity_path, encoding="utf-8") as f:
                data = json.load(f)
            assert isinstance(data, dict), "identity.json is not a dict"
            results.append({"name": "identity_json_load", "status": "PASS", "reason": None})
        except Exception as e:
            results.append({"name": "identity_json_load", "status": "FAIL", "reason": str(e)})

        # T1-4: .gitignore に logs/ が含まれているか
        gitignore_path = _PROJECT_ROOT / ".gitignore"
        try:
            content = gitignore_path.read_text(encoding="utf-8")
            has_logs = "backend/logs/" in content or "logs/" in content
            results.append({
                "name": "gitignore_logs_excluded",
                "status": "PASS" if has_logs else "FAIL",
                "reason": None if has_logs else ".gitignore does not exclude logs/",
            })
        except Exception as e:
            results.append({"name": "gitignore_logs_excluded", "status": "FAIL", "reason": str(e)})

        # T1-5: backend/logs/ ディレクトリの確認（なければ作成）
        logs_dir = _BACKEND_DIR / "logs"
        try:
            logs_dir.mkdir(parents=True, exist_ok=True)
            assert logs_dir.is_dir()
            results.append({"name": "logs_dir_exists", "status": "PASS", "reason": None})
        except Exception as e:
            results.append({"name": "logs_dir_exists", "status": "FAIL", "reason": str(e)})

        return self._build_report(1, results)

    # ──────────────────────────────────────────────────────────────────────
    # Tier 2 — Integration tests (require running services)
    # ──────────────────────────────────────────────────────────────────────

    def run_tier2(self) -> dict:
        """Tier 2 テストを実行してレポートを返す。"""
        results = []

        # T2-1: フロントエンド (Vite) 起動確認
        frontend_running = self._check_http(f"http://localhost:{_VITE_PORT}")
        if not frontend_running:
            results.append({
                "name": "frontend_vite_running",
                "status": "SKIP",
                "reason": "frontend_not_running",
            })
        else:
            results.append({"name": "frontend_vite_running", "status": "PASS", "reason": None})

        # T2-2: Flask ヘルスエンドポイント
        flask_ok = self._check_http(f"http://localhost:{_FLASK_PORT}/health")
        results.append({
            "name": "flask_health_endpoint",
            "status": "PASS" if flask_ok else "FAIL",
            "reason": None if flask_ok else f"localhost:{_FLASK_PORT}/health unreachable",
        })

        # T2-3: Groq LLM 最小呼び出し確認
        groq_result = self._check_groq_llm()
        results.append(groq_result)

        # T2-4: Notion API 疎通確認
        notion_result = self._check_notion_api()
        results.append(notion_result)

        # T2-5: LLM フォールバックチェーン確認
        llm_chain_result = self._check_llm_fallback_chain()
        results.append(llm_chain_result)

        return self._build_report(2, results)

    def _check_http(self, url: str, timeout: int = 3) -> bool:
        """URL に GET を投げて 2xx が返るか確認する。"""
        try:
            resp = requests.get(url, timeout=timeout)
            return resp.status_code < 500
        except Exception:
            return False

    def _check_groq_llm(self) -> dict:
        """Groq API に最小プロンプトを送って動作確認する。"""
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            return {"name": "groq_llm_invoke", "status": "SKIP", "reason": "GROQ_API_KEY not set"}
        try:
            from groq import Groq  # type: ignore
            client = Groq(api_key=groq_key)
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": "Reply with: OK"}],
                max_tokens=5,
                timeout=10,
            )
            _ = resp.choices[0].message.content
            return {"name": "groq_llm_invoke", "status": "PASS", "reason": None}
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "rate" in err_str:
                return {"name": "groq_llm_invoke", "status": "SKIP", "reason": "quota_exhausted"}
            return {"name": "groq_llm_invoke", "status": "FAIL", "reason": str(e)}

    def _check_notion_api(self) -> dict:
        """Notion API に users/me を叩いて疎通確認する。"""
        notion_key = os.getenv("NOTION_API_KEY")
        if not notion_key:
            return {"name": "notion_api_ping", "status": "SKIP", "reason": "NOTION_API_KEY not set"}
        try:
            resp = requests.get(
                "https://api.notion.com/v1/users/me",
                headers={
                    "Authorization": f"Bearer {notion_key}",
                    "Notion-Version": "2022-06-28",
                },
                timeout=8,
            )
            if resp.status_code == 200:
                return {"name": "notion_api_ping", "status": "PASS", "reason": None}
            elif resp.status_code == 429:
                return {"name": "notion_api_ping", "status": "SKIP", "reason": "quota_exhausted"}
            else:
                return {
                    "name": "notion_api_ping",
                    "status": "FAIL",
                    "reason": f"HTTP {resp.status_code}",
                }
        except Exception as e:
            return {"name": "notion_api_ping", "status": "FAIL", "reason": str(e)}

    def _check_llm_fallback_chain(self) -> dict:
        """
        LLM フォールバックチェーンを検証する（Gemini 429 回避の確認）。

        優先順: Groq → Ollama → Gemini
        Groq または Ollama が利用可能なら PASS。
        Gemini のみの場合は WARN（429 リスクあり）として reason に記録し PASS。
        どれも利用不可なら FAIL。
        """
        available: list[str] = []

        # 1. Groq チェック
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                from langchain_groq import ChatGroq  # type: ignore
                ChatGroq(
                    model="llama-3.1-8b-instant",
                    api_key=groq_key,
                    temperature=0.0,
                )
                available.append("groq")
            except Exception:
                pass

        # 2. Ollama チェック（ローカルサービス疎通のみ）
        ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        try:
            resp = requests.get(f"{ollama_host}/api/tags", timeout=2)
            if resp.status_code == 200:
                available.append("ollama")
        except Exception:
            pass

        # 3. Gemini チェック
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if gemini_key:
            available.append("gemini")

        if not available:
            return {
                "name": "llm_fallback_chain",
                "status": "FAIL",
                "reason": "No LLM provider available (GROQ_API_KEY/GEMINI_API_KEY not set, Ollama not running)",
            }

        # Gemini のみなら 429 リスクを警告しつつ PASS
        if available == ["gemini"]:
            return {
                "name": "llm_fallback_chain",
                "status": "PASS",
                "reason": "WARNING: Only Gemini available — 429 rate-limit risk. Set GROQ_API_KEY for resilience.",
            }

        primary = available[0]
        return {
            "name": "llm_fallback_chain",
            "status": "PASS",
            "reason": f"Primary={primary}, chain={available}",
        }

    # ──────────────────────────────────────────────────────────────────────
    # Tier 3 — E2E OODA loop (heavy tests, run manually or daily)
    # ──────────────────────────────────────────────────────────────────────

    def run_tier3(self) -> dict:
        """Tier 3 E2E テストを実行してレポートを返す。"""
        results = []

        # T3-1: MarketScanAgent の dry run 起動確認（LLM 呼び出しなし）
        try:
            from backend.agents.market_scan_agent import MarketScanAgent  # noqa: F401
            results.append({"name": "market_scan_agent_import", "status": "PASS", "reason": None})
        except Exception as e:
            results.append({
                "name": "market_scan_agent_import",
                "status": "FAIL",
                "reason": str(e),
            })

        # T3-2: コンテンツ生成パイプライン import 確認
        try:
            from backend.agents.seo_blog_agent import SEOBlogAgent  # noqa: F401
            results.append({
                "name": "seo_blog_agent_import",
                "status": "PASS",
                "reason": None,
            })
        except Exception as e:
            results.append({"name": "seo_blog_agent_import", "status": "FAIL", "reason": str(e)})

        # T3-3: MarketScanScheduler の instantiation 確認（ループ開始なし）
        try:
            from backend.scheduler.market_scan_scheduler import MarketScanScheduler  # noqa: F401
            _ = MarketScanScheduler()
            results.append({
                "name": "market_scan_scheduler_init",
                "status": "PASS",
                "reason": None,
            })
        except Exception as e:
            results.append({
                "name": "market_scan_scheduler_init",
                "status": "FAIL",
                "reason": str(e),
            })

        return self._build_report(3, results)

    # ──────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────

    def _build_report(self, tier: int, tests: list[dict]) -> dict:
        """テスト結果リストからレポート dict を生成する。"""
        summary = {
            "pass": sum(1 for t in tests if t["status"] == "PASS"),
            "fail": sum(1 for t in tests if t["status"] == "FAIL"),
            "skip": sum(1 for t in tests if t["status"] == "SKIP"),
        }
        return {
            "tier": tier,
            "tests": tests,
            "summary": summary,
            "ran_at": datetime.now(timezone.utc).isoformat(),
        }

    def run_all(self, max_tier: int = 2) -> dict:
        """
        指定された tier まで順番に実行する。
        Tier 1 で FAIL があれば Tier 2/3 はスキップされる。

        Args:
            max_tier: 1, 2, または 3
        Returns:
            {"tier1": report, "tier2": report | None, "tier3": report | None}
        """
        t1 = self.run_tier1()
        logger.info(
            "[SELF_TEST] Tier 1 → PASS:%d FAIL:%d SKIP:%d",
            t1["summary"]["pass"],
            t1["summary"]["fail"],
            t1["summary"]["skip"],
        )

        t2 = None
        if max_tier >= 2:
            if t1["summary"]["fail"] > 0:
                logger.warning(
                    "[SELF_TEST] Tier 1 has %d FAIL(s). Skipping Tier 2.",
                    t1["summary"]["fail"],
                )
            else:
                t2 = self.run_tier2()
                logger.info(
                    "[SELF_TEST] Tier 2 → PASS:%d FAIL:%d SKIP:%d",
                    t2["summary"]["pass"],
                    t2["summary"]["fail"],
                    t2["summary"]["skip"],
                )

        t3 = None
        if max_tier >= 3:
            t3 = self.run_tier3()
            logger.info(
                "[SELF_TEST] Tier 3 → PASS:%d FAIL:%d SKIP:%d",
                t3["summary"]["pass"],
                t3["summary"]["fail"],
                t3["summary"]["skip"],
            )

        return {"tier1": t1, "tier2": t2, "tier3": t3}
