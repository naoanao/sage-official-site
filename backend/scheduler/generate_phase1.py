"""
Phase 1（カラオケ館 町田店）の3テーマでnote記事を生成するスクリプト
"""
import os
import sys
import json

# dotenv を読み込む
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from groq import Groq
import random

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GUMROAD_URL = os.getenv("GUMROAD_PRODUCT_URL", "https://naofumi3.gumroad.com/l/apvbzh")

# Phase 1 のテーマ3つ
PHASE1_THEMES = [
    {
        "category": "marketing",
        "concept": "AIDA",
        "hook": "カラオケ店のキャッチで覚えた、人が足を止める瞬間の法則",
        "lecture_ref": "Attention→Interest→Desire→Actionの購買行動モデル。路上キャッチは究極のAIDA実践だった",
        "career_phase": "カラオケ館 町田店",
    },
    {
        "category": "marketing",
        "concept": "funnel_basics",
        "hook": "平日10組、休日15組。キャッチの数字を振り返ったら、ファネルそのものだった",
        "lecture_ref": "認知→興味→検討→行動のファネル構造。声をかけた人数と入店率の関係",
        "career_phase": "カラオケ館 町田店",
    },
    {
        "category": "marketing",
        "concept": "psychology_persuasion",
        "hook": "「今なら空いてますよ」が効く理由を、あとから心理学で知った話",
        "lecture_ref": "希少性・社会的証明・アンカリングなど購買心理の基本。講座4/22「心理学」より",
        "career_phase": "カラオケ館 町田店",
    },
]


def generate_article(theme: dict, project_day: int = 360) -> dict:
    client = Groq(api_key=GROQ_API_KEY)
    category = theme["category"]
    hook = theme["hook"]
    concept = theme.get("concept", "")
    lecture_ref = theme.get("lecture_ref", "")

    rng = random.Random(project_day)

    marketing_styles = [
        "【構成の型：結論先出し×実務解説】\n1. 結論・悩みの即出し（「結論から言うと〜」）\n2. 背景と原因の整理（数字や検証結果で補強）\n3. 専門用語の「生活語」翻訳（飲食やイベントの例で噛み砕く）\n4. 再現可能な手順（「まずは〜してみてください」と具体的な行動へ）",
        "【構成の型：体験談×問題解決】\n1. 読者のつまずき・問題提起（「〜って、ありますよね」）\n2. 自身の泥臭い現場体験や失敗談の描写\n3. 解決へのステップ（比喩を使ってわかりやすく）\n4. 読者への問いかけ（自分のビジネスに当てはめて考えられるように）"
    ]
    chosen_style = rng.choice(marketing_styles)

    body_instruction = (
        f"今日のテーマ（背景知識のみ）：{concept} — {lecture_ref}\n\n"
        "【絶対に守るルール】\n"
        f"❌ NG：最初の文を「{concept}とは〜のことで」から始める\n"
        "❌ NG：教科書・ハウツー・フレームワーク解説記事にする\n"
        "✅ OK：カラオケ店のキャッチ時代の具体的な一幕から始める\n"
        "✅ OK：失敗・恥・小さな数字・正直な感情を先に書く\n\n"
        "【本文の流れ（ストーリー主導）】\n"
        f"{chosen_style}"
    )

    prompt = (
        "あなたはnote.comのライター「なお」として記事を書く。\n\n"
        "【キャラクター設定】\n"
        "- 20代で泥臭く行動力を磨き、飲食店経営・イベント企画・Webサイト運営などリアルな現場を渡り歩いてきた実務家\n"
        "- 最初の仕事は町田のカラオケ店のキャッチ（客引き）。18〜24時勤務で、平日10組、休日10〜15組を捌いていた\n"
        "- 中小企業向けマーケティングツール「Growl」をAIで自作中（非エンジニア）\n"
        "- AI自動収益化システム「Sage AI」も構築中\n"
        f"- 現在 Day {project_day}（2025年6月1日スタート）\n"
        "- 毎日3時間しか作業できない制約がある\n\n"
        "【プライバシールール（厳守）】\n"
        "- 実在する企業名・ブランド名・店名は使わない\n"
        "- 「町田のカラオケ店」「某カラオケチェーン」など一般的表現に置き換える\n"
        "- 地域を特定できる情報は書かない\n\n"
        "【半ノンフィクション方針】\n"
        "- 実際の体験をベースに、AIが自然な詳細を補完してよい\n"
        "- 特定できる固有情報は入れない\n\n"
        f"【テーマ】\nフック：{hook}\n\n"
        f"{body_instruction}\n\n"
        "【文体の法則と「なお」の口調（必須）】\n"
        "- 1文を極力短く。1文1行が基本\n"
        "- やわらかく、少し親密で、押し付けがましくない。隣で話しているような距離感\n"
        "- 教育的な解説（教え）を入れるが、「教え込む」のではなく「〜してみてください」と優しく導く\n"
        "※必ず以下の口癖・言い回しを自然に本文に含めること※\n"
        "・「〜だと思います。」\n"
        "・「〜かもしれません。」\n"
        "・「〜なんですよね。」\n"
        "・「〜で十分です。」\n"
        "・「〜してみてください。」\n"
        "- 感情を正直に書く（なんか恥ずかしかった、地味にうれしかった、など）\n"
        "- 長い文（1文30字超え）は避ける\n\n"
        "【タイトルの作り方（重要）】\n"
        "note.comで高スキを取るタイトルには「体験×検証型」が最も有効。\n"
        "パターン1（体験×検証型）：「〜を〜した。正直、〜だった」\n"
        "  例：「カラオケ店のキャッチで100人に声をかけた。正直、9割は無視された。」\n"
        "パターン2（疑問型）：「〜を〜したら、何が起こるのか」\n"
        "  例：「路上で声をかけ続けたら、マーケティングが分かるようになるのか」\n"
        "パターン3（結論先出し）：「〜を諦めた。理由は〜だった」\n"
        "  例：「テンプレの声かけを諦めた。理由は、誰も振り向かなかったからだ」\n"
        "⚠️ 禁止タイトル：「〜のすすめ」「〜完全ガイド」「〜5選」などのハウツー系\n\n"
        "【記事構成（1500〜2500文字）】\n"
        "1. タイトル：上記パターンのどれかを使う（Day番号不要）\n"
        "2. 書き出し（3〜5文）：カラオケ店のキャッチ時代の一幕から入る\n"
        "3. 本文（1200〜2000文字）：上記の構成に従って。読者が「自分のことだ」と感じる一次体験を軸に書く\n"
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

    system_msg = (
        "あなたは日本語のnote.comライター。以下のルールを必ず守る。\n"
        "絶対禁止：「〜とは〜のことです」「〜には以下の〜があります」から始める教科書的な書き出し。\n"
        "絶対禁止：マーケ用語の解説記事。読者は説明を求めていない。\n"
        "必須：カラオケ店キャッチ経験者・AI開発者の一人称の体験談として書く。\n"
        "必須：失敗・小さな数字・正直な感情を含める。\n"
        "必須：1500〜2500文字。JSONのみ返す。"
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ],
        temperature=0.8,
        max_tokens=3500,
    )

    content = response.choices[0].message.content.strip()
    start = content.find("{")
    end = content.rfind("}") + 1
    if start == -1:
        raise ValueError("JSON not found in Groq response")
    raw_json = content[start:end]
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError:
        lines = raw_json.split("\n")
        cleaned = "\\n".join(lines)
        return json.loads(cleaned)


if __name__ == "__main__":
    print("=" * 70)
    print("Phase 1: カラオケ館 町田店 — 3テーマで記事生成")
    print("=" * 70)

    results = []
    for i, theme in enumerate(PHASE1_THEMES):
        print(f"\n--- テーマ {i+1}/3: {theme['concept']} ---")
        print(f"フック: {theme['hook']}")
        print("生成中...")
        try:
            article = generate_article(theme, project_day=360 + i)
            results.append(article)
            print(f"✅ タイトル: {article.get('title', 'N/A')}")
            print(f"   文字数: {len(article.get('body', ''))}")
        except Exception as e:
            print(f"❌ エラー: {e}")
            results.append({"error": str(e)})

    # 結果をファイルに保存
    output_path = os.path.join(os.path.dirname(__file__), "..", "data", "phase1_drafts.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 70}")
    print(f"✅ 3記事の生成完了！保存先: {output_path}")
    print(f"{'=' * 70}")

    # 全記事の内容を表示
    for i, article in enumerate(results):
        if "error" in article:
            continue
        print(f"\n{'━' * 70}")
        print(f"【記事 {i+1}】{article.get('title', 'N/A')}")
        print(f"{'━' * 70}")
        body = article.get("body", "")
        # \\n を改行に変換して表示
        print(body.replace("\\n", "\n"))
