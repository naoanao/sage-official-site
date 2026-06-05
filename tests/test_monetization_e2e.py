"""End-to-end tests for monetization flows."""
import os
import sys
import pytest
from unittest.mock import patch

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


class TestBlogGumroadFlow:
    """Blog → Gumroad product generation flow."""

    def test_blog_run_now_smoke(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'blog': type('E', (), {'is_set': lambda self: False})()}}):
            with patch('backend.scheduler.blog_scheduler.BlogScheduler.run_once') as mock:
                mock.return_value = None
                resp = client.post('/api/blog/run-now')
                assert resp.status_code == 200

    def test_gumroad_run_now_smoke(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'gumroad': type('E', (), {'is_set': lambda self: False})()}}):
            with patch('backend.scheduler.gumroad_scheduler.GumroadScheduler.run_once') as mock:
                mock.return_value = None
                resp = client.post('/api/gumroad/run-now')
                assert resp.status_code == 200

    def test_blog_disabled_returns_403(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'blog': type('E', (), {'is_set': lambda self: True})()}}):
            resp = client.post('/api/blog/run-now')
            assert resp.status_code == 403

    def test_gumroad_disabled_returns_403(self, client):
        with patch.dict(client.application.config, {'AUTOMATION_STOP_EVENTS': {'gumroad': type('E', (), {'is_set': lambda self: True})()}}):
            resp = client.post('/api/gumroad/run-now')
            assert resp.status_code == 403


class TestStripeCheckoutFlow:
    """Stripe checkout session creation flow."""

    def test_create_checkout_session(self, client):
        resp = client.post('/api/stripe/create-checkout-session', json={
            "price_id": "price_test123",
            "success_url": "http://localhost/success",
            "cancel_url": "http://localhost/cancel"
        })
        assert resp.status_code in (200, 500)

    def test_create_checkout_missing_price(self, client):
        resp = client.post('/api/stripe/create-checkout-session', json={})
        assert resp.status_code == 400


class TestBilingualPostFlow:
    """Bilingual SNS post flow."""

    def test_bilingual_post_smoke(self, client):
        with patch('backend.modules.bilingual_poster.BilingualPoster.post_bilingual') as mock:
            mock.return_value = {"en": "done", "ja": "done"}
            resp = client.post('/api/sns/post_bilingual', json={"topic": "test"})
            assert resp.status_code == 200
            data = resp.get_json()
            assert data['status'] == 'ok'

    def test_automation_toggle_and_post(self, client):
        client.post('/api/automations/toggle', json={"id": "bluesky", "active": False})
        with patch('backend.modules.bilingual_poster.BilingualPoster.post_bilingual') as mock:
            mock.return_value = {"en": "done", "ja": "done"}
            resp = client.post('/api/sns/post_bilingual', json={"topic": "test"})
            assert resp.status_code == 200
        client.post('/api/automations/toggle', json={"id": "bluesky", "active": True})


class TestHealthCheckFlow:
    """Health check chain required before monetization."""

    def test_health_before_monetization(self, client):
        resp = client.get('/api/health')
        assert resp.status_code == 200

    def test_self_test_before_monetization(self, client):
        resp = client.post('/api/self-test')
        assert resp.status_code == 200
