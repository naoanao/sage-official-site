"""Characterization tests for content routes (Phase 5 — content_bp)."""
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


class TestKnowledge:
    """GET /api/knowledge — returns knowledge base."""

    def test_get_knowledge_returns_list(self, client):
        resp = client.get('/api/knowledge')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)


class TestGetContent:
    """GET /api/content[/<path:content_path>] — content listing."""

    def test_get_content_root(self, client):
        resp = client.get('/api/content')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)

    def test_get_content_nested(self, client):
        resp = client.get('/api/content/blogs')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)


class TestDeleteContent:
    """DELETE /api/content — deletes content."""

    def test_delete_missing_path_returns_400(self, client):
        resp = client.delete('/api/content', json={})
        assert resp.status_code == 400

    def test_delete_valid_path_returns_200(self, client):
        resp = client.delete('/api/content', json={"path": "test_delete.md"})
        assert resp.status_code == 200

    def test_delete_returns_status(self, client):
        resp = client.delete('/api/content', json={"path": "test_delete.md"})
        data = resp.get_json()
        assert 'status' in data


class TestContentCRUD:
    """POST /api/content (create) and PUT /api/content (update)."""

    def test_create_missing_path_returns_400(self, client):
        resp = client.post('/api/content', json={"content": "hello"})
        assert resp.status_code == 400

    def test_create_missing_content_returns_400(self, client):
        resp = client.post('/api/content', json={"path": "test.md"})
        assert resp.status_code == 400

    def test_create_valid_returns_200(self, client):
        resp = client.post('/api/content', json={"path": "test_create.md", "content": "hello"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'created'

    def test_update_nonexistent_returns_200(self, client):
        resp = client.put('/api/content', json={"path": "nonexistent.md", "content": "update"})
        assert resp.status_code == 200

    def test_update_valid_returns_200(self, client):
        client.post('/api/content', json={"path": "test_update.md", "content": "original"})
        resp = client.put('/api/content', json={"path": "test_update.md", "content": "updated"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['status'] == 'updated'


class TestFiles:
    """GET /api/files/<path:filename> — serve static files."""

    def test_nonexistent_file_returns_404(self, client):
        resp = client.get('/api/files/nonexistent.png')
        assert resp.status_code == 404

    def test_list_directory(self, client):
        resp = client.get('/api/files/')
        assert resp.status_code in (200, 404)


class TestPDFUpload:
    """POST /api/files/upload-pdf — PDF upload."""

    def test_upload_without_file_returns_400(self, client):
        resp = client.post('/api/files/upload-pdf', data={})
        assert resp.status_code == 400


class TestVideoGeneration:
    """POST /api/video/generate — video generation trigger."""

    def test_generate_missing_topic_returns_400(self, client):
        resp = client.post('/api/video/generate', json={})
        assert resp.status_code == 400

    def test_generate_with_topic_returns_202(self, client):
        resp = client.post('/api/video/generate', json={"topic": "AI"})
        assert resp.status_code in (200, 202)


class TestImages:
    """GET /api/images — list images."""

    def test_list_images(self, client):
        resp = client.get('/api/images')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
