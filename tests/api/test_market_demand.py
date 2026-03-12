"""API-3: /api/niche/validate (market demand)"""
import requests

BASE_URL = "http://localhost:5001"
VALIDATE_URL = f"{BASE_URL}/api/niche/validate"


class TestMarketDemand:
    def test_with_topic_returns_structured_response(self):
        resp = requests.post(VALIDATE_URL, json={"topic": "AI side hustle for solopreneurs"}, timeout=30)
        assert resp.status_code in (200, 206), f"Expected 2xx, got {resp.status_code}: {resp.text[:200]}"
        data = resp.json()
        # Must be a dict the frontend can safely read
        assert isinstance(data, dict), "Response must be a JSON object"

    def test_with_topic_has_frontend_usable_shape(self):
        resp = requests.post(VALIDATE_URL, json={"topic": "AI side hustle for solopreneurs"}, timeout=30)
        data = resp.json()
        # At least one of these fields expected; adapt if schema differs
        usable_keys = {"score", "angle", "format_suggestion", "result", "status", "demand", "validated"}
        found = usable_keys & set(data.keys())
        assert len(found) > 0, f"Response has no known frontend keys. Got: {list(data.keys())}"

    def test_missing_topic_returns_400(self):
        resp = requests.post(VALIDATE_URL, json={}, timeout=10)
        assert resp.status_code in (400, 422), f"Expected 4xx for missing topic, got {resp.status_code}"

    def test_failure_response_is_frontend_safe(self):
        """Even on error the response must be a valid JSON object (not HTML)."""
        resp = requests.post(VALIDATE_URL, json={}, timeout=10)
        try:
            data = resp.json()
            assert isinstance(data, dict), "Error response must be JSON object"
        except Exception:
            raise AssertionError(f"Error response is not valid JSON: {resp.text[:200]}")
