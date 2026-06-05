"""Characterization tests for identity routes (inline @app.route in flask_server.py)."""
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


class TestIdentityGet:
    """GET /api/identity — returns identity config."""

    def test_get_identity_structure(self, client):
        resp = client.get('/api/identity')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, dict)

    def test_get_returns_json(self, client):
        resp = client.get('/api/identity')
        assert resp.content_type.startswith('application/json')

    def test_get_returns_defaults_when_no_file(self, client):
        resp = client.get('/api/identity')
        assert resp.status_code == 200


class TestIdentitySave:
    """POST /api/identity — saves identity config."""

    def test_save_valid_identity(self, client):
        resp = client.post('/api/identity', json={
            "role": "test", "niche": "testing", "tone": "professional", "visual_style": "modern"
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'saved'

    def test_save_missing_keys_returns_400(self, client):
        resp = client.post('/api/identity', json={"role": "test"})
        assert resp.status_code == 400

    def test_save_empty_body_returns_400(self, client):
        resp = client.post('/api/identity', json={})
        assert resp.status_code == 400

    def test_save_returns_identity_in_response(self, client):
        payload = {"role": "dev", "niche": "AI", "tone": "casual", "visual_style": "dark"}
        resp = client.post('/api/identity', json=payload)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['identity']['role'] == 'dev'


class TestIdentityDefault:
    """GET /api/identity/default — returns default structure."""

    def test_default_structure(self, client):
        resp = client.get('/api/identity/default')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, dict)

    def test_default_has_all_keys(self, client):
        resp = client.get('/api/identity/default')
        data = resp.get_json()
        for key in ('role', 'niche', 'tone', 'visual_style'):
            assert key in data


class TestIdentityReset:
    """POST /api/identity/reset — resets to defaults."""

    def test_reset_returns_defaults(self, client):
        resp = client.post('/api/identity/reset')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'reset'

    def test_reset_writes_defaults(self, client):
        resp = client.post('/api/identity/reset')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'identity' in data

    def test_reset_idempotent(self, client):
        resp1 = client.post('/api/identity/reset')
        resp2 = client.post('/api/identity/reset')
        assert resp1.status_code == 200
        assert resp2.status_code == 200
