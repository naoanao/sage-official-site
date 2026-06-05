"""Characterization tests for jobs routes (inline @app.route in flask_server.py)."""
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


class TestJobsPipelineStart:
    """POST /api/jobs/pipeline/start — starts pipeline as background job."""

    def test_start_with_topic_returns_202(self, client):
        resp = client.post('/api/jobs/pipeline/start', json={"topic": "AI", "type": "COURSE"})
        assert resp.status_code == 202

    def test_start_without_topic_returns_400(self, client):
        resp = client.post('/api/jobs/pipeline/start', json={"type": "COURSE"})
        assert resp.status_code == 400

    def test_start_empty_body_returns_400(self, client):
        resp = client.post('/api/jobs/pipeline/start', json={})
        assert resp.status_code == 400

    def test_start_returns_uuid_job_id(self, client):
        resp = client.post('/api/jobs/pipeline/start', json={"topic": "ML", "type": "COURSE"})
        assert resp.status_code == 202
        data = resp.get_json()
        assert 'job_id' in data
        assert len(data['job_id']) > 10

    def test_start_multiple_jobs_unique_ids(self, client):
        r1 = client.post('/api/jobs/pipeline/start', json={"topic": "A", "type": "COURSE"})
        r2 = client.post('/api/jobs/pipeline/start', json={"topic": "B", "type": "COURSE"})
        assert r1.get_json()['job_id'] != r2.get_json()['job_id']


class TestJobsStatus:
    """GET /api/jobs/<job_id>/status — poll job status."""

    def test_unknown_job_returns_404(self, client):
        resp = client.get('/api/jobs/nonexistent-12345/status')
        assert resp.status_code == 404

    def test_created_job_returns_status(self, client):
        create = client.post('/api/jobs/pipeline/start', json={"topic": "AI", "type": "COURSE"})
        job_id = create.get_json()['job_id']
        resp = client.get(f'/api/jobs/{job_id}/status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'status' in data

    def test_job_status_has_expected_keys(self, client):
        create = client.post('/api/jobs/pipeline/start', json={"topic": "AI", "type": "COURSE"})
        job_id = create.get_json()['job_id']
        resp = client.get(f'/api/jobs/{job_id}/status')
        data = resp.get_json()
        assert data['status'] in ('running', 'done', 'error')
