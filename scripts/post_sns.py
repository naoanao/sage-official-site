"""
SNS自動投稿スクリプト（スタンドアロン版）
依存: atproto, requests, groq
Bluesky + Instagram に投稿する
"""
import os, sys, json, random, requests
from datetime import date

# ── 設定 ────────────────────────────────────────────────────────
BLUESKY_HANDLE = os.environ.get("BLUESKY_HANDLE", "")
BLUESKY_PASSWORD = os.environ.get("BLUESKY_APP_PASSWORD", "")
INSTAGRAM_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
INSTAGRAM_ACCOUNT_ID = os.environ.get("INSTAGRAM_ACCOUNT_ID", "17841480111989457")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

PROJECT_START = date(2025, 6, 1)
DAY = (date.today() - PROJECT_START).days + 1

# ── 投稿カテゴリ ────────────────────────────────────────────────
CATEGORIES = [
    {
        "name": "build_in_public",
        "prompt": f"""Write a BUILD-IN-PUBLIC post for Day {DAY} of building an AI marketing tool.
Open with 'Day {DAY}.' then ONE specific real moment — a metric, bug, decision, or something the AI did.
The AI system (Sage/Growl) is the hero. Reference restaurant owner background when concrete.
Close with a question readers can answer in 1-2 sentences.
Max 240 chars. No CTAs. No hashtags in text.""",
        "hashtags": "#BuildInPublic #IndieHacker #SoloFounder"
    },
    {
        "name": "insight",
        "prompt": f"""Share ONE insight from actually running an automated AI marketing system.
Lead directly with the insight — no preamble.
Should feel like only someone who DONE this would know.
Close with a question that challenges the reader's assumption.
Max 240 chars.""",
        "hashtags": "#AIAutomation #Solopreneur #BuildInPublic"
    },
    {
        "name": "marketing_lesson",
        "prompt": f"""Share ONE marketing principle applied to a REAL situation of a former restaurant owner who built AI tools.
Speak as someone who applied it, not studied it.
Close with a question inviting readers to share their own application.
Max 240 chars.""",
        "hashtags": "#MarketingStrategy #SoloFounder #SmallBusiness"
    },
    {
        "name": "growl_promo",
        "prompt": f"""Write a post about Growl — an AI that picks 3 marketing actions every week for restaurant/salon owners.
Make it about the outcome (save time, get customers) not features.
Include: growl-app.vercel.app
Max 240 chars.""",
        "hashtags": "#RestaurantMarketing #AIMarketing #Growl"
    }
]

# ── テキスト生成 ─────────────────────────────────────────────────
def generate_post() -> dict:
    category = random.choice(CATEGORIES)

    if not GROQ_API_KEY:
        # フォールバック
        return {
            "text": f"Day {DAY}. The AI posted while I slept. Restaurant marketing on autopilot. growl-app.vercel.app",
            "hashtags": category["hashtags"]
        }

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": category["prompt"]}],
            max_tokens=120
        )
        text = resp.choices[0].message.content.strip()
        print(f"✅ 投稿文生成 [{category['name']}]: {text[:60]}...")
        return {"text": text, "hashtags": category["hashtags"]}
    except Exception as e:
        print(f"⚠️ Groq失敗: {e}")
        return {
            "text": f"Day {DAY}. Building AI that handles restaurant marketing automatically. The system runs. growl-app.vercel.app",
            "hashtags": category["hashtags"]
        }

# ── Bluesky投稿 ──────────────────────────────────────────────────
def post_bluesky(text: str) -> bool:
    if not BLUESKY_HANDLE or not BLUESKY_PASSWORD:
        print("⚠️ Bluesky credentials missing")
        return False
    try:
        from atproto import Client
        client = Client()
        client.login(BLUESKY_HANDLE, BLUESKY_PASSWORD)
        client.send_post(text=text[:300])
        print(f"✅ Bluesky投稿完了: @{BLUESKY_HANDLE}")
        return True
    except Exception as e:
        print(f"❌ Bluesky失敗: {e}")
        return False

# ── Instagram投稿 ────────────────────────────────────────────────
def post_instagram(text: str, hashtags: str) -> bool:
    if not INSTAGRAM_TOKEN:
        print("⚠️ Instagram token missing")
        return False

    caption = f"{text}\n\n{hashtags}"

    try:
        # テキストのみ投稿（Reels/画像なし→カルーセルも可だが今はテキストのみ）
        # InstagramはAPIでテキストのみ投稿不可のため、画像URLが必要
        # シンプルな代替: imgbb等に画像をアップ、またはスキップ
        print("ℹ️ Instagram: 画像URLが必要のためスキップ（Phase 2で対応）")
        return False
    except Exception as e:
        print(f"❌ Instagram失敗: {e}")
        return False

# ── メイン ───────────────────────────────────────────────────────
def main():
    print(f"🚀 SNS自動投稿開始 | Day {DAY} | {date.today()}")

    post = generate_post()
    full_text = f"{post['text']}\n\n{post['hashtags']}"

    print(f"\n投稿内容:\n{full_text}\n")

    bs_ok = post_bluesky(full_text)
    ig_ok = post_instagram(post["text"], post["hashtags"])

    print(f"\n結果: Bluesky={'✅' if bs_ok else '❌'} | Instagram={'✅' if ig_ok else 'スキップ'}")

    if not bs_ok and not ig_ok:
        print("❌ 全プラットフォーム失敗")
        sys.exit(1)

    print("✅ 完了")

if __name__ == "__main__":
    main()
