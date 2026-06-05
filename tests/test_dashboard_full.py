"""Full integration test for dashboard endpoints."""
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


class TestDashboardHealth:
    """Health-check chain required by dashboard."""

    def test_health_endpoint(self, client):
        resp = client.get('/api/health')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'status' in data

    def test_healing_status_endpoint(self, client):
        resp = client.get('/api/healing-status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, dict)

    def test_self_test_endpoint(self, client):
        resp = client.post('/api/self-test')
        assert resp.status_code == 200


class TestDashboardCore:
    """Core dashboard routes."""

    def test_get_automations(self, client):
        resp = client.get('/api/automations')
        assert resp.status_code == 200

    def test_get_performance_summary(self, client):
        resp = client.get('/api/sns/performance_summary')
        assert resp.status_code == 200

    def test_sync_performance(self, client):
        resp = client.post('/api/sns/sync_performance')
        assert resp.status_code == 200

    def test_get_identity(self, client):
        resp = client.get('/api/identity')
        assert resp.status_code == 200

    def test_get_knowledge(self, client):
        resp = client.get('/api/knowledge')
        assert resp.status_code == 200

    def test_get_products(self, client):
        resp = client.get('/api/store/products')
        assert resp.status_code == 200

    def test_get_orders(self, client):
        resp = client.get('/api/store/orders')
        assert resp.status_code == 200


class TestDashboardAuthFlow:
    """POST /api/auth/check — auth check."""

    def test_auth_check_unauthenticated(self, client):
        resp = client.post('/api/auth/check', json={})
        assert resp.status_code == 200
