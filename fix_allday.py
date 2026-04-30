#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LearnAI.html 終日動作パッチ

【問題の核心】
  callVisionAI の優先順位が間違っていた:
    旧: Gemini（1番目）→ OR Vision → Groq Vision  ← Gemini を最初に消費
    新: Groq Vision（1番目）→ OR Vision → Gemini  ← 無料枠を先に使い、Gemini は最後

  Groq の Llama-4-Scout は Vision 対応・無料・Gemini とは別クォータ。
  OR の無料 Vision モデル群も Gemini とは別クォータ。
  → Groq と OR が先に消費されることで Gemini は温存される。

実行方法:
  python fix_allday.py
"""

import sys, shutil
from pathlib import Path

candidates = [
    Path(__file__).parent / "LearnAI.html",
    Path.home() / "Desktop" / "LearnAI.html",
]
target = next((c for c in candidates if c.exists()), None)
if target is None:
    p = input("LearnAI.html のフルパスを入力してください: ").strip().strip('"')
    target = Path(p)

if not target.exists():
    print(f"❌ ファイルが見つかりません: {target}")
    sys.exit(1)

print(f"🎯 対象: {target}")
backup = target.with_suffix(".html.alldaybak")
shutil.copy2(target, backup)
print(f"✅ バックアップ: {backup}\n")

html = target.read_text(encoding="utf-8")
original = html

# ── 適用済みチェック ──────────────────────────────────────────────────────
if "Groq Vision（無料" in html:
    print("✅ このパッチはすでに適用済みです。")
    sys.exit(0)

# ─────────────────────────────────────────────────────────────────────────────
# Vision API 優先順位の完全再設計
#
# 旧順序: 1.選択プロバイダー 2.Gemini 3.OR Vision 4.Groq Vision 5.GitHub 6.HF
# 新順序: 1.選択プロバイダー 2.Groq Vision 3.OR Vision 4.Gemini  5.GitHub 6.HF
#
# 変更理由:
#   Groq Vision (Llama-4-Scout) は無料・Gemini と独立したクォータ
#   OR 無料 Vision モデルも Gemini と独立したクォータ
#   → これらを先に使い切ってから Gemini に落ちる設計にする
#   → Gemini は温存され、終日持つ
# ─────────────────────────────────────────────────────────────────────────────

OLD = (
    "  // ── 2. Gemini（クールダウン中はスキップして他プロバイダーへ）────\n"
    "  if (apiKey && !_isProviderCooling('gemini')) {\n"
    "    try {\n"
    "      const r = await callGemini(prompt, [{ mimeType: 'image/jpeg', data: b64 }], false);\n"
    "      if (p !== 'gemini') toast('📷 画像解析: Gemini', '');\n"
    "      return r;\n"
    "    } catch(e) { errs.push(`Gemini: ${e.message.slice(0,60)}`); }\n"
    "  } else if (apiKey) {\n"
    "    errs.push('Gemini: クールダウン中（スキップ）');\n"
    "  }\n"
    "\n"
    "  // ── 4. OpenRouter ビジョンモデルを順番に試す ──────────────────────\n"
    "  if (orKey) {\n"
    "    for (const vm of OR_VISION_FALLBACKS) {\n"
    "      if (p === 'openrouter' && vm === m) continue;\n"
    "      try {\n"
    "        const r = await callOpenAICompatVision(\n"
    "          'https://openrouter.ai/api/v1/chat/completions', orKey, 'OpenRouter', vm, prompt, b64, OR_HEADERS);\n"
    "        toast(`📷 画像解析: OpenRouter (${vm.split('/')[1]?.split(':')[0] || vm})`, '');\n"
    "        return r;\n"
    "      } catch(e) { errs.push(`OR(${vm}): ${e.message.slice(0,60)}`); }\n"
    "    }\n"
    "  }\n"
    "\n"
    "  // ── 5. Groq Vision フォールバック（日次ブロックでなければ）─────────\n"
    "  if (groqKey && !_groqVisionDailyBlocked && !(p === 'groq' && VISION_MODELS.has(m))) {\n"
    "    try {\n"
    "      const r = await callOpenAICompatVision(\n"
    "        'https://api.groq.com/openai/v1/chat/completions', groqKey, 'Groq',\n"
    "        'meta-llama/llama-4-scout-17b-16e-instruct', prompt, b64);\n"
    "      toast('📷 画像解析: Groq Vision', '');\n"
    "      return r;\n"
    "    } catch(e) {\n"
    "      if (_isVisionDailyLimit(e.message)) _groqVisionDailyBlocked = true;\n"
    "      errs.push(`Groq Vision: ${e.message.slice(0,80)}`);\n"
    "    }\n"
    "  }"
)

NEW = (
    "  // ── 2. Groq Vision（無料・Gemini消費ゼロ・終日動作の柱）──────────\n"
    "  // Llama-4-Scout は Vision 対応・Gemini と独立クォータ → 先に消費\n"
    "  if (groqKey && !_groqVisionDailyBlocked && !(p === 'groq' && VISION_MODELS.has(m))) {\n"
    "    try {\n"
    "      const r = await callOpenAICompatVision(\n"
    "        'https://api.groq.com/openai/v1/chat/completions', groqKey, 'Groq',\n"
    "        'meta-llama/llama-4-scout-17b-16e-instruct', prompt, b64);\n"
    "      toast('📷 画像解析: Groq Vision', '');\n"
    "      return r;\n"
    "    } catch(e) {\n"
    "      if (_isVisionDailyLimit(e.message)) _groqVisionDailyBlocked = true;\n"
    "      errs.push(`Groq Vision: ${e.message.slice(0,80)}`);\n"
    "    }\n"
    "  }\n"
    "\n"
    "  // ── 3. OpenRouter 無料Visionモデル（Gemini消費ゼロ）──────────────\n"
    "  if (orKey) {\n"
    "    for (const vm of OR_VISION_FALLBACKS) {\n"
    "      if (p === 'openrouter' && vm === m) continue;\n"
    "      try {\n"
    "        const r = await callOpenAICompatVision(\n"
    "          'https://openrouter.ai/api/v1/chat/completions', orKey, 'OpenRouter', vm, prompt, b64, OR_HEADERS);\n"
    "        toast(`📷 画像解析: OpenRouter (${vm.split('/')[1]?.split(':')[0] || vm})`, '');\n"
    "        return r;\n"
    "      } catch(e) { errs.push(`OR(${vm}): ${e.message.slice(0,60)}`); }\n"
    "    }\n"
    "  }\n"
    "\n"
    "  // ── 4. Gemini（Groq/OR 両方失敗時のみ・クォータ温存）────────────\n"
    "  if (apiKey && !_isProviderCooling('gemini')) {\n"
    "    try {\n"
    "      const r = await callGemini(prompt, [{ mimeType: 'image/jpeg', data: b64 }], false);\n"
    "      if (p !== 'gemini') toast('📷 画像解析: Gemini', '');\n"
    "      return r;\n"
    "    } catch(e) { errs.push(`Gemini: ${e.message.slice(0,60)}`); }\n"
    "  } else if (apiKey) {\n"
    "    errs.push('Gemini: クールダウン中（スキップ）');\n"
    "  }"
)

if OLD in html:
    html = html.replace(OLD, NEW, 1)
    target.write_text(html, encoding="utf-8")
    print("✅ Vision API 優先順位を再設計しました")
    print("")
    print("  旧: Gemini（1番目）→ OR → Groq  ← Gemini を常に先に消費")
    print("  新: Groq（1番目）→ OR → Gemini  ← Gemini は最後の砦")
    print("")
    print(f"💾 保存先: {target}")
    print(f"🔁 戻す場合: {backup} を上書きコピー\n")
    print("─────────────────────────────────────────────────────────────────────")
    print("次のステップ:")
    print("  1. LearnAI_start.bat を再起動")
    print("  2. Ctrl+Shift+R でブラウザ強制リロード\n")
    print("期待される動作:")
    print("  画像解析 → Groq Vision (Llama-4-Scout) が処理")
    print("  Groq 日次上限到達後 → OR 無料モデルが処理")
    print("  OR も失敗時のみ → Gemini を使用")
    print("  Gemini 5キー × 1500/日 = 7500/日 が温存される")
else:
    print("❌ マッチしませんでした。すでに別バージョンが適用されているか、")
    print("   コードが異なる可能性があります。")
    print("")
    # デバッグ用: どこまでマッチするか確認
    lines = OLD.split('\n')
    for i, line in enumerate(lines[:5]):
        if line in html:
            print(f"  ✅ 行{i+1}マッチ: {repr(line[:60])}")
        else:
            print(f"  ❌ 行{i+1}ミス:   {repr(line[:60])}")
    sys.exit(1)
