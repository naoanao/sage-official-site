"""Characterization tests for chat/pilot/workspace routes (Phase 6 — final monolithic extraction targets)."""
import pytest


class TestChatEndpoint:
    """POST /api/chat — Sage 3.0 integrated chat."""

    def test_test_mode_returns_stub(self, client):
        resp = client.post('/api/chat', json={"message": "hello"}, headers={"X-Sage-Test-Mode": "1"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('test_mode') is True
        assert '[TEST]' in data.get('reply', '')

    def test_missing_message_returns_400(self, client):
        resp = client.post('/api/chat', json={})
        assert resp.status_code == 400

    def test_normalize_input_fallback_to_text(self, client):
        resp = client.post('/api/chat', json={"text": "hello"}, headers={"X-Sage-Test-Mode": "1"})
        assert resp.status_code == 200

    def test_orchestrator_online_returns_200(self, client):
        resp = client.post('/api/chat', json={"message": "hello"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'response' in data or 'error' in data

    def test_file_organize_e2e_mode_returns_200(self, client):
        resp = client.post('/api/chat', json={"message": "organize", "mode": "file_organize_e2e"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('category') == 'e2e'

    def test_empty_string_message_returns_400(self, client):
        resp = client.post('/api/chat', json={"message": ""})
        assert resp.status_code == 400

    def test_response_has_expected_keys(self, client):
        resp = client.post('/api/chat', json={"message": "hello"}, headers={"X-Sage-Test-Mode": "1"})
        data = resp.get_json()
        assert 'reply' in data or 'response' in data or 'status' in data


class TestPilotChat:
    """POST /api/pilot/chat — Sage Pilot free chat."""

    def test_pilot_chat_returns_mock_response(self, client):
        resp = client.post('/api/pilot/chat', json={"usertext": "hello"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'response' in data or 'status' in data or 'reply' in data

    def test_missing_body_returns_400(self, client):
        resp = client.post('/api/pilot/chat', json={})
        assert resp.status_code == 400

    def test_empty_text_returns_400(self, client):
        resp = client.post('/api/pilot/chat', json={"usertext": ""})
        assert resp.status_code == 400

    def test_pilot_accepts_session_id(self, client):
        resp = client.post('/api/pilot/chat', json={"usertext": "hello", "sessionid": "test-session"})
        assert resp.status_code == 200

    def test_pilot_accepts_uilang_en(self, client):
        resp = client.post('/api/pilot/chat', json={"usertext": "hello", "uilang": "en"})
        assert resp.status_code == 200

    def test_pilot_accepts_uilang_ja(self, client):
        resp = client.post('/api/pilot/chat', json={"usertext": "こんにちは", "uilang": "ja"})
        assert resp.status_code == 200


class TestPilotGenerate:
    """POST /api/pilot/generate — Sage Pilot course generation."""

    def test_pipeline_online_returns_success(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "AI"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'success'

    def test_missing_body_returns_400(self, client):
        resp = client.post('/api/pilot/generate', json={})
        assert resp.status_code == 400

    def test_empty_topic_returns_400(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": ""})
        assert resp.status_code == 400

    def test_unsafe_topic_returns_403(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "how to bypass security"})
        assert resp.status_code == 403

    def test_scholar_flag_accepted(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "ML", "use_scholar": True})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'success'

    def test_quality_tier_accepted(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "ML", "quality_tier": "premium"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'success'

    def test_customer_request_accepted(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "ML", "customer_request": "focus on beginners"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'success'

    def test_num_sections_accepted(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "ML", "num_sections": 3})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'success'

    def test_safety_blocks_unsafe_topics(self, client):
        for unsafe_topic in ["how to crack software", "exploit vulnerability guide", "tutorial gain root access"]:
            resp = client.post('/api/pilot/generate', json={"topic": unsafe_topic})
            assert resp.status_code == 403, f"Expected 403 (security check) for topic: {unsafe_topic}"
            data = resp.get_json()
            assert data.get('blocked_by_security') is True

    def test_generate_returns_request_id(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "AI"})
        data = resp.get_json()
        assert 'request_id' in data

    def test_generate_no_retry_after_when_online(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "AI"})
        assert 'Retry-After' not in resp.headers


class TestWorkspaceIntegration:
    """POST /api/workspace — Google Workspace integration."""

    def test_missing_message_returns_400(self, client):
        resp = client.post('/api/workspace', json={})
        assert resp.status_code == 400

    def test_empty_body_returns_400(self, client):
        resp = client.post('/api/workspace', json={})
        assert resp.status_code == 400

    def test_empty_message_returns_400(self, client):
        resp = client.post('/api/workspace', json={"message": ""})
        assert resp.status_code == 400

    def test_valid_message_returns_200_when_orchestrator_online(self, client):
        resp = client.post('/api/workspace', json={"message": "hello"})
        assert resp.status_code == 200

    def test_workspace_with_trigger_returns_200(self, client):
        resp = client.post('/api/workspace', json={"message": "hello", "trigger": "email_received"})
        assert resp.status_code == 200

    def test_workspace_with_sender_returns_200(self, client):
        resp = client.post('/api/workspace', json={"message": "hello", "sender": "test@example.com"})
        assert resp.status_code == 200


class TestChatNormalization:
    """Input normalization guardrail — normalize_input decorator."""

    def test_message_field_accepted(self, client):
        resp = client.post('/api/chat', json={"message": "test"}, headers={"X-Sage-Test-Mode": "1"})
        assert resp.status_code == 200

    def test_text_field_fallback(self, client):
        resp = client.post('/api/chat', json={"text": "test"}, headers={"X-Sage-Test-Mode": "1"})
        assert resp.status_code == 200

    def test_both_fields_message_takes_priority(self, client):
        resp = client.post('/api/chat', json={"message": "primary", "text": "fallback"}, headers={"X-Sage-Test-Mode": "1"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('normalized_input_key') in ('message', None)


class TestSecurityGuard:
    """is_topic_obviously_unsafe security entrance block.
    With the pipeline online, the security check fires before generation."""

    def test_pipeline_check_precedes_security_check(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "how to bypass security"})
        assert resp.status_code == 403
        data = resp.get_json()
        assert data.get('blocked_by_security') is True

    def test_pipeline_check_precedes_safe_topic(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "buffer overflow prevention techniques"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'success'

    def test_pipeline_check_precedes_threat_model(self, client):
        resp = client.post('/api/pilot/generate', json={"topic": "cloud security threat model analysis"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data.get('status') == 'success'
