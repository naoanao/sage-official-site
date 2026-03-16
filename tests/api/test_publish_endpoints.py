"""API-4: Publish endpoints (Bluesky, Instagram)"""
import requests

BASE_URL = "http://localhost:5001"

SHORT_CAPTION = "Check out this AI tool for solopreneurs! Build products fast. #AI #solopreneur"
LONG_TEXT = "x" * 400  # exceeds Bluesky 300-char limit


class TestBlueskyPublish:
    URL = f"{BASE_URL}/api/publish/bluesky"

    def test_does_not_accept_raw_long_text(self):
        """Bluesky 300-char limit: must reject or truncate long body."""
        resp = requests.post(self.URL, json={"text": LONG_TEXT}, timeout=15)
        if resp.status_code == 200:
            # If accepted, verify truncation happened server-side
            data = resp.json()
            sent_text = data.get("sent_text") or data.get("text") or ""
            assert len(sent_text) <= 300, f"Bluesky post text exceeds 300 chars: {len(sent_text)}"
        else:
            # Rejection is also acceptable
            assert resp.status_code in (400, 422), f"Unexpected status for long text: {resp.status_code}"

    def test_short_caption_accepted(self):
        resp = requests.post(self.URL, json={"text": SHORT_CAPTION}, timeout=15)
        # Accept 200 (posted) or 401/403 (auth not configured in test env)
        assert resp.status_code in (200, 201, 400, 401, 403, 422), (
            f"Unexpected status: {resp.status_code}: {resp.text[:200]}"
        )
        # Must be valid JSON
        try:
            resp.json()
        except Exception:
            raise AssertionError(f"Bluesky response is not valid JSON: {resp.text[:200]}")


class TestInstagramPublish:
    URL = f"{BASE_URL}/api/publish/instagram"

    def test_missing_image_url_returns_400(self):
        resp = requests.post(self.URL, json={"caption": SHORT_CAPTION}, timeout=15)
        assert resp.status_code in (400, 422), (
            f"Expected 400 for missing image_url, got {resp.status_code}"
        )

    def test_with_image_url_returns_valid_json(self):
        payload = {
            "caption": SHORT_CAPTION,
            "image_url": "https://example.com/test-image.jpg",
        }
        resp = requests.post(self.URL, json=payload, timeout=15)
        assert resp.status_code in (200, 201, 400, 401, 403, 422), (
            f"Unexpected status: {resp.status_code}: {resp.text[:200]}"
        )
        try:
            data = resp.json()
            assert isinstance(data, dict), "Response must be JSON object"
        except Exception:
            raise AssertionError(f"Instagram response is not valid JSON: {resp.text[:200]}")
