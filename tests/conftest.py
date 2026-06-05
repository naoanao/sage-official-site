import os
import sys
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture(scope='session')
def client():
    """Import the real flask_server app once per session with mocked .env loading."""
    test_env = {
        'GROQ_API_KEY': 'mock_key',
        'SAGE_ENABLE_SELF_HEALING': 'False',
        'SAGE_AUTONOMOUS_ENABLED': 'False',
    }
    with patch('dotenv.load_dotenv', return_value=None):
        with patch.dict(os.environ, test_env, clear=False):
            from backend.flask_server import app

            # Initialize brain so orchestrator/pipeline exist for mocking.
            init_brain_fn = app.config.get('INIT_BRAIN')
            if init_brain_fn:
                init_brain_fn()

            # Mock heavy orchestration/course-gen for instant test execution.
            orch = app.config.get('ORCHESTRATOR')
            if orch:
                orch.run = MagicMock(return_value={
                    "final_response": "Mock response for testing",
                    "output": "Mock output",
                })
            pipe_fn = app.config.get('GET_OR_INIT_PIPELINE')
            if pipe_fn:
                try:
                    pipe = pipe_fn()
                    if pipe:
                        pipe.generate_course = MagicMock(return_value={
                            "status": "success",
                            "tier": "mock",
                            "sections": [{"title": "S1", "content": "C1"}],
                            "course_title": "Mock Course Title",
                            "request_id": "mock-request-id",
                        })
                except Exception:
                    pass

            with app.test_client() as c:
                yield c
