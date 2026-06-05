"""Characterization tests for automation routes (Phase 5)."""
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


class TestGetAutomations:
    """GET /api/automations — returns list of 10 automation objects."""

    def test_returns_list_of_10(self, client):
        resp = client.get('/api/automations')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
        assert len(data) == 10

    def test_each_has_required_keys(self, client):
        resp = client.get('/api/automations')
        data = resp.get_json()
        for item in data:
            assert 'id' in item
            assert 'name' in item
            assert 'active' in item
            assert isinstance(item['active'], bool)

    def test_known_ids_present(self, client):
        resp = client.get('/api/automations')
        data = resp.get_json()
        ids = {item['id'] for item in data}
        for expected in ('bluesky', 'blog', 'gumroad', 'engagement', 'market_scan'):
            assert expected in ids

    def test_default_all_active(self, client):
        resp = client.get('/api/automations')
        data = resp.get_json()
        for item in data:
            assert item['active'] is True


class TestToggleAutomation:
    """POST /api/automations/toggle — toggles on/off."""

    def test_toggle_missing_id_returns_400(self, client):
        resp = client.post('/api/automations/toggle', json={})
        assert resp.status_code == 400

    def test_toggle_empty_body_returns_500(self, client):
        resp = client.post('/api/automations/toggle', json={})
        assert resp.status_code == 400

    def test_toggle_disable_bluesky(self, client):
        resp = client.post('/api/automations/toggle', json={"id": "bluesky", "active": False})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['active'] is False

    def test_toggle_reenable_bluesky(self, client):
        resp = client.post('/api/automations/toggle', json={"id": "bluesky", "active": True})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['active'] is True


class TestAutomationLogs:
    """GET /api/automations/<id>/logs — returns logs for automation."""

    def test_unknown_automation_returns_empty_logs(self, client):
        resp = client.get('/api/automations/nonexistent/logs')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['automation_id'] == 'nonexistent'
        assert isinstance(data['logs'], list)

    def test_known_automation_with_mocked_log_file(self, client):
        resp = client.get('/api/automations/bluesky/logs?limit=5')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['automation_id'] == 'bluesky'

    def test_log_limit_param(self, client):
        resp = client.get('/api/automations/blog/logs?limit=3')
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data['logs']) <= 3

    def test_missing_log_file_returns_empty(self, client):
        resp = client.get('/api/automations/blog/logs')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data['logs'], list)


class TestTriggerAutomation:
    """POST /api/automations/<id>/trigger — triggers automation."""

    def test_trigger_unsupported_returns_422(self, client):
        resp = client.post('/api/automations/nonexistent/trigger', json={})
        assert resp.status_code == 422

    def test_trigger_disabled_returns_403(self, client):
        client.post('/api/automations/toggle', json={"id": "bluesky", "active": False})
        resp = client.post('/api/automations/bluesky/trigger', json={})
        assert resp.status_code == 403

    def test_trigger_reenabled_returns_triggered(self, client):
        client.post('/api/automations/toggle', json={"id": "bluesky", "active": True})
        resp = client.post('/api/automations/bluesky/trigger', json={})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'triggered'
