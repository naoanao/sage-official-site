"""
Characterization tests for Phase 3c (Productize/Monetization) routes.
Captures current behavior BEFORE refactoring — tests validation gates + test-mode stubs.

Scope:
- /api/productize, /api/productize/execute
- /api/productize/rewrite, /api/productize/regenerate_images, /api/productize/finalize
- /api/productize/update-whop
- /api/monetization/approve
"""
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


# ── Productize (topic → product plan) ────────────────────────────────────────

class TestProductize:
    """/api/productize — topic → product plan via LLM or stub."""

    def test_test_mode_returns_stub(self, client):
        resp = client.post('/api/productize',
                           json={'topic': 'Test'},
                           headers={'X-Sage-Test-Mode': '1'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'ok'
        assert data.get('test_mode') is True
        assert 'product' in data

    def test_no_topic_no_history_returns_error(self, client):
        resp = client.post('/api/productize', json={})
        assert resp.status_code in (400, 500)
        data = resp.get_json()
        assert 'error' in data

    def test_topic_returns_plan(self, client):
        resp = client.post('/api/productize',
                           json={'topic': 'Python Course'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'ok'
        assert 'plan' in data


# ── Productize Execute ────────────────────────────────────────────────────────

class TestProductizeExecute:
    """/api/productize/execute — run course/article production."""

    def test_missing_topic_returns_400(self, client):
        resp = client.post('/api/productize/execute', json={'type': 'COURSE'})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_missing_type_returns_400(self, client):
        resp = client.post('/api/productize/execute', json={'topic': 'Test'})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_course_no_pipeline_returns_500(self, client):
        with patch.dict(client.application.config, {'COURSE_GEN_GLOBAL': None}):
            resp = client.post('/api/productize/execute',
                               json={'type': 'COURSE', 'topic': 'Test'})
            assert resp.status_code == 500
            data = resp.get_json()
            assert 'error' in data

    def test_invalid_type_returns_400(self, client):
        resp = client.post('/api/productize/execute',
                           json={'type': 'INVALID', 'topic': 'Test'})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data


# ── Productize Rewrite ────────────────────────────────────────────────────────

class TestProductizeRewrite:
    """/api/productize/rewrite — LLM rewrite with instruction."""

    def test_test_mode_returns_stub(self, client):
        resp = client.post('/api/productize/rewrite',
                           json={'content': 'Hello', 'instruction': 'make it fun'},
                           headers={'X-Sage-Test-Mode': '1'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('test_mode') is True
        assert 'rewritten' in data

    def test_missing_content_returns_400(self, client):
        resp = client.post('/api/productize/rewrite',
                           json={'instruction': 'make it fun'})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_missing_instruction_returns_400(self, client):
        resp = client.post('/api/productize/rewrite',
                           json={'content': 'Hello'})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data


# ── Productize Regenerate Images ─────────────────────────────────────────────

class TestProductizeRegenImages:
    """/api/productize/regenerate_images — regenerate course images."""

    def test_no_sections_returns_400(self, client):
        resp = client.post('/api/productize/regenerate_images', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_empty_sections_returns_400(self, client):
        resp = client.post('/api/productize/regenerate_images',
                           json={'sections': []})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data


# ── Productize Finalize ───────────────────────────────────────────────────────

class TestProductizeFinalize:
    """/api/productize/finalize — save final course content."""

    def test_test_mode_returns_stub(self, client):
        resp = client.post('/api/productize/finalize',
                           json={},
                           headers={'X-Sage-Test-Mode': '1'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('test_mode') is True
        assert data.get('status') == 'ok'

    def test_no_sections_returns_400(self, client):
        resp = client.post('/api/productize/finalize', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_with_sections_saves_and_returns_200(self, client):
        resp = client.post('/api/productize/finalize', json={
            'topic': 'Test Course',
            'sections': [{'title': 'Intro', 'content': 'Welcome'}]
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'success'
        assert 'saved_path' in data


# ── Productize Update Whop ────────────────────────────────────────────────────

class TestProductizeUpdateWhop:
    """/api/productize/update-whop — push course to Whop."""

    def test_no_product_id_or_topic_returns_400(self, client):
        resp = client.post('/api/productize/update-whop', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_topic_not_in_registry_returns_200_skipped(self, client):
        resp = client.post('/api/productize/update-whop',
                           json={'topic': 'Nonexistent Topic'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'skipped'
        assert 'reason' in data


# ── Monetization Approve ─────────────────────────────────────────────────────

class TestMonetizationApprove:
    """/api/monetization/approve — manual QA approval (localhost only)."""

    def test_missing_topic_returns_400(self, client):
        resp = client.post('/api/monetization/approve', json={})
        assert resp.status_code == 400
        data = resp.get_json()
        assert 'error' in data

    def test_with_topic_returns_approved(self, client):
        resp = client.post('/api/monetization/approve',
                           json={'topic': 'Test Topic'})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'approved'
