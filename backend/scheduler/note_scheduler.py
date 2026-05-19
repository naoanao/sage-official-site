"""
SageNoteScheduler — note.com 自動投稿スケジューラー
毎日 JST 10:00 に投稿
対象: kanagawatable (mute_mint5020)
内容: Build in Public 日記 + AIマーケ知識 + Gumroad CTA
"""

import os
import json
import logging
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

POST_HOUR_JST = 10  # 毎日10時投稿


def get_project_day() -> int:
    return (date.today() - PROJECT_START_DATE).days + 1


def generate_note_content(project_day: int) -> dict:
    """Groqでnote記事を生成（日本語・Build in Public スタイル）"""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set")

    client = Groq(api_key=GROQ_API_KEY)

    prompt = f"""あなたは「なお」として書く。神奈川県でバーガーショップ（Uncle Sam）を経営しながら、
AI副業システム「Sage AI」を一人で構築中のソロデベロッパー。
現在 Day {project_day}。目標は1日3時間の作業で年収1千万円。

以下の構成でnote記事を日本語で書いてください（1000〜1500文字）：

## 構成
1. **タイトル**: 「Day {project_day}. ＋ 今日の具体的なテーマ」
   例: "Day {project_day}. AIが眠っている間に投稿する仕組みを作った"

2. **本文**:
   - 今日のリアルな開発日記（具体的な数字・出来事）
   - AIとマーケティングの実践知識（STP・3C・コピーライティングなど）
   - 失敗・問題点も正直に書く
   - 「バーガーショップをやりながら」という視点

3. **締め**（必ず含める）:
   - 「このSage AIのブループリントをGumroadで公開しています」
   - URL: {GUMROAD_URL}
   - 「$49で実際に動いているコード・設計・プロンプトを全公開」

## 禁止事項
- 「現在勉強中です」「〜を学んでいます」は使わない
- 抽象的・一般論は書かない
- 「革命的」「ゲームチェンジャー」などのキャッチコピーは使わない

## 返却形式（JSON）
{{
  "title": "タイトル文字列",
  "body": "マークダウン本文（改行は\\nで）"
}}

JSONのみ返答してください。"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.75,
        max_tokens=2000,
    )

    content = response.choices[0].message.content.strip()
    # JSON抽出
    start = content.find("{")
    end = content.rfind("}") + 1
    if start == -1:
        raise ValueError("JSON not found in Groq response")
    return json.loads(content[start:end])


def post_to_note(title: str, body: str, publish: bool = True) -> dict:
    """note.com APIに投稿"""
    headers = {
        "x-note-client-code": NOTE_CLIENT_CODE,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://note.com/",
        "Origin": "https://note.com",
    }

    # まずdraftとして作成
    payload = {
        "title": title,
        "body": body,
        "status": "published" if publish else "draft",
        "note_type": "TextNote",
    }

    res = requests.post(
        f"{NOTE_API_BASE}/v2/notes",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if res.status_code not in (200, 201):
        # v1エンドポイントも試みる
        res = requests.post(
            f"{NOTE_API_BASE}/v1/text_notes",
            headers=headers,
            json={"title": title, "body": body, "publish": publish},
            timeout=30,
        )

    return {
        "status_code": res.status_code,
        "response": res.json() if res.headers.get("content-type", "").startswith("application/json") else res.text[:300],
    }


def run_note_post():
    """メイン実行: 生成→投稿→ログ"""
    day = get_project_day()
    logger.info(f"[NoteScheduler] Starting post — Day {day}")

    try:
        # コンテンツ生成
        content = generate_note_content(day)
        title = content.get("title", f"Day {day}. Sage AI開発日記")
        body = content.get("body", "")

        if not body:
            raise ValueError("Empty body generated")

        logger.info(f"[NoteScheduler] Generated: {title[:60]}")

        # note.comに投稿
        result = post_to_note(title, body, publish=True)
        status = result["status_code"]

        if status in (200, 201):
            logger.info(f"[NoteScheduler] ✅ Posted successfully — Day {day}: {title}")
            # 投稿履歴を保存
            _save_history(day, title, status)
        else:
            logger.error(f"[NoteScheduler] ❌ Post failed — status {status}: {result['response']}")

        return result

    except Exception as e:
        logger.error(f"[NoteScheduler] Exception: {e}", exc_info=True)
        return {"error": str(e)}


def _save_history(day: int, title: str, status: int):
    """投稿履歴をJSONに保存"""
    history_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "note_post_history.json"
    )
    try:
        if os.path.exists(history_path):
            with open(history_path, "r", encoding="utf-8") as f:
                history = json.load(f)
        else:
            history = []

        history.append({
            "day": day,
            "title": title,
            "status": status,
            "posted_at": datetime.now(JST).isoformat(),
        })
        # 最新100件だけ保持
        history = history[-100:]

        with open(history_path, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"[NoteScheduler] History save failed: {e}")


class SageNoteScheduler:
    """Flaskのバックグラウンドスレッドとして動作"""

    def __init__(self):
        self.running = False
        self._thread = None

    def start(self):
        if not NOTE_CLIENT_CODE:
            logger.warning("[NoteScheduler] NOTE_CLIENT_CODE not set — skipping")
            return
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True, name="SageNoteScheduler")
        self._thread.start()
        logger.info("[NoteScheduler] Started — posts daily at JST 10:00")

    def stop(self):
        self.running = False

    def _loop(self):
        while self.running:
            now = datetime.now(JST)
            # 毎日 10:00 JST に投稿
            if now.hour == POST_HOUR_JST and now.minute == 0:
                run_note_post()
                time.sleep(61)  # 同分内の二重起動防止
            else:
                time.sleep(30)


# スタンドアロンテスト用
if __name__ == "__main__":
    import sys
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

    logging.basicConfig(level=logging.INFO)
    print(f"=== Note Scheduler Test — Day {get_project_day()} ===")

    if "--dry-run" in sys.argv:
        print("Generating content (dry run, not posting)...")
        content = generate_note_content(get_project_day())
        print(f"\nTitle: {content['title']}")
        print(f"\nBody preview:\n{content['body'][:500]}...")
    else:
        print("Posting to note.com...")
        result = run_note_post()
        print(f"Result: {result}")
