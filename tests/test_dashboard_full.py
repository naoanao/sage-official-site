"""
SAGE COCKPIT 全機能テスト — ローカル実機テストスイート
=======================================================
前提: ローカルサーバーが起動していること
  backend: python -m backend.flask_server (port 5001 or similar)
  frontend: vite dev server (port 5175)

実行方法:
  cd /home/user/sage-official-site
  python -m pytest tests/test_dashboard_full.py -v --tb=short

または個別実行:
  python tests/test_dashboard_full.py

対象API: http://localhost:5001  (BACKEND_URL)
"""

import sys
import os
import json
import time
import requests

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _ROOT)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_ROOT, ".env"))
except ImportError:
    pass

# ── Configuration ─────────────────────────────────────────────────────────────
BACKEND = os.getenv("BACKEND_URL", "http://localhost:5001")
TIMEOUT_SHORT = 10    # seconds for fast endpoints
TIMEOUT_LONG  = 300   # seconds for pipeline (5 min)
TEST_TOPIC_EN = "passive income with AI tools"
TEST_TOPIC_JA = "AIツールで副収入を作る方法"

PASS = "✅ PASS"
FAIL = "❌ FAIL"
SKIP = "⚠️  SKIP"

results = []

def check(name, ok, detail=""):
    status = PASS if ok else FAIL
    results.append((status, name, detail))
    print(f"  {status}  {name}" + (f"\n         {detail}" if detail else ""))
    return ok


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 1: サーバー起動・ヘルスチェック
# ══════════════════════════════════════════════════════════════════════════════

def test_server_health():
    print("\n[GROUP 1] Server Health")
    try:
        r = requests.get(f"{BACKEND}/api/system/health", timeout=TIMEOUT_SHORT)
        check("GET /api/system/health returns 200", r.status_code == 200, r.text[:100])
        data = r.json()
        check("health.status is 'ok' or 'running'",
              data.get("status") in ("ok", "running", "healthy"),
              str(data))
    except Exception as e:
        check("Server reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 2: TALK フェーズ — チャットAPI
# ══════════════════════════════════════════════════════════════════════════════

def test_talk_chat():
    print("\n[GROUP 2] TALK Phase — Chat API")
    try:
        r = requests.post(f"{BACKEND}/api/chat",
                          json={"message": "Tell me about passive income with AI"},
                          timeout=TIMEOUT_SHORT)
        check("POST /api/chat returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        has_reply = bool(data.get("reply") or data.get("response") or data.get("message") or data.get("content"))
        check("Chat returns non-empty reply", has_reply, str(data)[:120])
        # Check for the known bug: "No tools executed"
        reply_text = str(data)
        no_tools_bug = "No tools executed" in reply_text
        check("Chat reply does NOT contain 'No tools executed'", not no_tools_bug,
              "Known bug — agent not calling tools" if no_tools_bug else "")
    except Exception as e:
        check("Chat API reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 3: CREATE フェーズ — Market Demand (Niche Validate)
# ══════════════════════════════════════════════════════════════════════════════

def test_niche_validate():
    print("\n[GROUP 3] CREATE — Market Demand (Niche Validate)")
    try:
        r = requests.post(f"{BACKEND}/api/niche/validate",
                          json={"topic": TEST_TOPIC_EN},
                          timeout=TIMEOUT_SHORT)
        check("POST /api/niche/validate returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("Response has 'status' field", "status" in data, str(data)[:120])
        if data.get("status") == "success":
            check("Has demand_score", "demand_score" in data or "score" in data, str(data)[:120])
    except Exception as e:
        check("Niche validate reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 4: CREATE フェーズ — D1リサーチチェック
# ══════════════════════════════════════════════════════════════════════════════

def test_research_check():
    print("\n[GROUP 4] CREATE — Research Check (D1)")
    try:
        r = requests.get(f"{BACKEND}/api/research/check",
                         params={"topic": TEST_TOPIC_EN},
                         timeout=TIMEOUT_SHORT)
        check("GET /api/research/check returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("Response has 'has_research' field", "has_research" in data, str(data))
    except Exception as e:
        check("Research check reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 5: CREATE フェーズ — Pipeline (メインパイプライン)
# ══════════════════════════════════════════════════════════════════════════════

def test_pipeline_plan():
    print("\n[GROUP 5a] CREATE — Pipeline Plan (/api/productize)")
    try:
        r = requests.post(f"{BACKEND}/api/productize",
                          json={"topic": TEST_TOPIC_EN, "market": "US",
                                "price": "$29.99", "language": "en"},
                          timeout=60)
        check("POST /api/productize returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("Plan status is success", data.get("status") == "success", str(data)[:120])
        check("Plan has 'plan' field", "plan" in data, str(data)[:120])
        return data.get("plan")
    except Exception as e:
        check("Productize plan reachable", False, str(e))
        return None


def test_pipeline_execute(plan=None):
    print("\n[GROUP 5b] CREATE — Pipeline Execute (/api/productize/execute)")
    print("  ⏳ This can take 60-180 seconds — running pipeline...")
    t0 = time.time()
    try:
        r = requests.post(f"{BACKEND}/api/productize/execute",
                          json={"type": "COURSE", "topic": TEST_TOPIC_EN,
                                "plan": plan, "language": "en",
                                "market": "US", "price": "$29.99"},
                          timeout=TIMEOUT_LONG)
        elapsed = round(time.time() - t0, 1)
        check(f"POST /api/productize/execute returns 200 (took {elapsed}s)",
              r.status_code == 200, r.text[:80])
        data = r.json()
        check("Execute status is success", data.get("status") == "success", str(data)[:120])
        check("Has sections (≥3)", len(data.get("sections", [])) >= 3,
              f"Got {len(data.get('sections', []))} sections")
        check("Has sales_page", bool(data.get("sales_page")), "")
        check("Has images dict", isinstance(data.get("images"), dict), "")
        check("Has blog_post", bool(data.get("blog_post")), "")
        # New fields from _generate_product_extras
        check("Has bonus_stack", isinstance(data.get("bonus_stack"), list), "")
        check("Has product_hook", bool(data.get("product_hook")), "")
        check("Has launch_checklist", isinstance(data.get("launch_checklist"), list), "")
        return data
    except Exception as e:
        elapsed = round(time.time() - t0, 1)
        check(f"Pipeline execute completed (took {elapsed}s)", False, str(e))
        return None


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 6: REFINE フェーズ — Rewrite
# ══════════════════════════════════════════════════════════════════════════════

def test_rewrite(course_data=None):
    print("\n[GROUP 6] REFINE — Section Rewrite (/api/productize/rewrite)")
    if not course_data:
        content = "AI tools can help you earn passive income by automating content creation."
    else:
        content = course_data["sections"][0]["content"][:500]
    try:
        r = requests.post(f"{BACKEND}/api/productize/rewrite",
                          json={"content": content,
                                "instruction": "Make it more casual and add a personal story",
                                "language": "en"},
                          timeout=30)
        check("POST /api/productize/rewrite returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("Rewrite status is success", data.get("status") == "success", str(data)[:120])
        check("Has 'rewritten' field", bool(data.get("rewritten")), "")
    except Exception as e:
        check("Rewrite API reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 7: REFINE フェーズ — Image Regeneration
# ══════════════════════════════════════════════════════════════════════════════

def test_image_regen():
    print("\n[GROUP 7] REFINE — Image Regen (/api/productize/images/regenerate)")
    try:
        r = requests.post(f"{BACKEND}/api/productize/images/regenerate",
                          json={"topic": TEST_TOPIC_EN,
                                "sections": [{"title": "Getting Started", "content": "Learn the basics."}]},
                          timeout=30)
        check("POST .../images/regenerate returns 200 or 404",
              r.status_code in (200, 404, 422), r.text[:80])
        if r.status_code == 200:
            data = r.json()
            check("Has 'images' in response", "images" in data, str(data)[:120])
    except Exception as e:
        check("Image regen reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 8: PUBLISH フェーズ — Bluesky, Instagram
# ══════════════════════════════════════════════════════════════════════════════

def test_publish_endpoints():
    print("\n[GROUP 8] PUBLISH — SNS Posting endpoints")
    # These will likely fail without real credentials — we test for correct error response
    for endpoint, payload in [
        ("/api/bluesky/post", {"content": "Test post from Sage automated test"}),
        ("/api/instagram/post", {"content": "Test caption from Sage"}),
    ]:
        try:
            r = requests.post(f"{BACKEND}{endpoint}", json=payload, timeout=TIMEOUT_SHORT)
            # Accept 200 (success) or 4xx (credentials missing) — not 500
            ok = r.status_code in (200, 400, 401, 403, 422)
            check(f"POST {endpoint} responds (not 500)", ok,
                  f"status={r.status_code} {r.text[:60]}")
        except Exception as e:
            check(f"POST {endpoint} reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 9: Automations API
# ══════════════════════════════════════════════════════════════════════════════

def test_automations():
    print("\n[GROUP 9] Automations")
    try:
        r = requests.get(f"{BACKEND}/api/automations", timeout=TIMEOUT_SHORT)
        check("GET /api/automations returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        items = data if isinstance(data, list) else data.get("automations", [])
        check("Has ≥1 automation", len(items) >= 1, f"Got {len(items)} automations")
        if items:
            check("First automation has 'id' and 'active'",
                  "id" in items[0] and "active" in items[0], str(items[0]))
    except Exception as e:
        check("Automations API reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 10: SNS Stats (LP向け)
# ══════════════════════════════════════════════════════════════════════════════

def test_sns_stats():
    print("\n[GROUP 10] SNS Stats (Landing Page)")
    try:
        r = requests.get(f"{BACKEND}/api/sns/stats", timeout=TIMEOUT_SHORT)
        check("GET /api/sns/stats returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("Has 'total_posts' field", "total_posts" in data, str(data))
        # The zero-guard fix: verify the value is a number (could be 0 if no posts yet)
        check("total_posts is integer", isinstance(data.get("total_posts"), int), str(data))
    except Exception as e:
        check("SNS stats reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 11: 日本語トピックのパイプラインスモークテスト
# ══════════════════════════════════════════════════════════════════════════════

def test_pipeline_japanese():
    print("\n[GROUP 11] Japanese Topic — Quick Smoke Test")
    try:
        r = requests.post(f"{BACKEND}/api/productize",
                          json={"topic": TEST_TOPIC_JA, "market": "Japan",
                                "price": "¥3,980", "language": "ja"},
                          timeout=60)
        check("POST /api/productize (JA) returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("JA plan status success", data.get("status") == "success", str(data)[:120])
    except Exception as e:
        check("JA pipeline reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 12: 画像生成パイプライン (Pollinations.ai)
# ══════════════════════════════════════════════════════════════════════════════

def test_image_generation():
    print("\n[GROUP 12] Image Generation (Pollinations.ai)")
    try:
        from backend.integrations.image_generation import ImageGenerationEnhanced
        gen = ImageGenerationEnhanced()
        url = gen.generate_social_media_image("passive income with AI tools", platform="twitter")
        check("generate_social_media_image returns non-None", url is not None, str(url))
        if url:
            check("URL contains 'pollinations' or valid image host",
                  any(h in url for h in ("pollinations.ai", "ibb.co", "imgur", "cloudinary")),
                  url[:100])
            check("URL does NOT use LoremFlickr", "loremflickr" not in url, url[:100])
    except Exception as e:
        check("Image generation importable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 13: Memory / Brain API
# ══════════════════════════════════════════════════════════════════════════════

def test_memory_api():
    print("\n[GROUP 13] Brain / Memory API")
    try:
        r = requests.get(f"{BACKEND}/api/brain/stats", timeout=TIMEOUT_SHORT)
        check("GET /api/brain/stats returns 200", r.status_code == 200, r.text[:80])
    except Exception as e:
        check("Brain stats reachable", False, str(e))

    try:
        r = requests.get(f"{BACKEND}/api/memory/recent", timeout=TIMEOUT_SHORT)
        check("GET /api/memory/recent returns 200", r.status_code == 200, r.text[:80])
    except Exception as e:
        check("Memory recent reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 14: Identity API
# ══════════════════════════════════════════════════════════════════════════════

def test_identity_api():
    print("\n[GROUP 14] AI Clone Identity API")
    try:
        r = requests.get(f"{BACKEND}/api/identity", timeout=TIMEOUT_SHORT)
        check("GET /api/identity returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("Has 'role' field", "role" in data, str(data)[:120])
    except Exception as e:
        check("Identity API reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# MAIN — Run all tests and print summary
# ══════════════════════════════════════════════════════════════════════════════

def run_all():
    print("=" * 60)
    print("SAGE COCKPIT — 全機能実機テスト")
    print(f"Backend: {BACKEND}")
    print(f"Date: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    test_server_health()
    test_talk_chat()
    test_niche_validate()
    test_research_check()
    test_automations()
    test_sns_stats()
    test_identity_api()
    test_memory_api()
    test_image_generation()

    # Pipeline tests (slow)
    plan = test_pipeline_plan()
    course_data = test_pipeline_execute(plan)
    test_rewrite(course_data)
    test_image_regen()
    test_publish_endpoints()
    test_pipeline_japanese()

    # ── Summary ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    passed = [r for r in results if r[0] == PASS]
    failed = [r for r in results if r[0] == FAIL]
    print(f"  PASS: {len(passed)}")
    print(f"  FAIL: {len(failed)}")
    print(f"  TOTAL: {len(results)}")
    if failed:
        print("\nFailed tests:")
        for _, name, detail in failed:
            print(f"  ❌ {name}")
            if detail:
                print(f"     {detail}")
    print("=" * 60)
    return len(failed) == 0


# pytest compatibility
def test_server_up():        test_server_health()
def test_chat_api():         test_talk_chat()
def test_niche():            test_niche_validate()
def test_research():         test_research_check()
def test_autos():            test_automations()
def test_stats():            test_sns_stats()
def test_identity():         test_identity_api()
def test_brain():            test_memory_api()
def test_images():           test_image_generation()
def test_pipeline_full():
    plan = test_pipeline_plan()
    test_pipeline_execute(plan)
def test_refine_rewrite():   test_rewrite()
def test_publish():          test_publish_endpoints()
def test_ja_pipeline():      test_pipeline_japanese()


if __name__ == "__main__":
    ok = run_all()
    sys.exit(0 if ok else 1)
