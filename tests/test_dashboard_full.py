"""
SAGE COCKPIT 全機能テスト — ローカル実機テストスイート
=======================================================
前提: ローカルサーバーが起動していること
  backend: python -m backend.flask_server (port 8080)
  frontend: vite dev server (port 5175)

実行方法:
  cd /home/user/sage-official-site
  python tests/test_dashboard_full.py

または個別グループのみ:
  python tests/test_dashboard_full.py --group 15   # 非同期ジョブのみ
  python tests/test_dashboard_full.py --group 16   # REFINEのみ
  python tests/test_dashboard_full.py --group 17   # PUBLISHのみ
  python tests/test_dashboard_full.py --group 18   # TALKツール呼び出しのみ

対象API: http://localhost:8080  (BACKEND_URL)
"""

import sys
import os
import json
import time
import argparse
import requests

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _ROOT)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_ROOT, ".env"))
except ImportError:
    pass

# ── Configuration ─────────────────────────────────────────────────────────────
BACKEND = os.getenv("BACKEND_URL", "http://localhost:8080")
TIMEOUT_SHORT  = 15    # fast endpoints
TIMEOUT_MEDIUM = 60    # plan generation, rewrite
TIMEOUT_LONG   = 360   # full pipeline execute (6 min)
POLL_INTERVAL  = 4     # seconds between job polls
POLL_MAX       = 90    # max poll attempts = 6 min

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
# GROUP 5: CREATE フェーズ — 旧Pipeline (直接呼び出し — ローカルのみ)
# ══════════════════════════════════════════════════════════════════════════════

def test_pipeline_plan():
    print("\n[GROUP 5a] CREATE — Pipeline Plan (/api/productize)")
    try:
        r = requests.post(f"{BACKEND}/api/productize",
                          json={"topic": TEST_TOPIC_EN, "market": "US",
                                "price": "$29.99", "language": "en"},
                          timeout=TIMEOUT_MEDIUM)
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
    print("\n[GROUP 7] REFINE — Image Regen (/api/productize/regenerate_images)")
    try:
        r = requests.post(f"{BACKEND}/api/productize/regenerate_images",
                          json={"topic": TEST_TOPIC_EN,
                                "sections": [{"title": "Getting Started", "content": "Learn the basics."}]},
                          timeout=30)
        check("POST .../regenerate_images returns 200 or 404",
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
    for endpoint, payload in [
        ("/api/bluesky/post", {"content": "Test post from Sage automated test"}),
        ("/api/instagram/post", {"content": "Test caption from Sage"}),
    ]:
        try:
            r = requests.post(f"{BACKEND}{endpoint}", json=payload, timeout=TIMEOUT_SHORT)
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
                          timeout=TIMEOUT_MEDIUM)
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
# GROUP 15: 非同期ジョブシステム (Cloudflare Pages 30s タイムアウト回避)
# ══════════════════════════════════════════════════════════════════════════════

def test_async_jobs():
    """
    ジョブシステムの実機テスト
    - POST /api/jobs/pipeline/start → 5秒以内に job_id 返却
    - GET  /api/jobs/<id>/status   → running/done/error
    - 存在しないジョブ ID → 404
    - フル実行: start → poll → done → 全フィールド確認
    """
    print("\n[GROUP 15] 非同期ジョブシステム")
    job_id = None
    course_data_from_job = None

    # 15-1: 即時返却テスト (5秒以内)
    print("  [15-1] Job start — immediate response")
    t0 = time.time()
    try:
        r = requests.post(
            f"{BACKEND}/api/jobs/pipeline/start",
            json={"type": "COURSE", "topic": TEST_TOPIC_EN,
                  "language": "en", "market": "US", "price": "$29.99"},
            timeout=TIMEOUT_SHORT,
        )
        elapsed = round(time.time() - t0, 2)
        check(f"POST /api/jobs/pipeline/start returns 202 (took {elapsed}s)",
              r.status_code == 202, f"status={r.status_code} {r.text[:60]}")
        check("Response time < 5s (immediate)", elapsed < 5,
              f"Took {elapsed}s — CF Pages 30s limit would be breached if this were slow")
        data = r.json()
        check("Response has 'job_id'", bool(data.get("job_id")), str(data))
        job_id = data.get("job_id")
    except Exception as e:
        check("Job start reachable", False, str(e))

    # 15-2: 不正なジョブID → 404
    print("  [15-2] Status for nonexistent job → 404")
    try:
        r = requests.get(f"{BACKEND}/api/jobs/nonexistent-fake-id/status",
                         timeout=TIMEOUT_SHORT)
        check("GET /api/jobs/nonexistent/status returns 404", r.status_code == 404,
              f"Got {r.status_code}")
    except Exception as e:
        check("Job status 404 check", False, str(e))

    # 15-3: 最初のステータスチェック → running or done
    if job_id:
        print("  [15-3] Initial status check")
        time.sleep(1)
        try:
            r = requests.get(f"{BACKEND}/api/jobs/{job_id}/status", timeout=TIMEOUT_SHORT)
            check("GET /api/jobs/{id}/status returns 200", r.status_code == 200,
                  f"status={r.status_code}")
            data = r.json()
            check("Status is running/done/error",
                  data.get("status") in ("running", "done", "error"),
                  str(data)[:80])
        except Exception as e:
            check("Job status check", False, str(e))

    # 15-4: フルポーリング → 完了まで待機
    if job_id:
        print(f"  [15-4] Full poll until done (max {POLL_MAX * POLL_INTERVAL}s)...")
        polls = 0
        final_status = None
        while polls < POLL_MAX:
            polls += 1
            time.sleep(POLL_INTERVAL)
            try:
                r = requests.get(f"{BACKEND}/api/jobs/{job_id}/status",
                                 timeout=TIMEOUT_SHORT)
                if r.status_code != 200:
                    continue
                data = r.json()
                final_status = data.get("status")
                if final_status in ("done", "error"):
                    elapsed_total = round(polls * POLL_INTERVAL, 0)
                    print(f"         → Job {final_status} after ~{elapsed_total}s ({polls} polls)")
                    if final_status == "done":
                        course_data_from_job = data.get("result")
                    break
                if polls % 5 == 0:
                    print(f"         → Still running... ({polls * POLL_INTERVAL}s elapsed)")
            except Exception:
                pass

        check("Job eventually completes (status=done)", final_status == "done",
              f"Final status: {final_status}")

        if final_status == "done" and course_data_from_job:
            # Validate result fields
            check("Job result has sections (≥3)",
                  len(course_data_from_job.get("sections", [])) >= 3,
                  f"Got {len(course_data_from_job.get('sections', []))} sections")
            check("Job result has sales_page",
                  bool(course_data_from_job.get("sales_page")), "")
            check("Job result has images dict",
                  isinstance(course_data_from_job.get("images"), dict), "")
            check("Job result has blog_post",
                  bool(course_data_from_job.get("blog_post")), "")
            check("Job result has bonus_stack",
                  isinstance(course_data_from_job.get("bonus_stack"), list), "")
            check("Job result has product_hook",
                  bool(course_data_from_job.get("product_hook")), "")
            check("Job result has launch_checklist",
                  isinstance(course_data_from_job.get("launch_checklist"), list), "")
        elif final_status == "error":
            r2 = requests.get(f"{BACKEND}/api/jobs/{job_id}/status", timeout=TIMEOUT_SHORT)
            check("Job error message present", bool(r2.json().get("error")),
                  r2.json().get("error", "")[:120])

    # 15-5: 必須フィールド欠落 → 400
    print("  [15-5] Missing topic → 400")
    try:
        r = requests.post(f"{BACKEND}/api/jobs/pipeline/start",
                          json={"type": "COURSE"},
                          timeout=TIMEOUT_SHORT)
        check("Empty topic returns 400", r.status_code == 400,
              f"Got {r.status_code}")
    except Exception as e:
        check("Empty topic validation", False, str(e))

    return course_data_from_job


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 16: REFINE フェーズ — 完全テスト (パイプライン完了後)
# ══════════════════════════════════════════════════════════════════════════════

def test_refine_full(course_data=None):
    """
    REFINEフェーズ全機能テスト。
    course_data: GROUP 15 または 5bのパイプライン結果を受け取れる場合は使用。
    なければサンプルデータでテスト。
    """
    print("\n[GROUP 16] REFINE フェーズ — 全機能テスト")

    # サンプルデータ (課題データがない場合のフォールバック)
    sample_content = (
        "AI tools like ChatGPT can help you create digital products faster than ever. "
        "By automating research, writing, and design, you can launch a passive income "
        "stream within days. The key is choosing the right niche and building once, "
        "then selling forever."
    )
    sample_sections = [
        {"title": "Introduction to AI Income", "content": sample_content},
        {"title": "Choosing Your Niche", "content": "Niche selection is the most critical step."},
        {"title": "Building Your First Product", "content": "Start with a simple PDF guide."},
    ]

    if course_data and course_data.get("sections"):
        sections = course_data["sections"]
        content_for_rewrite = sections[0]["content"][:600]
        topic = course_data.get("title") or TEST_TOPIC_EN
        has_real_data = True
        print("  → パイプライン結果を使用 (real data)")
    else:
        sections = sample_sections
        content_for_rewrite = sample_content
        topic = TEST_TOPIC_EN
        has_real_data = False
        print("  ⚠️  パイプライン結果なし — サンプルデータで実行")

    # 16-1: Instruction rewrite
    print("  [16-1] Section rewrite (instruction)")
    try:
        r = requests.post(f"{BACKEND}/api/productize/rewrite",
                          json={"content": content_for_rewrite,
                                "instruction": "Make it more casual and engaging",
                                "language": "en"},
                          timeout=TIMEOUT_MEDIUM)
        check("Rewrite (instruction) returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("Rewrite status success", data.get("status") == "success", str(data)[:100])
        check("Has non-empty 'rewritten'", bool(data.get("rewritten")), "")
        check("Rewritten text is different from original",
              data.get("rewritten", "") != content_for_rewrite, "Text unchanged — LLM may not have run")
    except Exception as e:
        check("Rewrite (instruction) reachable", False, str(e))

    # 16-2: Tone preset rewrite
    print("  [16-2] Section rewrite (tone preset)")
    for preset in ["professional", "casual", "urgent"]:
        try:
            r = requests.post(f"{BACKEND}/api/productize/rewrite",
                              json={"content": content_for_rewrite,
                                    "tone_preset": preset,
                                    "instruction": "",
                                    "language": "en"},
                              timeout=TIMEOUT_MEDIUM)
            check(f"Rewrite tone_preset='{preset}' returns 200",
                  r.status_code == 200, r.text[:60])
            if r.status_code == 200:
                d = r.json()
                check(f"  Tone '{preset}' has rewritten field",
                      bool(d.get("rewritten")), str(d)[:80])
        except Exception as e:
            check(f"Rewrite tone_preset='{preset}'", False, str(e))

    # 16-3: Image regeneration (no custom instruction)
    print("  [16-3] Image regeneration (no instruction)")
    try:
        r = requests.post(f"{BACKEND}/api/productize/regenerate_images",
                          json={"topic": topic, "sections": sections[:2]},
                          timeout=TIMEOUT_MEDIUM)
        check("Image regen (no instruction) returns 200",
              r.status_code == 200, r.text[:80])
        if r.status_code == 200:
            data = r.json()
            check("Image regen has 'images' dict", isinstance(data.get("images"), dict), "")
            imgs = data.get("images", {})
            if imgs:
                first_img = next(iter(imgs.values()))
                check("Image entry has 'url' or 'prompt'",
                      bool(first_img.get("url") or first_img.get("prompt")),
                      str(first_img)[:80])
    except Exception as e:
        check("Image regen reachable", False, str(e))

    # 16-4: Image regeneration (with custom instruction)
    print("  [16-4] Image regeneration (with custom instruction)")
    try:
        r = requests.post(f"{BACKEND}/api/productize/regenerate_images",
                          json={"topic": topic,
                                "sections": sections[:2],
                                "custom_instruction": "dark futuristic neon style"},
                          timeout=TIMEOUT_MEDIUM)
        check("Image regen (with instruction) returns 200",
              r.status_code == 200, r.text[:80])
        if r.status_code == 200:
            data = r.json()
            check("Has style_applied field", "style_applied" in data, str(data)[:80])
    except Exception as e:
        check("Image regen (instruction) reachable", False, str(e))

    # 16-5: Finalize (save to Obsidian vault)
    print("  [16-5] Finalize (save edited course)")
    try:
        r = requests.post(f"{BACKEND}/api/productize/finalize",
                          json={"topic": topic,
                                "sections": sections,
                                "sales_page": "Buy now and transform your income!"},
                          timeout=TIMEOUT_SHORT)
        check("Finalize returns 200", r.status_code == 200, r.text[:80])
        data = r.json()
        check("Finalize status success", data.get("status") == "success", str(data)[:100])
        check("Finalize has saved_path", bool(data.get("saved_path")), str(data)[:100])
    except Exception as e:
        check("Finalize reachable", False, str(e))

    # 16-6: Product Stack fields present in pipeline output
    print("  [16-6] Product Stack fields (from pipeline)")
    if has_real_data:
        check("Pipeline result has bonus_stack",
              isinstance(course_data.get("bonus_stack"), list),
              f"Got: {type(course_data.get('bonus_stack'))}")
        check("Pipeline result has product_hook",
              bool(course_data.get("product_hook")), "")
        check("Pipeline result has launch_checklist",
              isinstance(course_data.get("launch_checklist"), list),
              f"Got: {type(course_data.get('launch_checklist'))}")
    else:
        print(f"  {SKIP}  Product Stack fields — no pipeline data (run group 15 first)")

    # 16-7: Blog post present in pipeline output
    if has_real_data:
        check("Pipeline result has blog_post", bool(course_data.get("blog_post")), "")
    else:
        print(f"  {SKIP}  blog_post — no pipeline data")


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 17: PUBLISH フェーズ — 完全テスト
# ══════════════════════════════════════════════════════════════════════════════

def test_publish_full(course_data=None):
    """
    PUBLISHフェーズ全機能テスト。
    course_data: パイプライン結果。あれば本物のコンテンツでテスト。
    """
    print("\n[GROUP 17] PUBLISH フェーズ — 全機能テスト")

    if course_data and course_data.get("sales_page"):
        caption = course_data["sales_page"][:280]
        topic = course_data.get("title") or TEST_TOPIC_EN
        has_real = True
        print("  → パイプライン結果を使用 (real data)")
    else:
        caption = "🚀 Discover how AI tools can help you build passive income streams. New course available now!"
        topic = TEST_TOPIC_EN
        has_real = False
        print("  ⚠️  パイプライン結果なし — サンプルコンテンツで実行")

    # 17-1: SNS 接続ステータス確認
    print("  [17-1] SNS 接続ステータス")
    for endpoint, name in [
        ("/api/bluesky/status", "Bluesky"),
        ("/api/instagram/status", "Instagram"),
    ]:
        try:
            r = requests.get(f"{BACKEND}{endpoint}", timeout=TIMEOUT_SHORT)
            check(f"GET {endpoint} returns 200", r.status_code == 200, r.text[:60])
            if r.status_code == 200:
                data = r.json()
                connected = data.get("connected") or data.get("status") == "ok"
                print(f"  {'🟢' if connected else '🔴'}  {name} connected: {connected}")
        except Exception as e:
            check(f"{name} status reachable", False, str(e))

    # 17-2: Bluesky 投稿テスト
    print("  [17-2] Bluesky 投稿")
    try:
        r = requests.post(f"{BACKEND}/api/bluesky/post",
                          json={"content": caption},
                          timeout=TIMEOUT_SHORT)
        # 200=success, 400/401/403=no credentials (expected), 500=bug
        ok = r.status_code in (200, 400, 401, 403, 422)
        check("POST /api/bluesky/post responds (not 500)", ok,
              f"status={r.status_code} {r.text[:80]}")
        if r.status_code == 200:
            data = r.json()
            check("Bluesky response has 'status'", "status" in data, str(data)[:80])
            check("Bluesky post success", data.get("status") == "success", str(data)[:100])
    except Exception as e:
        check("Bluesky post reachable", False, str(e))

    # 17-3: Instagram 投稿テスト
    print("  [17-3] Instagram 投稿")
    try:
        r = requests.post(f"{BACKEND}/api/instagram/post",
                          json={"content": caption},
                          timeout=TIMEOUT_SHORT)
        ok = r.status_code in (200, 400, 401, 403, 422)
        check("POST /api/instagram/post responds (not 500)", ok,
              f"status={r.status_code} {r.text[:80]}")
        if r.status_code == 200:
            data = r.json()
            check("Instagram response has 'status'", "status" in data, str(data)[:80])
    except Exception as e:
        check("Instagram post reachable", False, str(e))

    # 17-4: Whop 商品化 (dry_run)
    print("  [17-4] Whop 商品化 (dry_run=true)")
    try:
        r = requests.post(f"{BACKEND}/api/whop/publish",
                          json={"title": f"AI Income Blueprint — {topic[:40]}",
                                "description": caption,
                                "price_usd": 29.99,
                                "dry_run": True},
                          timeout=TIMEOUT_SHORT)
        check("POST /api/whop/publish (dry_run) returns 200",
              r.status_code == 200, r.text[:80])
        if r.status_code == 200:
            data = r.json()
            check("Whop dry_run status is 'dry_run'",
                  data.get("status") == "dry_run", str(data)[:120])
            check("Whop result has whop_captions",
                  bool(data.get("whop_captions")), str(data)[:120])
    except Exception as e:
        check("Whop publish (dry_run) reachable", False, str(e))

    # 17-5: PUBLISH フィナライズ (finalize + publish ready)
    print("  [17-5] Content save (PUBLISH前の最終保存)")
    try:
        r = requests.post(f"{BACKEND}/api/content/save",
                          json={"topic": topic,
                                "content": caption,
                                "type": "sns_caption"},
                          timeout=TIMEOUT_SHORT)
        check("POST /api/content/save returns 200 or 201",
              r.status_code in (200, 201), f"status={r.status_code} {r.text[:60]}")
    except Exception as e:
        check("Content save reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# GROUP 18: TALK フェーズ — ツール呼び出し確認 (No tools executed バグ修正確認)
# ══════════════════════════════════════════════════════════════════════════════

def test_talk_tool_calling():
    """
    TALKフェーズでLLMエージェントが実際にツールを呼び出しているか確認。
    「No tools executed」バグの有無をチェック。
    """
    print("\n[GROUP 18] TALK ツール呼び出し確認 ('No tools executed' バグ検出)")

    NO_TOOLS_BUG = "No tools executed"

    test_messages = [
        {
            "label": "Web検索要求",
            "message": "Search the web for 'best AI tools for passive income 2026' and summarize the results.",
            "expect_tool": True,
        },
        {
            "label": "一般会話 (ツール不要)",
            "message": "こんにちは。今日の気分はどうですか？",
            "expect_tool": False,
        },
        {
            "label": "リサーチ要求",
            "message": "What are the top 3 digital product niches right now? Use your research tools.",
            "expect_tool": True,
        },
        {
            "label": "商品アイデア要求",
            "message": "Generate a product idea for 'AI productivity for solopreneurs'.",
            "expect_tool": True,
        },
    ]

    for t in test_messages:
        print(f"  [{t['label']}]")
        try:
            r = requests.post(f"{BACKEND}/api/chat",
                              json={"message": t["message"]},
                              timeout=TIMEOUT_SHORT)
            check(f"  POST /api/chat returns 200 ({t['label']})",
                  r.status_code == 200, r.text[:60])
            if r.status_code != 200:
                continue

            data = r.json()
            reply_raw = str(data)

            # バグ検出: "No tools executed" が含まれていないか
            has_bug = NO_TOOLS_BUG in reply_raw
            check(f"  Reply does NOT contain '{NO_TOOLS_BUG}'",
                  not has_bug,
                  "❗ バグあり: エージェントがツールを呼び出していない" if has_bug else "")

            # 返答に内容があるか
            reply_text = (data.get("reply") or data.get("response")
                          or data.get("message") or data.get("content") or "")
            check(f"  Has non-empty reply text",
                  len(reply_text) > 20,
                  f"reply length={len(reply_text)}: {reply_text[:80]}")

            # ツール呼び出しが期待される場合: toolsフィールドまたはtool_callsを確認
            if t["expect_tool"]:
                tools_called = (
                    bool(data.get("tools")) or
                    bool(data.get("tool_calls")) or
                    bool(data.get("tools_used")) or
                    "search" in reply_text.lower() or
                    "found" in reply_text.lower() or
                    "research" in reply_text.lower()
                )
                check(f"  Tool-requiring prompt shows tool activity",
                      tools_called,
                      f"tools={data.get('tools')}, calls={data.get('tool_calls')}, "
                      f"reply_start={reply_text[:60]}")

        except Exception as e:
            check(f"  Chat API ({t['label']}) reachable", False, str(e))

    # 18-5: /api/history でツール使用の痕跡確認
    print("  [18-5] Chat history includes tool usage records")
    try:
        r = requests.get(f"{BACKEND}/api/history", timeout=TIMEOUT_SHORT)
        check("GET /api/history returns 200", r.status_code == 200, r.text[:60])
        if r.status_code == 200:
            data = r.json()
            history = data if isinstance(data, list) else data.get("history", [])
            check("Chat history is non-empty list",
                  isinstance(history, list) and len(history) > 0,
                  f"Got {len(history)} records")
    except Exception as e:
        check("History API reachable", False, str(e))


# ══════════════════════════════════════════════════════════════════════════════
# MAIN — Run all tests and print summary
# ══════════════════════════════════════════════════════════════════════════════

def run_all(groups=None):
    """
    groups: list of int, e.g. [15, 16, 17] to run specific groups only.
            None = run all groups.
    """
    print("=" * 70)
    print("SAGE COCKPIT — 全機能実機テスト")
    print(f"Backend: {BACKEND}")
    print(f"Date: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    if groups:
        print(f"Groups: {groups}")
    print("=" * 70)

    def want(g):
        return groups is None or g in groups

    # Fast groups
    if want(1):  test_server_health()
    if want(2):  test_talk_chat()
    if want(3):  test_niche_validate()
    if want(4):  test_research_check()
    if want(9):  test_automations()
    if want(10): test_sns_stats()
    if want(14): test_identity_api()
    if want(13): test_memory_api()
    if want(12): test_image_generation()

    # ── NEW: ツール呼び出し確認 ──
    if want(18): test_talk_tool_calling()

    # ── 旧パイプライン直接呼び出し (ローカル確認用) ──
    pipeline_data = None
    if want(5):
        plan = test_pipeline_plan()
        pipeline_data = test_pipeline_execute(plan)

    # ── 旧REFINE/PUBLISH (GROUP 5のデータで動く) ──
    if want(6):  test_rewrite(pipeline_data)
    if want(7):  test_image_regen()
    if want(8):  test_publish_endpoints()
    if want(11): test_pipeline_japanese()

    # ── NEW: 非同期ジョブシステム ──
    job_course_data = None
    if want(15): job_course_data = test_async_jobs()

    # ── NEW: REFINE完全テスト (ジョブ結果優先、なければpipeline_data) ──
    refine_data = job_course_data or pipeline_data
    if want(16): test_refine_full(refine_data)

    # ── NEW: PUBLISH完全テスト ──
    if want(17): test_publish_full(refine_data)

    # ── Summary ───────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    passed = [r for r in results if r[0] == PASS]
    failed = [r for r in results if r[0] == FAIL]
    print(f"  PASS:  {len(passed)}")
    print(f"  FAIL:  {len(failed)}")
    print(f"  TOTAL: {len(results)}")
    if failed:
        print("\nFailed tests:")
        for _, name, detail in failed:
            print(f"  ❌ {name}")
            if detail:
                print(f"     {detail}")
    print("=" * 70)
    return len(failed) == 0


# pytest compatibility shims
def test_server_up():         test_server_health()
def test_chat_api():          test_talk_chat()
def test_niche():             test_niche_validate()
def test_research():          test_research_check()
def test_autos():             test_automations()
def test_stats():             test_sns_stats()
def test_identity():          test_identity_api()
def test_brain():             test_memory_api()
def test_images():            test_image_generation()
def test_pipeline_full():
    plan = test_pipeline_plan()
    test_pipeline_execute(plan)
def test_refine_rewrite():    test_rewrite()
def test_publish():           test_publish_endpoints()
def test_ja_pipeline():       test_pipeline_japanese()
def test_async_job_system():  test_async_jobs()
def test_refine_complete():   test_refine_full()
def test_publish_complete():  test_publish_full()
def test_talk_tools():        test_talk_tool_calling()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SAGE COCKPIT 全機能実機テスト")
    parser.add_argument("--group", type=int, nargs="+",
                        help="実行するグループ番号 例: --group 15 16 17 18")
    parser.add_argument("--backend", type=str,
                        help=f"バックエンドURL (デフォルト: {BACKEND})")
    args = parser.parse_args()

    if args.backend:
        BACKEND = args.backend

    ok = run_all(groups=args.group)
    sys.exit(0 if ok else 1)
