"""API-1: /api/productize/execute"""
import pytest
import requests

BASE_URL = "http://localhost:5001"
EXECUTE_URL = f"{BASE_URL}/api/productize/execute"


def post_execute(payload, timeout=90):
    return requests.post(EXECUTE_URL, json=payload, timeout=timeout)


class TestProductizeExecuteHappyPath:
    def test_required_top_level_keys(self):
        resp = post_execute({"topic": "AI side hustle for solopreneurs"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        data = resp.json()
        result = data.get("result", data)
        for key in ["sections", "sales_page", "blog_post", "captions", "product_hook", "bonus_stack", "launch_checklist"]:
            assert key in result, f"Missing key in result: '{key}'"

    def test_sections_count(self):
        resp = post_execute({"topic": "AI side hustle for solopreneurs"})
        data = resp.json()
        result = data.get("result", data)
        sections = result.get("sections", [])
        if isinstance(sections, list):
            assert len(sections) >= 5, f"Expected >=5 sections, got {len(sections)}"
        elif isinstance(sections, str):
            assert len(sections) > 50, "sections string too short"
        else:
            pytest.fail(f"Unexpected sections type: {type(sections)}")

    def test_bonus_stack_has_three_items(self):
        resp = post_execute({"topic": "AI side hustle for solopreneurs"})
        data = resp.json()
        result = data.get("result", data)
        bonus = result.get("bonus_stack", [])
        if isinstance(bonus, list):
            assert len(bonus) == 3, f"bonus_stack should have 3 items, got {len(bonus)}"
        elif isinstance(bonus, str):
            assert len(bonus) > 0, "bonus_stack string is empty"

    def test_launch_checklist_not_empty(self):
        resp = post_execute({"topic": "AI side hustle for solopreneurs"})
        data = resp.json()
        result = data.get("result", data)
        checklist = result.get("launch_checklist", [])
        if isinstance(checklist, list):
            assert len(checklist) > 0, "launch_checklist must not be empty"
        elif isinstance(checklist, str):
            assert len(checklist.strip()) > 0, "launch_checklist string is empty"

    def test_product_hook_not_empty(self):
        resp = post_execute({"topic": "AI side hustle for solopreneurs"})
        data = resp.json()
        result = data.get("result", data)
        hook = result.get("product_hook", "")
        assert isinstance(hook, str) and len(hook.strip()) > 0, "product_hook must be a non-empty string"


class TestProductizeExecuteErrorCases:
    def test_missing_topic_returns_400(self):
        resp = requests.post(EXECUTE_URL, json={}, timeout=10)
        assert resp.status_code in (400, 422), f"Expected 4xx for missing topic, got {resp.status_code}"

    def test_error_response_has_message(self):
        resp = requests.post(EXECUTE_URL, json={}, timeout=10)
        data = resp.json()
        has_error = "error" in data or "message" in data or "detail" in data
        assert has_error, f"Error response must include 'error', 'message', or 'detail'. Got: {data}"
