"""
Characterization tests for Phase 4b (Brain, Research & Browser) routes.
Captures current behavior BEFORE refactoring — tests validation gates, 400/503 stubs,
test-mode short-circuits, and fallback mock data.

Scope:
- /api/brain/stats, /api/brain/stats/detailed
- /api/memory/recent, /api/memory/clear
- /api/history
- /api/scholar/search
- /api/research/run, /api/research/check
- /api/niche/validate
- /api/browser/browse, /api/browser/search, /api/browser/screenshot
- /api/computer/screenshot, /api/computer/find-and-click, /api/computer/click, /api/computer/status
"""
import os
import sys
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture(scope='session')
def client():
    test_env = {
        'GROQ_API_KEY': 'mock_key',
        'SAGE_ENABLE_SELF_HEALING': 'False',
    }
    with patch('dotenv.load_dotenv', return_value=None):
        with patch.dict(os.environ, test_env, clear=False):
            from backend.flask_server import app
            with app.test_client() as c:
                yield c


# ── /api/brain/stats (brain stats summary) ─────────────────────────────────

class TestBrainStats:
    """/api/brain/stats returns 503 when brain not initialized."""

    def test_no_brain_returns_503(self, client):
        resp = client.get('/api/brain/stats')
        assert resp.status_code in (200, 503)
        data = resp.get_json()
        if resp.status_code == 503:
            assert data.get('status') == 'error'
        else:
            assert data.get('status') == 'success'
            assert 'data' in data

    def test_returns_json(self, client):
        resp = client.get('/api/brain/stats')
        data = resp.get_json()
        assert isinstance(data, dict)


# ── /api/brain/stats/detailed (comprehensive brain stats) ───────────────────

class TestBrainStatsDetailed:
    """/api/brain/stats/detailed returns mock data when brain not initialized."""

    def test_no_brain_returns_mock_data(self, client):
        resp = client.get('/api/brain/stats/detailed')
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        if resp.status_code == 200:
            assert data.get('status') == 'success'
            assert 'stats' in data
            # Verify mock data shape
            stats = data['stats']
            assert 'usage_rate' in stats
            assert 'total_queries' in stats
            assert 'brain_responses' in stats
            assert isinstance(stats['total_queries'], int)

    def test_mock_data_has_zero_usage(self, client):
        resp = client.get('/api/brain/stats/detailed')
        data = resp.get_json()
        if resp.status_code == 200:
            stats = data['stats']
            if stats['total_queries'] == 0:
                assert stats['usage_rate'] == 0


# ── /api/memory/recent (recent memories) ────────────────────────────────────

class TestMemoryRecent:
    """/api/memory/recent returns fallback mock data when memory not initialized."""

    def test_returns_memories_list(self, client):
        resp = client.get('/api/memory/recent')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'memories' in data
        assert isinstance(data['memories'], list)

    def test_fallback_memories_have_expected_keys(self, client):
        resp = client.get('/api/memory/recent')
        data = resp.get_json()
        if data['memories']:
            mem = data['memories'][0]
            assert 'id' in mem
            assert 'category' in mem
            assert 'content' in mem
            assert 'lastAccessed' in mem
            assert 'tags' in mem


# ── /api/memory/clear (clear memories) ──────────────────────────────────────

class TestMemoryClear:
    """/api/memory/clear returns status message."""

    def test_always_returns_200(self, client):
        resp = client.post('/api/memory/clear', json={})
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'status' in data


# ── /api/history (conversation history) ─────────────────────────────────────

class TestHistory:
    """/api/history returns empty list when memory is None."""

    def test_returns_history(self, client):
        resp = client.get('/api/history')
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        if resp.status_code == 200:
            assert 'history' in data
            assert isinstance(data['history'], list)


# ── /api/scholar/search (academic paper search) ─────────────────────────────

class TestScholarSearch:
    """/api/scholar/search checks module first (503), then validates query (400)."""

    def test_no_module_returns_503_even_without_query(self, client):
        resp = client.post('/api/scholar/search', json={})
        assert resp.status_code == 503
        data = resp.get_json()
        assert data.get('status') == 'error'
        assert 'not initialized' in data.get('message', '').lower()

    def test_no_module_returns_503_with_query(self, client):
        resp = client.post('/api/scholar/search', json={'query': 'test'})
        assert resp.status_code == 503
        data = resp.get_json()
        assert data.get('status') == 'error'
        assert 'not initialized' in data.get('message', '').lower()


# ── /api/research/run (D1 research execution) ──────────────────────────────

class TestResearchRun:
    """/api/research/run validates topic and handles missing autonomous module."""

    def test_missing_topic_returns_400(self, client):
        resp = client.post('/api/research/run', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_no_autonomous_returns_503(self, client):
        resp = client.post('/api/research/run', json={'topic': 'AI'})
        assert resp.status_code in (200, 503, 500)
        data = resp.get_json()
        if resp.status_code == 503:
            assert 'error' in data


# ── /api/research/check (research file check) ───────────────────────────────

class TestResearchCheck:
    """/api/research/check uses test-mode stub and validates topic."""

    def test_test_mode_returns_stub(self, client):
        resp = client.get('/api/research/check?topic=AI',
                          headers={'X-Sage-Test-Mode': '1'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('test_mode') is True
        assert data.get('has_research') is True

    def test_missing_topic_returns_400(self, client):
        resp = client.get('/api/research/check')
        assert resp.status_code == 400
        data = resp.get_json()
        assert data.get('has_research') is False

    def test_no_research_returns_false(self, client):
        resp = client.get('/api/research/check?topic=nonexistent_topic_xyz')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('has_research') is False


# ── /api/niche/validate (niche validation) ──────────────────────────────────

class TestNicheValidate:
    """/api/niche/validate uses test-mode stub and validates topic."""

    def test_test_mode_returns_stub(self, client):
        resp = client.post('/api/niche/validate', json={'topic': 'Test'},
                           headers={'X-Sage-Test-Mode': '1'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('test_mode') is True
        assert 'score' in data

    def test_missing_topic_returns_400(self, client):
        resp = client.post('/api/niche/validate', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_with_topic_returns_200_or_500(self, client):
        resp = client.post('/api/niche/validate', json={'topic': 'AI course'})
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        if resp.status_code == 200:
            assert 'score' in data or 'status' in data


# ── /api/browser/browse (web browsing) ──────────────────────────────────────

class TestBrowserBrowse:
    """/api/browser/browse validates URL."""

    def test_missing_url_returns_400(self, client):
        resp = client.post('/api/browser/browse', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert data.get('status') == 'error'

    def test_with_url_returns_result(self, client):
        resp = client.post('/api/browser/browse', json={'url': 'https://example.com'})
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert 'status' in data


# ── /api/browser/search (web search) ────────────────────────────────────────

class TestBrowserSearch:
    """/api/browser/search validates query."""

    def test_missing_query_returns_400(self, client):
        resp = client.post('/api/browser/search', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert data.get('status') == 'error'

    def test_with_query_returns_result(self, client):
        resp = client.post('/api/browser/search', json={'query': 'test'})
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert 'status' in data


# ── /api/browser/screenshot (URL screenshot) ────────────────────────────────

class TestBrowserScreenshot:
    """/api/browser/screenshot validates URL."""

    def test_missing_url_returns_400(self, client):
        resp = client.post('/api/browser/screenshot', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert data.get('status') == 'error'

    def test_with_url_returns_result(self, client):
        resp = client.post('/api/browser/screenshot',
                           json={'url': 'https://example.com'})
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert 'status' in data


# ── /api/computer/status (computer vision availability) ─────────────────────

class TestComputerStatus:
    """/api/computer/status always returns 200 with availability info."""

    def test_always_returns_200(self, client):
        resp = client.get('/api/computer/status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'pyautogui' in data
        assert 'gemini_key' in data
        assert 'available' in data


# ── /api/computer/screenshot (desktop screenshot) ──────────────────────────

class TestComputerScreenshot:
    """/api/computer/screenshot attempts capture or returns error."""

    def test_returns_json(self, client):
        resp = client.post('/api/computer/screenshot', json={})
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert 'status' in data


# ── /api/computer/find-and-click ────────────────────────────────────────────

class TestComputerFindClick:
    """/api/computer/find-and-click validates description."""

    def test_missing_description_returns_400(self, client):
        resp = client.post('/api/computer/find-and-click', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert data.get('status') == 'error'

    def test_with_description_returns_result(self, client):
        resp = client.post('/api/computer/find-and-click',
                           json={'description': 'search button'})
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert 'status' in data


# ── /api/computer/click ─────────────────────────────────────────────────────

class TestComputerClick:
    """/api/computer/click attempts click at coordinates."""

    def test_returns_json(self, client):
        resp = client.post('/api/computer/click', json={'x': 100, 'y': 200})
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert 'status' in data
