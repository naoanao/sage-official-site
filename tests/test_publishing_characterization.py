"""
Characterization tests for Phase 3 (SNS/Publishing) — status-only / read-only routes.
Captures current behavior BEFORE refactoring.

Scope: routes that do NOT call external APIs.
- /api/sns/stats
- /api/telegram/health, /api/bluesky/status, /api/devto/status, /api/notion/status
- /api/engagement/status
- /api/monetization/tags, /api/monetization/stats
"""
import os
import sys
import pytest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture(scope='session')
def client():
    """Import the real flask_server app once per session with mocked .env loading."""
    test_env = {
        'GROQ_API_KEY': 'mock_key',
        'SAGE_ENABLE_SELF_HEALING': 'False',
    }
    with patch('dotenv.load_dotenv', return_value=None):
        with patch.dict(os.environ, test_env, clear=False):
            from backend.flask_server import app
            with app.test_client() as c:
                yield c


# ── SNS Stats (reads local sns_evidence.jsonl) ───────────────────────────────

class TestSNSStats:
    """/api/sns/stats returns zeroed data when no evidence file exists."""

    def test_returns_stats_json(self, client):
        resp = client.get('/api/sns/stats')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'total_posts' in data
        assert isinstance(data['total_posts'], int)
        assert data['total_posts'] >= 0


# ── Telegram Health ──────────────────────────────────────────────────────────

class TestTelegramHealth:
    """/api/telegram/health returns status without external calls."""

    def test_returns_status_json(self, client):
        resp = client.get('/api/telegram/health')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'wired'
        assert 'enabled' in data
        assert 'configured' in data


# ── Bluesky Status ───────────────────────────────────────────────────────────

class TestBlueskyStatus:
    """/api/bluesky/status returns status without external calls."""

    def test_returns_status_json(self, client):
        resp = client.get('/api/bluesky/status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'wired'
        assert 'enabled' in data
        assert 'configured' in data


# ── Dev.to Status ────────────────────────────────────────────────────────────

class TestDevtoStatus:
    """/api/devto/status returns configured/missing status."""

    def test_returns_status_json(self, client):
        resp = client.get('/api/devto/status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'configured' in data
        assert data.get('status') in ('ready', 'missing_key')


# ── Notion Status ────────────────────────────────────────────────────────────

class TestNotionStatus:
    """/api/notion/status returns status without external calls."""

    def test_returns_status_json(self, client):
        resp = client.get('/api/notion/status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'wired'
        assert 'enabled' in data
        assert 'configured' in data


# ── Engagement Status (reads local log files) ────────────────────────────────

class TestEngagementStatus:
    """/api/engagement/status returns ok without external calls."""

    def test_returns_status_json(self, client):
        resp = client.get('/api/engagement/status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'ok'
        assert 'active' in data
        assert 'recent_actions' in data


# ── Monetization Tags (graceful when module not loaded) ──────────────────────

class TestMonetizationTags:
    """/api/monetization/tags returns 503 if MonetizationMeasure not loaded."""

    def test_returns_503_or_data(self, client):
        resp = client.get('/api/monetization/tags')
        data = resp.get_json()
        assert resp.status_code in (200, 503)
        if resp.status_code == 503:
            assert 'error' in data
        else:
            assert data.get('status') in ('success', 'error')


# ── Monetization Stats (graceful when module not loaded) ─────────────────────

class TestMonetizationStats:
    """/api/monetization/stats returns 503 if MonetizationMeasure not loaded."""

    def test_returns_503_or_data(self, client):
        resp = client.get('/api/monetization/stats')
        data = resp.get_json()
        assert resp.status_code in (200, 503)
        if resp.status_code == 503:
            assert 'error' in data
        else:
            assert data.get('status') in ('success', 'error')


# ── Telegram Send (POST, feature-gated) ───────────────────────────────────────

class TestTelegramSend:
    """/api/telegram/send returns 403 when feature disabled."""

    def test_disabled_returns_403(self, client):
        with patch.dict(os.environ, {'SAGE_ENABLE_TELEGRAM': '0'}, clear=False):
            resp = client.post('/api/telegram/send', json={'text': 'test'})
            assert resp.status_code == 403
            data = resp.get_json()
            assert 'error' in data

    def test_no_text_returns_400(self, client):
        with patch.dict(os.environ, {'SAGE_ENABLE_TELEGRAM': '1'}, clear=False):
            resp = client.post('/api/telegram/send', json={})
            assert resp.status_code == 400
            data = resp.get_json()
            assert 'error' in data


# ── Bluesky Post (POST, feature-gated) ────────────────────────────────────────

class TestBlueskyPost:
    """/api/bluesky/post returns 403 when feature disabled."""

    def test_disabled_returns_403(self, client):
        with patch.dict(os.environ, {'SAGE_ENABLE_BLUESKY': '0'}, clear=False):
            resp = client.post('/api/bluesky/post', json={'text': 'test'})
            assert resp.status_code == 403
            data = resp.get_json()
            assert 'error' in data

    def test_no_creds_returns_403(self, client):
        """Without credentials, returns 403 even when feature is enabled."""
        with patch.dict(os.environ, {'SAGE_ENABLE_BLUESKY': '1'}, clear=False):
            resp = client.post('/api/bluesky/post', json={'text': 'test'})
            assert resp.status_code == 403
            data = resp.get_json()
            assert 'error' in data


# ── Dev.to Post (POST, feature-gated) ─────────────────────────────────────────

class TestDevtoPost:
    """/api/devto/post returns 403 when API key not set."""

    def test_no_key_returns_403(self, client):
        with patch.dict(os.environ, {'DEVTO_API_KEY': ''}, clear=False):
            resp = client.post('/api/devto/post',
                               json={'title': 'Test', 'body': 'Hello'})
            assert resp.status_code == 403
            data = resp.get_json()
            assert data.get('status') == 'error'

    def test_no_body_returns_400(self, client):
        with patch.dict(os.environ, {'DEVTO_API_KEY': 'mock_key'}, clear=False):
            resp = client.post('/api/devto/post',
                               json={'title': 'Test', 'body': ''})
            assert resp.status_code == 400
            data = resp.get_json()
            assert data.get('status') == 'error'
