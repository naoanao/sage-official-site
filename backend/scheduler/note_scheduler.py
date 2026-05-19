"""
SageNoteScheduler v2 (2026-05-19)
note.com draft generation scheduler.

Flow:
1. Daily JST 10:00 trigger
2. Generate draft via Groq (Japanese, half-nonfiction)
3. Save to note.com as 'draft' (NOT published)
4. Send LINE Notify preview
5. Save locally to note_drafts.json
6. Nao manually reviews and publishes on note.com

Content strategy:
- 60% marketing learning output (Notion lecture topics x past work)
- 40% Growl story (future / past / present angles)
- Style: ultra-short sentences, honest numbers, failure-first
- Privacy: all company/brand names anonymized
"""

import os
import json
import logging
import random
import requests
import threading
import time
from datetime import datetime, date, timezone, timedelta
from groq import Groq

logger = logging.getLogger(__name__)

JST = timezone(timedelta(hours=9))
PROJECT_START_DATE = date(2025, 6, 1)

NOTE_API_BASE = "https://note.com/api"
NOTE_CLIENT_CODE = os.getenv("NOTE_CLIENT_CODE", "")
NOTE_USER_URLNAME = os.getenv("NOTE_USER_URLNAME", "mute_mint5020")
GUMROAD_URL = os.getenv("GUMROAD_PRODUCT_URL", "https://naofumi3.gumroad.com/l/apvbzh")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LINE_NOTIFY_TOKEN = os.getenv("LINE_NOTIFY_TOKEN", "")

POST_HOUR_JST = 10


# -----------------------------------------------------------------------
# Theme lists
# -----------------------------------------------------------------------

MARKETING_THEMES = [
    {
        "category": "marketing",
        "concept": "3C",
        "hook": "3C分析を、昔やっていたハンバーガーのイベント販売に当てはめてみた",
        "lecture_ref": "顧客・競合・自社の3軸で市場を整理するフレームワーク",
    },
    {
        "category": "marketing",
        "concept": "STP",
        "hook": "STPって何かを、某有名飲料ブランドのイベント運営で体感した話",
        "lecture_ref": "セグメンテーション・ターゲティング・ポジショニング",
    },
    {
        "category": "marketing",
        "concept": "4P",
        "hook": "Price・Place・Product・Promotionを、佐世保バーガー店の視点で分解した",
        "lecture_ref": "マーケティングミックスの基本4要素",
    },
    {
        "category": "marketing",
        "concept": "AISAS",
        "hook": "AISASを自分のnote運営に当てはめてみたら、どこで詰まっているか分かった",
        "lecture_ref": "Attention-Interest-Search-Action-Share の購買行動モデル",
    },
    {
        "category": "marketing",
        "concept": "benefit_copywriting",
        "hook": "機能じゃなくベネフィットで書くと何が変わるか、試してみた",
        "lecture_ref": "顧客が得る価値・変化を伝える言葉の作り方",
    },
    {
        "category": "marketing",
        "concept": "customer_journey",
        "hook": "カスタマージャーニーを、地産地消レストランの集客問題に当てはめてみた",
        "lecture_ref": "顧客が商品を認知してから購買・リピートするまでの体験設計",
    },
    {
        "category": "marketing",
        "concept": "SWOT",
        "hook": "SWOT分析を自分のGrowlに使ったら、弱みがはっきりして少し凹んだ話",
        "lecture_ref": "強み・弱み・機会・脅威を整理する状況分析フレームワーク",
    },
    {
        "category": "marketing",
        "concept": "competitor_research",
        "hook": "競合を調べる方法を知らなかった。某有名飲料ブランドの仕事でそれを痛感した",
        "lecture_ref": "競合の強み・価格・訴求軸を体系的に把握する手法",
    },
    {
        "category": "marketing",
        "concept": "branding",
        "hook": "ブランドって何かを、フードイベントの出展経験から考えてみた",
        "lecture_ref": "一貫したイメージと価値の積み重ねで信頼を作る考え方",
    },
    {
        "category": "marketing",
        "concept": "sns_strategy",
        "hook": "SNSで発信しているとマーケティングしているは全然違うと気づいた話",
        "lecture_ref": "目標・ターゲット・投稿設計・分析を一貫させるSNS運用の考え方",
    },
    {
        "category": "marketing",
        "concept": "seo_lpo",
        "hook": "WebサイトのSEOをGrowlのランディングページで初めて真剣に考えた",
        "lecture_ref": "検索流入とLP改善の基本。コンバージョン率を上げる考え方",
    },
    {
        "category": "marketing",
        "concept": "data_decision",
        "hook": "感覚じゃなくて数字で判断する習慣を、Growlを作って初めて身につけた",
        "lecture_ref": "KPI設計・データ分析・仮説検証のサイクル",
    },
]

GROWL_THEMES = [
    {
        "category": "growl",
        "angle": "future",
        "hook": "なぜGrowlを作っているのか。5年後に何がしたいかから逆算した話",
        "context": "中小企業がマーケをもっと簡単に使えるようにしたい。その出発点",
    },
    {
        "category": "growl",
        "angle": "past",
        "hook": "Growlを作る前の自分。マーケをまったく知らなかった話",
        "context": "バーガーは作れた。でもどうやって集客するかが分からなかった",
    },
    {
        "category": "growl",
        "angle": "present",
        "hook": "今のGrowlは何ができて、何ができないか。正直に書く",
        "context": "3C分析・STP・競合調査を自動化中。まだ荒削りだけど動いている",
    },
    {
        "category": "growl",
        "angle": "future",
        "hook": "Growlが完成したら、中小企業のマーケはどう変わるか仮説を書く",
        "context": "経営者が自分でマーケを回せるようになる。Growlはその道具",
    },
    {
        "category": "growl",
        "angle": "past",
        "hook": "エンジニアじゃない自分が、AIを使ってツールを作ったらどうなったか",
        "context": "毎日3時間。失敗を繰り返しながら、少しずつ動くようになった",
    },
    {
        "category": "growl",
        "angle": "present",
        "hook": "Sage AIにGrowlのマーケを全部任せた。2ヶ月後の正直な数字",
        "context": "フォロワーも売上も小さい。でも続けている。その記録",
    },
]

# 60:40 ratio — marketing x3, growl x2
ALL_THEMES = (MARKETING_THEMES * 3) + (GROWL_THEMES * 2)


def get_project_day() -> int:
    return (date.today() - PROJECT_START_DATE).days + 1


def _pick_theme(day: int) -> dict:
    """Pick theme by day seed (reproducible)."""
    rng = random.Random(day)
    return rng.choice(ALL_THEMES)


# -----------------------------------------------------------------------
# Content generation
# -----------------------------------------------------------------------

def generate_note_draft(project_day: int) -> dict:
    """Generate a note.com draft article via Groq (Japanese, half-nonfiction)."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")

    client = Groq(api_key=GROQ_API_KEY)
    theme = _pick_theme(project_day)
    category = theme["category"]
    hook = theme["hook"]

    if category == "marketing":
        concept = theme.get("concept", "")
        lecture_ref = theme.get("lecture_ref", "")
        body_instruction = (
            "カテゴリ：マーケ学習アウトプット\n"
            f"概念：{concept}\n"
            f"概念の説明：{lecture_ref}\n\n"
            "本文の構成：\n"
            f"1. {concept}という概念がある。（1〜2文で簡潔に説明）\n"
            "2. 自分の過去の仕事体験に当てはめると、どういうことか。（実体験ベース）\n"
            "3. GrowlまたはSage AIでどう実装・活用したか\n"
            "4. やってみて分かったこと・うまくいかなかったこと\n"
            "5. 次の仮説または今後やること（1〜2文）"
        )
    else:
        angle = theme.get("angle", "present")
        context = theme.get("context", "")
        angle_label = {"future": "未来視点", "past": "過去視点", "present": "現在進行形"}.get(angle, angle)
        body_instruction = (
            "カテゴリ：Growlストーリー\n"
            f"視点：{angle_label}\n"
            f"コンテキスト：{context}\n\n"
            "本文の構成：\n"
            "1. 視点に合わせた切り口で書き出し\n"
            "2. 実体験・実際に起きたこと（半ノンフィクション）\n"
            "3. 正直な数字（フォロワー数・売上・作業時間など）\n"
            "4. 次の行動または仮説"
        )

    prompt = (
        "あなたはnote.comのライター「なお」として記事を書く。\n\n"
        "【キャラクター設定】\n"
        "- 神奈川県でバーガーショップを経営していた（現在は別の仕事もやりながら）\n"
        "- 中小企業向けマーケティングツール「Growl」をAIで自作中（非エンジニア）\n"
        "- AI自動収益化システム「Sage AI」も構築中\n"
        f"- 現在 Day {project_day}（2025年6月1日スタート）\n"
        "- 毎日3時間しか作業できない制約がある\n\n"
        "【プライバシールール（厳守）】\n"
        "- 実在する企業名・ブランド名・店名は使わない\n"
        "- 「某有名飲料メーカー」「地産地消レストラン」「佐世保バーガー店」「フードイベント」など一般的表現に置き換える\n"
        "- Uncle Samは使わない。「バーガーショップ」「ハンバーガー店」で表現する\n"
        "- 地域を特定できる情報（固有のフードグランプリ名等）は書かない\n\n"
        "【半ノンフィクション方針】\n"
        "- 実際の体験をベースに、AIが自然な詳細を補完してよい\n"
        "- 特定できる固有情報は入れない\n\n"
        f"【テーマ】\nフック：{hook}\n\n"
        f"{body_instruction}\n\n"
        "【文体の法則】\n"
        "- 1文を極力短く。1文1行が基本\n"
        "- 感情を正直に書く（なんか恥ずかしかった、地味にうれしかった、など）\n"
        "- 失敗・うまくいかなかったことを先に書く\n"
        "- 正直な数字を必ず入れる（小さくてもOK）\n"
        "- 「学んでいます」禁止。「やってみたら〜だった」という経験ベースで書く\n"
        "- 長い文（1文30字超え）は避ける\n\n"
        "【記事構成（800〜1000文字）】\n"
        "1. タイトル：テーマに合った具体的なタイトル（Day番号不要）\n"
        "2. 書き出し（2〜3文）：今日の状況・テーマへの入り方\n"
        "3. 本文（600〜800文字）：上記の構成に従って\n"
        "4. 締め（さりげないCTA）：\n"
        "   売り込まず、存在を伝える程度に。\n"
        f"   例：GrowlとSage AIのブループリントはGumroadで公開中。$49。→ {GUMROAD_URL}\n\n"
        "【禁止事項】\n"
        "- 革命的・ゲームチェンジャー・人生が変わる などの煽り系キャッチは使わない\n"
        "- 数字を誇張しない\n"
        "- 年収1000万を目指す日記というフレーズは使わない\n"
        "- 実在する企業名・ブランド名を使わない\n\n"
        "【返却形式（JSONのみ）】\n"
        '{"title": "タイトル文字列", "body": "マークダウン本文（改行は\\nで）", '
        '"category": "' + category + '", "theme_hook": "' + hook + '"}\n\n'
        "JSONのみ返答してください。"
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.75,
        max_tokens=2000,
    )

    content = response.choices[0].message.content.strip()
    start = content.find("{")
    end = content.rfind("}") + 1
    if start == -1:
        raise ValueError("JSON not found in Groq response")
    return json.loads(content[start:end])


# -----------------------------------------------------------------------
# note.com API — save as draft
# -----------------------------------------------------------------------

def save_draft_to_note(title: str, body: str) -> dict:
    """Save to note.com as draft (NOT published). Nao publishes manually."""
    if not NOTE_CLIENT_CODE:
        logger.warning("[NoteScheduler] NOTE_CLIENT_CODE not set — skipping API call")
        return {"status_code": 0, "response": "NOTE_CLIENT_CODE not configured"}

    headers = {
        "x-note-client-code": NOTE_CLIENT_CODE,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://note.com/",
        "Origin": "https://note.com",
    }

    payload = {
        "title": title,
        "body": body,
        "status": "draft",
        "note_type": "TextNote",
    }

    res = requests.post(
        f"{NOTE_API_BASE}/v2/notes",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if res.status_code not in (200, 201):
        res = requests.post(
            f"{NOTE_API_BASE}/v1/text_notes",
            headers=headers,
            json={"title": title, "body": body, "publish": False},
            timeout=30,
        )

    is_json = res.headers.get("content-type", "").startswith("application/json")
    return {
        "status_code": res.status_code,
        "response": res.json() if is_json else res.text[:300],
    }


# -----------------------------------------------------------------------
# LINE Notify
# -----------------------------------------------------------------------

def notify_line(title: str, body_preview: str, category: str = "") -> bool:
    """Send LINE Notify when draft is ready."""
    if not LINE_NOTIFY_TOKEN:
        logger.info("[NoteScheduler] LINE_NOTIFY_TOKEN not set — skipping")
        return False

    preview = body_preview[:300] if body_preview else ""
    message = (
        "\n"
        f"[noteドラフト完成 {category}]\n"
        "--------------------------------\n"
        f"タイトル：{title}\n"
        "--------------------------------\n"
        f"{preview}...\n"
        "--------------------------------\n"
        "note.comで確認して公開してください"
    )

    try:
        res = requests.post(
            "https://notify-api.line.me/api/notify",
            headers={"Authorization": f"Bearer {LINE_NOTIFY_TOKEN}"},
            data={"message": message},
            timeout=10,
        )
        if res.status_code == 200:
            logger.info("[NoteScheduler] LINE Notify sent")
            return True
        logger.warning(f"[NoteScheduler] LINE Notify failed: {res.status_code}")
        return False
    except Exception as e:
        logger.warning(f"[NoteScheduler] LINE Notify error: {e}")
        return False


# -----------------------------------------------------------------------
# Local save
# -----------------------------------------------------------------------

def _save_draft_locally(day: int, title: str, body: str, category: str, note_result: dict) -> None:
    """Save draft to backend/data/note_drafts.json for review."""
    drafts_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "note_drafts.json"
    )
    try:
        os.makedirs(os.path.dirname(drafts_path), exist_ok=True)

        if os.path.exists(drafts_path):
            with open(drafts_path, "r", encoding="utf-8") as f:
                drafts = json.load(f)
        else:
            drafts = []

        drafts.append({
            "day": day,
            "title": title,
            "body": body,
            "category": category,
            "note_api_result": note_result,
            "created_at": datetime.now(JST).isoformat(),
            "status": "pending_review",
        })
        drafts = drafts[-50:]

        with open(drafts_path, "w", encoding="utf-8") as f:
            json.dump(drafts, f, ensure_ascii=False, indent=2)

        logger.info(f"[NoteScheduler] Draft saved locally")
    except Exception as e:
        logger.warning(f"[NoteScheduler] Local save failed: {e}")


# -----------------------------------------------------------------------
# Main runner
# -----------------------------------------------------------------------

def run_note_draft() -> dict:
    """Main flow: generate -> draft -> LINE notify -> local save."""
    day = get_project_day()
    logger.info(f"[NoteScheduler] Starting draft — Day {day}")

    try:
        content = generate_note_draft(day)
        title = content.get("title", f"Day {day}. Sage AI開発日記")
        body = content.get("body", "")
        category = content.get("category", "")

        if not body:
            raise ValueError("Empty body generated")

        logger.info(f"[NoteScheduler] Generated [{category}]: {title[:60]}")

        note_result = save_draft_to_note(title, body)
        status = note_result["status_code"]

        if status in (200, 201):
            logger.info(f"[NoteScheduler] Draft saved to note.com")
        elif status == 0:
            logger.info(f"[NoteScheduler] note API skipped (no token)")
        else:
            logger.warning(f"[NoteScheduler] note API returned {status}")

        notify_line(title, body, category)
        _save_draft_locally(day, title, body, category, note_result)

        return {
            "day": day,
            "title": title,
            "category": category,
            "note_status": status,
            "line_notified": bool(LINE_NOTIFY_TOKEN),
        }

    except Exception as e:
        logger.error(f"[NoteScheduler] Exception: {e}", exc_info=True)
        return {"error": str(e)}


# -----------------------------------------------------------------------
# Scheduler class (Flask background thread)
# -----------------------------------------------------------------------

class SageNoteScheduler:
    """Runs as a daemon thread; generates draft daily at JST 10:00."""

    def __init__(self):
        self.running = False
        self._thread = None

    def start(self):
        if not GROQ_API_KEY:
            logger.warning("[NoteScheduler] GROQ_API_KEY not set — skipping")
            return
        self.running = True
        self._thread = threading.Thread(
            target=self._loop, daemon=True, name="SageNoteScheduler"
        )
        self._thread.start()
        logger.info("[NoteScheduler] Started — drafts daily at JST 10:00")

    def stop(self):
        self.running = False

    def _loop(self):
        while self.running:
            now = datetime.now(JST)
            if now.hour == POST_HOUR_JST and now.minute == 0:
                run_note_draft()
                time.sleep(61)
            else:
                time.sleep(30)


# -----------------------------------------------------------------------
# Standalone test
# -----------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
    logging.basicConfig(level=logging.INFO)

    print(f"=== Note Scheduler Test — Day {get_project_day()} ===")

    if "--theme" in sys.argv:
        print(f"\nTotal themes: {len(ALL_THEMES)}")
        for i in range(7):
            t = _pick_theme(get_project_day() + i)
            print(f"  Day+{i}: [{t['category']}] {t['hook']}")
    elif "--dry-run" in sys.argv:
        print("Generating draft (dry run)...")
        content = generate_note_draft(get_project_day())
        print(f"\nTitle: {content['title']}")
        print(f"Category: {content.get('category', '')}")
        print(f"\nBody preview:\n{content['body'][:500]}...")
    else:
        print("Running full draft flow...")
        result = run_note_draft()
        print(f"Result: {result}")
