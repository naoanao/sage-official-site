"""
Phase 3（Uncle Sam / 佐世保バーガー）のSWOTテーマだけを再生成するスクリプト
"""
import os
import sys
import json

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from groq import Groq
import random

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GUMROAD_URL = os.getenv("GUMROAD_PRODUCT_URL", "https://naofumi3.gumroad.com/l/apvbzh")

SWOT_THEME = {
    "category": "marketing",
    "concept": "SWOT",
    "hook": "ファストフードにバーの接客を持ち込んだら、強みと弱みが逆転した話",
    "lecture_ref": "強み・弱み・機会・脅威を整理する状況分析フレームワーク",
    "career_phase": "Uncle Sam",
}

def generate_article(theme: dict, project_day: int = 371) -> dict:
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
        "✅ OK：佐世保バーガー店時代の具体的な一幕から始める\n"
        "✅ OK：失敗・恥・小さな数字・正直な感情を先に書く\n\n"
        "【本文の流れ（ストーリー主導）】\n"
        f"{chosen_style}"
    )

    prompt = (
        "あなたはnote.comのライター「なお」として記事を書く。\n\n"
        "【キャラクター設定】\n"
        "- 20代で泥臭く行動力を磨き、飲食店経営・イベント企画・Webサイト運営などリアルな現場を渡り歩いてきた実務家\n"
        "- この記事の舞台は佐世保バーガーの店。バーの「人と深く繋がる接客スタイル」を取り入れた経験がある\n"
        "- 中小企業向けマーケティングツール「Growl」をAIで自作中\n"
        "- AI自動収益化システム「Sage AI」も構築中\n"
        f"- 現在 Day {project_day}\n\n"
        "【プライバシールール（厳守）】\n"
        "- 実在する企業名・ブランド名・店名は使わない\n\n"
        f"【テーマ】\nフック：{hook}\n\n"
        f"{body_instruction}\n\n"
        "【文体の法則と「なお」の口調（必須）】\n"
        "- 1文を極力短く。1文1行が基本\n"
        "- やわらかく、少し親密で、押し付けがましくない。隣で話しているような距離感\n"
        "※必ず以下の口癖・言い回しを含める※\n"
        "・「〜だと思います。」\n"
        "・「〜かもしれません。」\n"
        "・「〜なんですよね。」\n"
        "・「〜で十分です。」\n"
        "・「〜してみてください。」\n"
        "- 感情を正直に書く\n\n"
        "【タイトルの作り方（重要）】\n"
        "パターン1（体験×検証型）：「〜を〜した。正直、〜だった」\n"
        "パターン2（疑問型）：「〜を〜したら、何が起こるのか」\n"
        "パターン3（結論先出し）：「〜を諦めた。理由は〜だった」\n"
        "⚠️ 禁止タイトル：「〜のすすめ」「〜完全ガイド」等のハウツー系\n\n"
        "【返却形式（JSONのみ）】\n"
        '{"title": "タイトル文字列", "body": "マークダウン本文（改行は\\\\nでエスケープすること）", '
        '"category": "' + category + '", "theme_hook": "' + hook + '"}\n\n'
        "※必ず有効なJSON文字列で返すこと。Markdown本文中の改行は必ず \\n としてエスケープし、ダブルクォーテーションも \\\" としてエスケープすること。"
    )

    system_msg = (
        "あなたは日本語のnote.comライター。以下のルールを必ず守る。\n"
        "必須：バーガーショップ経営者・AI開発者の一人称の体験談。\n"
        "必須：JSONのみを返す。Markdown本文中の改行や引用符は必ず正しくエスケープすること。\n"
        "必須：1500〜2500文字。"
    )

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.8,
                max_tokens=4000,
            )
            content = response.choices[0].message.content.strip()
            start = content.find("{")
            end = content.rfind("}") + 1
            raw_json = content[start:end]
            return json.loads(raw_json, strict=False)
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {e}")
            if attempt == 2:
                raise

if __name__ == "__main__":
    print("=" * 70)
    print("Phase 3: SWOTテーマの再生成")
    print("=" * 70)

    try:
        article = generate_article(SWOT_THEME)
        output_path = os.path.join(os.path.dirname(__file__), "..", "data", "phase3_swot_draft.json")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump([article], f, ensure_ascii=False, indent=2)

        print(f"✅ 生成成功！タイトル: {article.get('title')}")
        print(f"   保存先: {output_path}")
        print("\n本文プレビュー:\n" + "="*50)
        print(article.get("body", "").replace("\\n", "\n")[:500] + "...\n")
    except Exception as e:
        print(f"❌ 最終エラー: {e}")
