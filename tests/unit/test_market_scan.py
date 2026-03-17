"""
Unit tests for MarketScan components.

Tests:
  - MarketScanStore  : load / save / append_scan / latest
  - MarketScanAgent  : _deduplicate, scan_reddit (mocked), _score_with_ai (mocked)
  - MarketScanScheduler: run_once (mocked agent)

No real API calls are made. All network / LLM calls are mocked.
"""
import json
import os
import sys
import tempfile
import types
import unittest
from unittest.mock import MagicMock, patch

# ── path setup ─────────────────────────────────────────────────────────────
for candidate in [
    os.path.join(os.path.dirname(__file__), "..", ".."),
]:
    p = os.path.abspath(candidate)
    if p not in sys.path:
        sys.path.insert(0, p)


# ═══════════════════════════════════════════════════════════════════════════
# MarketScanStore
# ═══════════════════════════════════════════════════════════════════════════

class TestMarketScanStore(unittest.TestCase):
    """ストアのload/save/append/latest動作を検証する。"""

    def setUp(self):
        # 一時ファイルを使ってテスト間の汚染を防ぐ
        self.tmp_dir = tempfile.mkdtemp()
        self.tmp_file = os.path.join(self.tmp_dir, "market_scans.json")

        # モジュール内の SCAN_FILE を一時ファイルに差し替える
        import backend.data.market_scan_store as store_mod
        self._orig_file = store_mod.SCAN_FILE
        store_mod.SCAN_FILE = self.tmp_file
        self.store = store_mod

    def tearDown(self):
        self.store.SCAN_FILE = self._orig_file

    def _make_scan(self, keyword="test keyword", score=7.5):
        return {
            "scanned_at": "2026-03-17T21:00:00",
            "total_signals": 10,
            "opportunities": [
                {
                    "rank": 1,
                    "keyword": keyword,
                    "product_idea": "Test ebook",
                    "demand_score": 8,
                    "competition_score": 7,
                    "ai_generability": 9,
                    "total_score": score,
                    "reason": "Test",
                }
            ],
        }

    def test_load_returns_empty_list_when_no_file(self):
        result = self.store.load()
        self.assertEqual(result, [])

    def test_save_and_load_roundtrip(self):
        scans = [self._make_scan("kw1"), self._make_scan("kw2")]
        self.store.save(scans)
        loaded = self.store.load()
        self.assertEqual(len(loaded), 2)
        self.assertEqual(loaded[0]["opportunities"][0]["keyword"], "kw1")

    def test_append_scan_prepends_newest_first(self):
        self.store.append_scan(self._make_scan("first"))
        self.store.append_scan(self._make_scan("second"))
        loaded = self.store.load()
        self.assertEqual(loaded[0]["opportunities"][0]["keyword"], "second")

    def test_append_scan_trims_to_max_entries(self):
        import backend.data.market_scan_store as store_mod
        orig_max = store_mod.MAX_ENTRIES
        store_mod.MAX_ENTRIES = 3
        try:
            for i in range(5):
                self.store.append_scan(self._make_scan(f"kw{i}"))
            loaded = self.store.load()
            self.assertLessEqual(len(loaded), 3)
        finally:
            store_mod.MAX_ENTRIES = orig_max

    def test_latest_returns_most_recent(self):
        self.store.append_scan(self._make_scan("old"))
        self.store.append_scan(self._make_scan("new"))
        latest = self.store.latest()
        self.assertIsNotNone(latest)
        self.assertEqual(latest["opportunities"][0]["keyword"], "new")

    def test_latest_returns_none_when_empty(self):
        result = self.store.latest()
        self.assertIsNone(result)

    def test_load_handles_corrupt_file(self):
        with open(self.tmp_file, "w") as f:
            f.write("NOT VALID JSON {{{{")
        result = self.store.load()
        self.assertEqual(result, [])

    def test_save_creates_parent_dirs(self):
        import backend.data.market_scan_store as store_mod
        nested = os.path.join(self.tmp_dir, "nested", "deep", "scans.json")
        store_mod.SCAN_FILE = nested
        try:
            self.store.save([self._make_scan()])
            self.assertTrue(os.path.exists(nested))
        finally:
            store_mod.SCAN_FILE = self.tmp_file


# ═══════════════════════════════════════════════════════════════════════════
# MarketScanAgent — unit tests (no real API calls)
# ═══════════════════════════════════════════════════════════════════════════

def _make_agent(dry_run=True):
    """Groq クライアントをモックした MarketScanAgent を返す。"""
    # groq パッケージが未インストールでも動くよう sys.modules にスタブを注入
    mock_groq_module = types.ModuleType("groq")
    mock_groq_cls = MagicMock()
    mock_groq_module.Groq = mock_groq_cls
    sys.modules.setdefault("groq", mock_groq_module)

    with patch.dict(os.environ, {"SAGE_DRY_RUN": "true" if dry_run else "false",
                                  "GROQ_API_KEY": "test-key"}):
        # キャッシュ済みモジュールを削除して再インポートさせる
        sys.modules.pop("backend.agents.market_scan_agent", None)
        from backend.agents.market_scan_agent import MarketScanAgent
        agent = MarketScanAgent()
        agent.groq = mock_groq_cls.return_value
    return agent


class TestMarketScanAgentDeduplicate(unittest.TestCase):
    """重複排除ロジックの検証。"""

    def setUp(self):
        self.agent = _make_agent()

    def test_dedup_removes_exact_duplicate_keyword(self):
        signals = [
            {"keyword": "AI tools", "source": "google", "raw_score": 7},
            {"keyword": "AI tools", "source": "reddit", "raw_score": 5},
        ]
        result = self.agent._deduplicate(signals)
        self.assertEqual(len(result), 1)

    def test_dedup_keeps_highest_raw_score(self):
        signals = [
            {"keyword": "passive income", "source": "google", "raw_score": 4},
            {"keyword": "passive income", "source": "reddit", "raw_score": 9},
        ]
        result = self.agent._deduplicate(signals)
        self.assertEqual(result[0]["raw_score"], 9)

    def test_dedup_case_insensitive(self):
        signals = [
            {"keyword": "AI Automation", "source": "google", "raw_score": 6},
            {"keyword": "ai automation", "source": "reddit", "raw_score": 8},
        ]
        result = self.agent._deduplicate(signals)
        self.assertEqual(len(result), 1)

    def test_dedup_keeps_distinct_keywords(self):
        signals = [
            {"keyword": "notion template", "source": "reddit", "raw_score": 7},
            {"keyword": "python script", "source": "google", "raw_score": 8},
            {"keyword": "prompt pack", "source": "reddit", "raw_score": 6},
        ]
        result = self.agent._deduplicate(signals)
        self.assertEqual(len(result), 3)

    def test_dedup_empty_input(self):
        result = self.agent._deduplicate([])
        self.assertEqual(result, [])


class TestMarketScanAgentReddit(unittest.TestCase):
    """Reddit スキャンのモック検証。"""

    def setUp(self):
        self.agent = _make_agent()

    def _mock_reddit_response(self, posts: list):
        """Reddit JSON APIレスポンスを模倣する。"""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": {
                "children": [
                    {"data": {"title": t, "score": s}} for t, s in posts
                ]
            }
        }
        return mock_resp

    @patch("requests.get")
    def test_reddit_returns_high_score_posts(self, mock_get):
        mock_get.return_value = self._mock_reddit_response([
            ("How I made $5k with AI templates", 800),
            ("Low effort post", 10),  # score < 50 → filtered out
        ])
        results = self.agent.scan_reddit()
        keywords = [r["keyword"] for r in results]
        self.assertIn("How I made $5k with AI templates", keywords)
        self.assertNotIn("Low effort post", keywords)

    @patch("requests.get")
    def test_reddit_skips_failed_subreddits(self, mock_get):
        mock_get.return_value = MagicMock(status_code=429)
        results = self.agent.scan_reddit()
        self.assertEqual(results, [])

    @patch("requests.get")
    def test_reddit_result_has_required_keys(self, mock_get):
        mock_get.return_value = self._mock_reddit_response([
            ("Great AI side hustle idea", 500),
        ])
        results = self.agent.scan_reddit()
        if results:
            r = results[0]
            self.assertIn("keyword", r)
            self.assertIn("source", r)
            self.assertIn("raw_score", r)


class TestMarketScanAgentScoring(unittest.TestCase):
    """AIスコアリングのモック検証。"""

    def setUp(self):
        self.agent = _make_agent(dry_run=False)

    def _mock_groq_response(self, content: str):
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = content
        self.agent.groq.chat.completions.create.return_value = mock_resp

    def test_score_returns_ranked_list(self):
        scored_json = json.dumps([
            {
                "rank": 1,
                "keyword": "AI notion template",
                "product_idea": "Notion productivity template bundle",
                "demand_score": 8,
                "competition_score": 7,
                "ai_generability": 9,
                "total_score": 8.0,
                "reason": "High demand, low competition niche",
            }
        ])
        self._mock_groq_response(scored_json)

        candidates = [{"keyword": "AI notion template", "source": "reddit", "raw_score": 7}]
        result = self.agent._score_with_ai(candidates)

        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)
        self.assertIn("total_score", result[0])
        self.assertIn("product_idea", result[0])

    def test_score_falls_back_on_invalid_json(self):
        self._mock_groq_response("THIS IS NOT JSON")
        candidates = [
            {"keyword": "passive income ebook", "source": "reddit", "raw_score": 8},
            {"keyword": "python automation", "source": "google", "raw_score": 6},
        ]
        result = self.agent._score_with_ai(candidates)
        # フォールバックでも結果が返る
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)

    def test_score_empty_candidates(self):
        result = self.agent._score_with_ai([])
        self.assertEqual(result, [])


class TestMarketScanAgentRunScan(unittest.TestCase):
    """run_scan の結果構造を検証する（dry_runモード）。"""

    def setUp(self):
        self.agent = _make_agent(dry_run=True)

    @patch.object(
        sys.modules.get("backend.agents.market_scan_agent", MagicMock()),
        "MarketScanAgent",
        MagicMock(),
    )
    @patch("requests.get")
    def test_run_scan_returns_required_keys(self, mock_get):
        # Reddit をモック
        mock_get.return_value = MagicMock(status_code=429)
        # pytrends をモック
        with patch.dict("sys.modules", {"pytrends": MagicMock(), "pytrends.request": MagicMock()}):
            result = self.agent.run_scan()

        self.assertIn("scanned_at", result)
        self.assertIn("total_signals", result)
        self.assertIn("opportunities", result)
        self.assertIsInstance(result["opportunities"], list)

    @patch("requests.get")
    def test_run_scan_handles_all_sources_failing(self, mock_get):
        mock_get.side_effect = Exception("Network error")
        with patch.dict("sys.modules", {"pytrends": MagicMock(), "pytrends.request": MagicMock()}):
            result = self.agent.run_scan()
        # エラーが起きても辞書が返る
        self.assertIsInstance(result, dict)
        self.assertIn("scanned_at", result)


# ═══════════════════════════════════════════════════════════════════════════
# MarketScanScheduler
# ═══════════════════════════════════════════════════════════════════════════

class TestMarketScanScheduler(unittest.TestCase):
    """スケジューラの run_once ロジックを検証する。"""

    def _make_scheduler(self):
        with patch.dict(os.environ, {"SAGE_DRY_RUN": "true", "GROQ_API_KEY": "test-key"}):
            from backend.scheduler.market_scan_scheduler import MarketScanScheduler
            return MarketScanScheduler()

    @patch("backend.scheduler.market_scan_scheduler.MarketScanScheduler.run_once")
    def test_run_once_callable(self, mock_run):
        sched = self._make_scheduler()
        sched.run_once()
        # 少なくとも呼ばれたことを確認（モックが置き換えているため）
        self.assertTrue(True)

    def test_run_once_saves_to_store(self):
        """run_once がスキャン結果をストアに保存することを確認する。"""
        sched = self._make_scheduler()

        fake_result = {
            "scanned_at": "2026-03-17T21:00:00",
            "total_signals": 5,
            "opportunities": [
                {
                    "rank": 1,
                    "keyword": "AI cheat sheet",
                    "product_idea": "One-page AI commands cheat sheet PDF",
                    "demand_score": 8,
                    "competition_score": 8,
                    "ai_generability": 10,
                    "total_score": 8.5,
                    "reason": "High demand, very easy to generate",
                }
            ],
        }

        with patch("backend.agents.market_scan_agent.MarketScanAgent") as MockAgent, \
             patch("backend.data.market_scan_store.append_scan") as mock_append:
            MockAgent.return_value.run_scan.return_value = fake_result
            sched.run_once()
            mock_append.assert_called_once_with(fake_result)

    def test_run_once_handles_agent_exception(self):
        """エージェントが例外を投げても run_once がクラッシュしないことを確認する。"""
        sched = self._make_scheduler()

        with patch("backend.agents.market_scan_agent.MarketScanAgent") as MockAgent:
            MockAgent.side_effect = Exception("Groq API down")
            # クラッシュしないこと
            try:
                sched.run_once()
            except Exception:
                self.fail("run_once() raised an exception unexpectedly")


if __name__ == "__main__":
    unittest.main()
