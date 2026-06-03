import os
import sys
import json
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from groq import Groq
import random

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# テスト用テーマ
TEST_THEME = {
    "category": "marketing",
    "concept": "AIDA",
    "hook": "カラオケ店のキャッチで覚えた、人が足を止める瞬間の法則",
    "lecture_ref": "Attention→Interest→Desire→Actionの購買行動モデル",
    "career_phase": "カラオケ館 町田店"
}

def test_generate(theme: dict, project_day: int = 372):
    client = Groq(api_key=GROQ_API_KEY)
    
    # ── 職歴の詳細データ ──
    CAREER_DETAILS = {
        "カラオケ館 町田店": "2002年。最初の仕事は町田のカラオケ店の路上キャッチ（客引き）。18〜24時勤務で、平日10組、休日10〜15組を必死に捌いていた。声をかけても9割無視される中で、接客と集客の原体験を積んだ。",
        "SPANKY": "2002〜2006年。クラブ・バーの店長・イベント主催。25席の小箱に80人を集めるなど、クローズドな空間でのコミュニティ作りと集客を泥臭く実践。常連客に助けられながらイベントを回していた。"
    }

    category = theme["category"]
    hook = theme["hook"]
    concept = theme.get("concept", "")
    lecture_ref = theme.get("lecture_ref", "")
    career_phase = theme.get("career_phase", "")
    
    career_context = ""
    if career_phase and career_phase in CAREER_DETAILS:
        career_context = f"- 【この記事の舞台となる実体験】：{CAREER_DETAILS[career_phase]}\n"
        
    rng = random.Random(project_day)
    
    marketing_styles = [
        "【構成の型：結論先出し×実務解説】\n1. 結論・悩みの即出し（「結論から言うと〜」）\n2. 背景と原因の整理（当時の現場の状況や数字で補強）\n3. 専門用語の「生活語」翻訳（当時の飲食やイベントの例で噛み砕く）\n4. 再現可能な手順（「まずは〜してみてください」と具体的な行動へ）",
        "【構成の型：体験談×問題解決】\n1. 読者のつまずき・問題提起（「〜って、ありますよね」）\n2. 自身の泥臭い現場体験や失敗談の描写（情景が浮かぶように）\n3. 解決へのステップ（比喩を使ってわかりやすく）\n4. 読者への問いかけ（自分のビジネスに当てはめて考えられるように）"
    ]
    chosen_style = rng.choice(marketing_styles)

    body_instruction = (
        f"今日のテーマ（背景知識のみ）：{concept} — {lecture_ref}\n\n"
        "【絶対に守るルール】\n"
        f"❌ NG：最初の文を「{concept}とは〜のことで」から始める\n"
        "❌ NG：教科書・ハウツー・フレームワーク解説記事にする\n"
        "✅ OK：自身のキャリア（カラオケキャッチ、バーガー屋、イベント運営など）の具体的な一幕から始める\n"
        "✅ OK：失敗・恥・小さな数字・正直な感情を先に書く\n\n"
        "【本文の流れ（ストーリー主導）】\n"
        f"{chosen_style}"
    )

    prompt = (
        "あなたはnote.comのライター「なお」として記事を書く。\n\n"
        "【キャラクター設定】\n"
        "- 20代から泥臭く行動力を磨き、カラオケキャッチ、飲食店経営、イベント企画、Webマーケティングなどリアルな現場を渡り歩いてきた実務家\n"
        f"{career_context}"
        "- 現在は中小企業向けマーケティングツール「Growl」をAIで自作中（非エンジニア）\n"
        "- AI自動収益化システム「Sage AI」も構築中\n"
        f"- 現在 Day {project_day}（2025年6月1日スタート）\n"
        "- 毎日3時間しか作業できない制約がある\n\n"
        "【プライバシールール（厳守）】\n"
        "- 実在する企業名・ブランド名・店名は使わない\n"
        "- 「某有名飲料メーカー」「地産地消レストラン」「佐世保バーガー店」「フードイベント」など一般的表現に置き換える\n"
        "- 固有の店名は使わない。「カラオケ店」「バーガーショップ」で表現する\n"
        "- 地域を特定できる情報（町田など）は書かない\n\n"
        "【半ノンフィクション方針】\n"
        "- 指定された実体験ベースに、情景が浮かぶようAIが自然な詳細を補完してよい\n"
        "- 特定できる固有情報は入れない\n\n"
        f"【テーマ】\nフック：{hook}\n\n"
        f"{body_instruction}\n\n"
        "【文体の法則と「なお」の口調（必須）】\n"
        "- 1文を極力短く。1文1行が基本\n"
        "- やわらかく、少し親密で、押し付けがましくない。隣で話しているような距離感\n"
        "- AI特有の不自然な日本語（例：「することができるで十分です」等）は絶対に避けること\n"
        "- 「〜だと思うんですよね」「〜かもしれませんね」「〜してみてください」といった自然な会話表現を適度に使用する\n"
        "- 感情を正直に書く（なんか恥ずかしかった、地味にうれしかった、など）\n"
        "- 長い文（1文30字超え）は避ける\n\n"
        "【タイトルの作り方（重要）】\n"
        "パターン1（体験×検証型）：「〜を〜した。正直、〜だった」\n"
        "パターン2（疑問型）：「〜を〜したら、何が起こるのか」\n"
        "パターン3（結論先出し）：「〜を諦めた。理由は〜だった」\n"
        "⚠️ 禁止タイトル：「〜のすすめ」「〜完全ガイド」等のハウツー系\n\n"
        "【文字数と出力形式】\n"
        "必須：1500文字〜2000文字のボリュームでしっかり書くこと。\n"
        "返却形式：JSONのみ\n"
        '{"title": "タイトル文字列", "body": "マークダウン本文（改行は\\\\nでエスケープ）"}'
    )

    system_msg = (
        "あなたは日本語のnote.comライター。以下のルールを必ず守る。\n"
        "絶対禁止：教科書的な書き出し。用語の解説記事。\n"
        "必須：指定された実体験をベースにした一人称の体験談。\n"
        "必須：1500〜2000文字の十分な長さで出力すること。\n"
        "必須：JSONのみを返す。改行はエスケープすること。"
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=4000,
    )
    
    content = response.choices[0].message.content.strip()
    start = content.find("{")
    end = content.rfind("}") + 1
    raw_json = content[start:end]
    return json.loads(raw_json, strict=False)

if __name__ == "__main__":
    print("生成中...")
    try:
        article = test_generate(TEST_THEME)
        output_path = os.path.join(os.path.dirname(__file__), "..", "data", "test_aida.md")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"# {article.get('title')}\n\n")
            f.write(article.get("body").replace("\\n", "\n"))
        print(f"✅ 生成成功！ 保存先: {output_path}")
    except Exception as e:
        print(f"❌ エラー: {e}")
