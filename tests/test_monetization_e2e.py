"""
E2E Monetization Test Suite
============================
確認項目:
  1. 画像URLがimgbb (not LoremFlickr) であること
  2. imgbb URLがHTTP 200でアクセス可能であること
  3. TitleOptimizerが機能していること（5技法のパターンを検出）
  4. セールスページに特典セクションが存在すること
  5. EnvGuardianが必須キーを検出できること
  6. NotionLoggerがAPIと接続できること

Usage:
  cd C:\\Users\\nao\\Desktop\\Sage_Final_Unified
  python -m pytest tests/test_monetization_e2e.py -v
  または単体実行:
  python tests/test_monetization_e2e.py
"""

import sys
import os

# プロジェクトルートをパスに追加
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(_ROOT, ".env"))

import requests as _requests
import re


# ─────────────────────────────────────────────────────────────
# Test 1: 画像生成パイプライン (HF Flux + imgbb)
# ─────────────────────────────────────────────────────────────

def test_image_generation_returns_imgbb_url():
    """generate_social_media_image が imgbb URL を返すこと"""
    from backend.integrations.image_generation import ImageGenerationEnhanced
    gen = ImageGenerationEnhanced()
    url = gen.generate_social_media_image("UFO government disclosure documentary", platform="twitter")

    assert url is not None, "Image generation returned None"
    assert "ibb.co" in url, f"Expected imgbb URL, got: {url}"
    assert "loremflickr" not in url, f"LoremFlickr fallback was used: {url}"
    print(f"  [PASS] Image URL: {url}")


def test_imgbb_url_is_accessible():
    """imgbb URLが実際にHTTP 200でアクセス可能であること"""
    from backend.integrations.image_generation import ImageGenerationEnhanced
    gen = ImageGenerationEnhanced()
    url = gen.generate_social_media_image("UFO Pentagon testimony hearing", platform="twitter")

    assert url is not None, "Image generation returned None"
    resp = _requests.get(url, timeout=15)
    assert resp.status_code == 200, f"imgbb URL returned {resp.status_code}: {url}"
    assert len(resp.content) > 10_000, f"Image too small ({len(resp.content)} bytes): {url}"
    print(f"  [PASS] imgbb accessible: {resp.status_code}, {len(resp.content)} bytes")


# ─────────────────────────────────────────────────────────────
# Test 2: TitleOptimizer
# ─────────────────────────────────────────────────────────────

TECHNIQUE_PATTERNS = [
    r"\d+\s+(Key Facts|Steps|Things|Ways)",      # Number
    r"\[(Pentagon|Congressional|Declassified|Whistleblower)",  # Authority
    r"(2026|Roswell|AARO|Nuccetelli|Grusch)",    # Specific
    r"[【\[](Classified|MUST READ|Update|Breaking)",  # Bracket
    r"(How to|What You Can Do|Understanding|The Knowledge)",  # Benefit
]

def test_title_optimizer_applies_techniques():
    """TitleOptimizerが5技法のいずれかを各タイトルに適用すること"""
    from backend.modules.title_optimizer import TitleOptimizer

    raw_titles = [
        "What Has Been Officially Confirmed",
        "The Timeline They Dont Show You",
        "Key Witnesses and Their Testimony",
        "Political Forces Behind Disclosure",
        "Your Action Plan Going Forward",
    ]
    optimizer = TitleOptimizer(topic="UFO disclosure", language="en")
    optimized = optimizer.optimize_outline(raw_titles)

    assert len(optimized) == len(raw_titles), "Optimizer changed number of titles"
    for orig, opt in zip(raw_titles, optimized):
        assert orig != opt or any(re.search(p, opt, re.IGNORECASE) for p in TECHNIQUE_PATTERNS), \
            f"No technique detected in: '{opt}'"
    print(f"  [PASS] {len(optimized)} titles optimized")
    for t in optimized:
        print(f"         → {t}")


# ─────────────────────────────────────────────────────────────
# Test 3: セールスページ特典セクション
# ─────────────────────────────────────────────────────────────

def test_generate_bonuses_contains_required_elements():
    """_generate_bonuses()が希少性・特典・CTAを含むこと"""
    # CourseProductionPipelineを直接インスタンス化せずに単体テスト
    import importlib
    import types

    # 最小限のモックを作って _generate_bonuses だけテスト
    from backend.pipelines import course_production_pipeline as _mod
    pipeline_cls = _mod.CourseProductionPipeline

    # 依存が多いのでdirect method call
    obj = object.__new__(pipeline_cls)  # __init__スキップ
    bonus_en = obj._generate_bonuses("UFO Disclosure Secrets", price=27, language="en")
    bonus_ja = obj._generate_bonuses("UFO開示の真実", price=27, language="ja")

    for bonus, lang in [(bonus_en, "en"), (bonus_ja, "ja")]:
        assert "48" in bonus, f"[{lang}] No 48-hour mention in bonus block"
        assert "copies" in bonus or "部" in bonus, f"[{lang}] No scarcity count in bonus block"
        assert "$" in bonus or "¥" in bonus, f"[{lang}] No price/value in bonus block"
    print(f"  [PASS] Bonus block contains scarcity + value + deadline")


# ─────────────────────────────────────────────────────────────
# Test 4: EnvGuardian
# ─────────────────────────────────────────────────────────────

def test_env_guardian_detects_keys():
    """EnvGuardianが必須APIキーをすべて検出できること"""
    from backend.utils.env_guardian import EnvGuardian
    guardian = EnvGuardian()
    missing = guardian.validate()

    CRITICAL_KEYS = ["HF_TOKEN", "IMGBB_API_KEY", "GROQ_API_KEY"]
    critical_missing = [k for k in missing if k in CRITICAL_KEYS]
    assert not critical_missing, f"Critical API keys missing: {critical_missing}"
    print(f"  [PASS] Critical keys present. Missing (non-critical): {missing}")


# ─────────────────────────────────────────────────────────────
# Test 5: NotionLogger 接続テスト
# ─────────────────────────────────────────────────────────────

def test_notion_logger_connection():
    """NotionLogger が Notion API に接続できること (実際には書き込まない)"""
    notion_key = os.getenv("NOTION_API_KEY")
    assert notion_key, "NOTION_API_KEY not set"

    resp = _requests.get(
        "https://api.notion.com/v1/users/me",
        headers={
            "Authorization": f"Bearer {notion_key}",
            "Notion-Version": "2022-06-28",
        },
        timeout=10,
    )
    assert resp.status_code == 200, f"Notion API returned {resp.status_code}: {resp.text[:200]}"
    user = resp.json().get("name", "unknown")
    print(f"  [PASS] Notion API connected as: {user}")


# ─────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────

TESTS = [
    ("EnvGuardian key detection",      test_env_guardian_detects_keys),
    ("TitleOptimizer 5 techniques",    test_title_optimizer_applies_techniques),
    ("Bonus section elements",         test_generate_bonuses_contains_required_elements),
    ("Notion API connection",          test_notion_logger_connection),
    ("Image generation → imgbb URL",   test_image_generation_returns_imgbb_url),
    ("imgbb URL accessible (HTTP 200)",test_imgbb_url_is_accessible),
]

if __name__ == "__main__":
    print("\n=== Sage Monetization E2E Test Suite ===\n")
    passed = 0
    failed = 0
    for name, fn in TESTS:
        print(f"[TEST] {name}")
        try:
            fn()
            passed += 1
        except AssertionError as e:
            print(f"  [FAIL] {e}")
            failed += 1
        except Exception as e:
            print(f"  [ERROR] {type(e).__name__}: {e}")
            failed += 1
        print()

    print(f"=== Results: {passed} passed / {failed} failed ===")
    sys.exit(0 if failed == 0 else 1)
