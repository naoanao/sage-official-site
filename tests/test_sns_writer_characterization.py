"""Characterization tests for SNS writer / publish routes (Phase 5)."""
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


class TestPostBilingual:
    """POST /api/sns/post_bilingual — bilingual posting."""

    def test_missing_topic_returns_400(self, client):
        resp = client.post('/api/sns/post_bilingual', json={})
        assert resp.status_code == 400

    def test_empty_body_silent_fallback(self, client):
        resp = client.post('/api/sns/post_bilingual', json={})
        assert resp.status_code == 400

    def test_empty_topic_returns_400(self, client):
        resp = client.post('/api/sns/post_bilingual', json={"topic": ""})
        assert resp.status_code == 400

    def test_whitespace_topic_returns_400(self, client):
        resp = client.post('/api/sns/post_bilingual', json={"topic": "   "})
        assert resp.status_code == 400

    def test_success_with_mocked_poster(self, client):
        with patch('backend.modules.bilingual_poster.BilingualPoster.post_bilingual') as mock:
            mock.return_value = {"en": "done", "ja": "done"}
            resp = client.post('/api/sns/post_bilingual', json={"topic": "AI automation"})
            assert resp.status_code == 200
            data = resp.get_json()
            assert data['status'] == 'ok'

    def test_poster_exception_returns_500(self, client):
        with patch('backend.modules.bilingual_poster.BilingualPoster.post_bilingual') as mock:
            mock.side_effect = Exception("Poster failed")
            resp = client.post('/api/sns/post_bilingual', json={"topic": "AI"})
            assert resp.status_code == 500


class TestSyncPerformance:
    """POST /api/sns/sync_performance — sync engagement data."""

    def test_success_with_mocked_tracker(self, client):
        with patch('backend.modules.sns_performance_tracker.SNSPerformanceTracker.sync_and_learn') as mock:
            mock.return_value = {"synced": 5}
            resp = client.post('/api/sns/sync_performance')
            assert resp.status_code == 200
            data = resp.get_json()
            assert data['status'] == 'ok'

    def test_tracker_exception_returns_500(self, client):
        with patch('backend.modules.sns_performance_tracker.SNSPerformanceTracker.sync_and_learn') as mock:
            mock.side_effect = Exception("Tracker failed")
            resp = client.post('/api/sns/sync_performance')
            assert resp.status_code == 500


class TestPerformanceSummary:
    """GET /api/sns/performance_summary — performance summary."""

    def test_success_with_mocked_tracker(self, client):
        with patch('backend.modules.sns_performance_tracker.SNSPerformanceTracker.get_summary') as mock:
            mock.return_value = {"total": 10, "engagement": 0.5}
            resp = client.get('/api/sns/performance_summary')
            assert resp.status_code == 200
            data = resp.get_json()
            assert data['status'] == 'ok'

    def test_tracker_exception_returns_500(self, client):
        with patch('backend.modules.sns_performance_tracker.SNSPerformanceTracker.get_summary') as mock:
            mock.side_effect = Exception("Summary failed")
            resp = client.get('/api/sns/performance_summary')
            assert resp.status_code == 500


class TestBlogRunNow:
    """POST /api/blog/run-now — manual blog trigger."""

    def test_disabled_returns_403(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'blog': type('E', (), {'is_set': lambda self: True})()}}):
            resp = client.post('/api/blog/run-now')
            assert resp.status_code == 403

    def test_reenabled_then_success(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'blog': type('E', (), {'is_set': lambda self: False})()}}):
            with patch('backend.scheduler.blog_scheduler.BlogScheduler', return_value=MagicMock(run_once=MagicMock(return_value=None))):
                resp = client.post('/api/blog/run-now')
                assert resp.status_code == 200

    def test_blog_exception_returns_500(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'blog': type('E', (), {'is_set': lambda self: False})()}}):
            with patch('backend.scheduler.blog_scheduler.BlogScheduler.run_once') as mock:
                mock.side_effect = Exception("Blog failed")
                resp = client.post('/api/blog/run-now')
                assert resp.status_code == 500


class TestGumroadRunNow:
    """POST /api/gumroad/run-now — manual gumroad trigger."""

    def test_disabled_returns_403(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'gumroad': type('E', (), {'is_set': lambda self: True})()}}):
            resp = client.post('/api/gumroad/run-now')
            assert resp.status_code == 403

    def test_reenabled_then_success(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'gumroad': type('E', (), {'is_set': lambda self: False})()}}):
            with patch('backend.scheduler.gumroad_scheduler.GumroadScheduler.run_once') as mock:
                mock.return_value = None
                resp = client.post('/api/gumroad/run-now')
                assert resp.status_code == 200

    def test_gumroad_exception_returns_500(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'gumroad': type('E', (), {'is_set': lambda self: False})()}}):
            with patch('backend.scheduler.gumroad_scheduler.GumroadScheduler.run_once') as mock:
                mock.side_effect = Exception("Gumroad failed")
                resp = client.post('/api/gumroad/run-now')
                assert resp.status_code == 500
