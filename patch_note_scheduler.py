"""Patch note_scheduler.py with story-first marketing body_instruction + robust JSON parser."""
import os
import sys
import re

path = os.path.join(os.path.dirname(__file__), "backend/scheduler/note_scheduler.py")

# Restore from git first
os.system(f"cd {os.path.dirname(__file__)} && git checkout HEAD -- backend/scheduler/note_scheduler.py")

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"File loaded: {len(content)} chars, {content.count(chr(10))} lines")

# ── Patch 1: Replace marketing body_instruction ──
old1 = (
    '        body_instruction = (\n'
    '            "カテゴリ：マーケ学習アウトプット\\n"\n'
    '            f"概念：{concept}\\n"\n'
    '            f"概念の説明：{lecture_ref}\\n\\n"\n'
    '            "本文の構成：\\n"\n'
    '            f"1. {concept}という概念がある。（1〜2文で簡潔に説明）\\n"\n'
    '            "2. 自分の過去の仕事体験に当てはめると、どういうことか。（実体験ベース）\\n"\n'
    '            "3. GrowlまたはSage AIでどう実装・活用したか\\n"\n'
    '            "4. やってみて分かったこと・うまくいかなかったこと\\n"\n'
    '            "5. 次の仮説または今後やること（1〜2文）"\n'
    '        )'
)

new1 = (
    '        body_instruction = (\n'
    '            f"今日のテーマ（背景知識のみ）：{concept} — {lecture_ref}\\n\\n"\n'
    '            "【絶対に守るルール】\\n"\n'
    '            f"❌ NG：最初の文を「{concept}とは〜のことで」から始める\\n"\n'
    '            "❌ NG：教科書・ハウツー・フレームワーク解説記事にする\\n"\n'
    '            "✅ OK：バーガーショップ／Sage／Growl開発の具体的な一幕から始める\\n"\n'
    '            "✅ OK：失敗・恥・小さな数字・正直な感情を先に書く\\n\\n"\n'
    '            "【本文の流れ（ストーリー主導）】\\n"\n'
    '            "1. 書き出し：今日・最近の現場の具体的な一幕（1〜3文でリアルに）\\n"\n'
    '            "2. そこから気づいたこと・試したこと（マーケ概念は自然に出てくる程度でOK）\\n"\n'
    '            "3. 正直な数字を必ず1つ以上（フォロワー数・作業時間・売上・失敗コスト）\\n"\n'
    '            "4. うまくいかなかったこと・まだ分からないこと（正直に）\\n"\n'
    '            "5. 次にやること（1〜2文）"\n'
    '        )'
)

if old1 in content:
    content = content.replace(old1, new1, 1)
    print("✅ Patch 1 applied: marketing body_instruction replaced")
else:
    print("⚠️  Patch 1 skipped (already applied or not found)")

# ── Patch 2: Replace Groq API call with system_msg version ──
old2 = (
    '    response = client.chat.completions.create(\n'
    '        model="llama-3.3-70b-versatile",\n'
    '        messages=[{"role": "user", "content": prompt}],\n'
    '        temperature=0.75,\n'
    '        max_tokens=3000,\n'
    '    )'
)

new2 = (
    '    system_msg = (\n'
    '        "あなたは日本語のnote.comライター。以下のルールを必ず守る。\\n"\n'
    '        "絶対禁止：「〜とは〜のことです」「〜には以下の〜があります」から始める教科書的な書き出し。\\n"\n'
    '        "絶対禁止：マーケ用語の解説記事。読者は説明を求めていない。\\n"\n'
    '        "必須：バーガーショップ経営者・AI開発者の一人称の体験談として書く。\\n"\n'
    '        "必須：失敗・小さな数字・正直な感情を含める。\\n"\n'
    '        "必須：1500〜2500文字。JSONのみ返す。"\n'
    '    )\n'
    '    response = client.chat.completions.create(\n'
    '        model="llama-3.3-70b-versatile",\n'
    '        messages=[\n'
    '            {"role": "system", "content": system_msg},\n'
    '            {"role": "user", "content": prompt},\n'
    '        ],\n'
    '        temperature=0.8,\n'
    '        max_tokens=3500,\n'
    '    )'
)

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("✅ Patch 2 applied: system_msg + temperature 0.8 + max_tokens 3500")
elif 'system_msg' in content and 'temperature=0.8' in content:
    print("⚠️  Patch 2 skipped (already applied)")
else:
    print("❌ Patch 2 FAILED")
    idx = content.find('response = client.chat.completions.create')
    print(repr(content[idx:idx+300]))

# ── Patch 3: Robust JSON parser ──
old3_simple = (
    '    content = response.choices[0].message.content.strip()\n'
    '    start = content.find("{")\n'
    '    end = content.rfind("}") + 1\n'
    '    if start == -1:\n'
    '        raise ValueError("JSON not found in Groq response")\n'
    '    return json.loads(content[start:end])'
)

new3 = (
    '    content = response.choices[0].message.content.strip()\n'
    '    start = content.find("{")\n'
    '    end = content.rfind("}") + 1\n'
    '    if start == -1:\n'
    '        raise ValueError("JSON not found in Groq response")\n'
    '    raw_json = content[start:end]\n'
    '    try:\n'
    '        return json.loads(raw_json)\n'
    '    except json.JSONDecodeError:\n'
    '        # Fix unescaped literal newlines inside JSON string values\n'
    '        lines = raw_json.split("\\n")\n'
    '        cleaned = "\\\\n".join(lines)\n'
    '        return json.loads(cleaned)'
)

if old3_simple in content:
    content = content.replace(old3_simple, new3, 1)
    print("✅ Patch 3 applied: robust JSON parser")
elif 'raw_json' in content:
    print("⚠️  Patch 3 skipped (already applied)")
else:
    print("❌ Patch 3 FAILED")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

# Verify syntax
import ast
try:
    ast.parse(content)
    print("✅ Syntax OK — all patches applied successfully")
except SyntaxError as e:
    print(f"❌ Syntax error: {e}")
    sys.exit(1)
