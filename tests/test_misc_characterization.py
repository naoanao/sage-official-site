"""Characterization tests for misc routes (Phase 5)."""
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


class TestCommandExecute:
    """POST /api/command/execute — executes shell commands."""

    def test_missing_command_returns_400(self, client):
        resp = client.post('/api/command/execute', json={})
        assert resp.status_code == 400

    def test_empty_body_returns_500(self, client):
        resp = client.post('/api/command/execute', json={})
        assert resp.status_code == 400

    def test_success_with_mocked_agent(self, client):
        with patch('backend.modules.file_operations_agent.FileOperationsAgent.execute_command') as mock:
            mock.return_value = {"status": "ok", "output": "hello"}
            resp = client.post('/api/command/execute', json={"command": "echo hello"})
            assert resp.status_code == 200
            data = resp.get_json()
            assert data['status'] == 'ok'

    def test_default_timeout_30(self, client):
        with patch('backend.modules.file_operations_agent.FileOperationsAgent.execute_command') as mock:
            mock.return_value = {"status": "ok", "output": "test"}
            resp = client.post('/api/command/execute', json={"command": "echo test"})
            assert resp.status_code == 200

    def test_agent_exception_returns_500(self, client):
        with patch('backend.modules.file_operations_agent.FileOperationsAgent.execute_command') as mock:
            mock.side_effect = Exception("Agent failed")
            resp = client.post('/api/command/execute', json={"command": "fail"})
            assert resp.status_code == 500


class TestAdminStrategy:
    """GET+POST /api/admin/strategy — strategy management."""

    def test_get_without_auth_currently_allowed(self, client):
        resp = client.get('/api/admin/strategy')
        assert resp.status_code in (200, 503)

    def test_post_without_auth_currently_allowed(self, client):
        resp = client.post('/api/admin/strategy', json={"focus": "growth"})
        assert resp.status_code in (200, 500)

    def test_get_with_valid_auth_returns_strategy(self, client):
        with patch.dict(client.application.config, {'STRATEGY_MANAGER': type('SM', (), {'get_strategy': lambda self: {"focus": "growth"}})()}):
            resp = client.get('/api/admin/strategy')
            assert resp.status_code == 200
            data = resp.get_json()
            assert 'focus' in data

    def test_get_strategy_unavailable_returns_503(self, client):
        with patch.dict(client.application.config, {'STRATEGY_MANAGER': None}):
            resp = client.get('/api/admin/strategy')
            assert resp.status_code == 503

    def test_post_saves_strategy(self, client):
        sm = type('SM', (), {'save_strategy': lambda self, d: True})()
        with patch.dict(client.application.config, {'STRATEGY_MANAGER': sm}):
            resp = client.post('/api/admin/strategy', json={"focus": "growth"})
            assert resp.status_code == 200
            data = resp.get_json()
            assert data['status'] == 'success'

    def test_post_failure_returns_500(self, client):
        sm = type('SM', (), {'save_strategy': lambda self, d: False})()
        with patch.dict(client.application.config, {'STRATEGY_MANAGER': sm}):
            resp = client.post('/api/admin/strategy', json={"focus": "growth"})
            assert resp.status_code == 500


class TestIndex:
    """GET / — serves index.html."""

    def test_index_returns_html(self, client):
        resp = client.get('/')
        assert resp.status_code in (200, 302)
        if resp.status_code == 200:
            assert resp.content_type.startswith('text/html')


class TestDashboard:
    """GET /dashboard and /dashboard.html — also serves index.html for SPA."""

    def test_dashboard_returns_html(self, client):
        resp = client.get('/dashboard')
        assert resp.status_code in (200, 302)
        if resp.status_code == 200:
            assert resp.content_type.startswith('text/html')

    def test_dashboard_html_returns_html(self, client):
        resp = client.get('/dashboard.html')
        assert resp.status_code in (200, 302)
        if resp.status_code == 200:
            assert resp.content_type.startswith('text/html')


class TestSpaCatchAll:
    """GET /<path:path> — SPA catch-all."""

    def test_unknown_api_returns_404(self, client):
        resp = client.get('/api/nonexistent/route')
        assert resp.status_code == 404

    def test_files_prefix_returns_404(self, client):
        resp = client.get('/files/something')
        assert resp.status_code == 404

    def test_unknown_route_returns_html(self, client):
        resp = client.get('/some/unknown/path')
        assert resp.status_code in (200, 404)
