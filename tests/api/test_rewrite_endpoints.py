"""API-2: rewrite endpoints for all 8 presets"""
import pytest
import requests

BASE_URL = "http://localhost:5001"
SAMPLE_TEXT = "This AI tool automates your content creation. It saves you hours every week and helps you earn more online."

PRESETS = [
    "casual",
    "professional",
    "bullets",
    "shorter",
    "niche",
    "data",
    "action",
    "remove_failures",
]


def call_rewrite(preset: str, text: str = SAMPLE_TEXT, timeout: int = 30):
    url = f"{BASE_URL}/api/rewrite/{preset}"
    return requests.post(url, json={"text": text, "topic": "AI side hustle"}, timeout=timeout)


@pytest.mark.parametrize("preset", PRESETS)
def test_rewrite_returns_200(preset):
    resp = call_rewrite(preset)
    assert resp.status_code == 200, f"[{preset}] Expected 200, got {resp.status_code}: {resp.text[:200]}"


@pytest.mark.parametrize("preset", PRESETS)
def test_rewrite_text_not_empty(preset):
    resp = call_rewrite(preset)
    assert resp.status_code == 200
    data = resp.json()
    text = data.get("text") or data.get("result") or data.get("rewritten") or ""
    assert len(str(text).strip()) > 0, f"[{preset}] Rewrite returned empty text"


def test_remove_failures_does_not_hang():
    """remove_failures must respond within 30 seconds."""
    import time
    start = time.time()
    resp = call_rewrite("remove_failures", timeout=30)
    elapsed = time.time() - start
    assert elapsed < 30, f"remove_failures took {elapsed:.1f}s (limit: 30s)"
    assert resp.status_code in (200, 400, 500), "remove_failures must return a response, not timeout"


def test_rewrite_error_has_message():
    """Missing text should return structured error."""
    resp = requests.post(f"{BASE_URL}/api/rewrite/casual", json={}, timeout=10)
    assert resp.status_code in (400, 422, 200), f"Unexpected status: {resp.status_code}"
    if resp.status_code >= 400:
        data = resp.json()
        has_msg = "error" in data or "message" in data or "detail" in data
        assert has_msg, f"Error response missing message key: {data}"
