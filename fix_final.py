#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LearnAI.html 終日動作 最終パッチ

【修正①】デフォルト取込間隔 15秒 → 60秒
  1日8時間使用時の Vision API 呼び出し回数:
    15秒: 1920回 → Gemini1キー(1500/日)が6時間で枯渇
    60秒:  480回 → Gemini1キー(1500/日)が終日余裕で持つ

【修正②】Vision API 優先順位を修正（未適用の場合のみ）
  旧: Gemini(1番) → OR → Groq
  新: Groq(1番) → OR → Gemini（Geminiをバックアップに降格）

実行方法:
  python fix_final.py
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
backup = target.with_suffix(".html.finalbak")
shutil.copy2(target, backup)
print(f"✅ バックアップ: {backup}\n")

html = target.read_text(encoding="utf-8")
original = html
applied = []
skipped = []

def patch(name, old, new):
    global html
    if old in html:
        html = html.replace(old, new, 1)
        applied.append(name)
        print(f"  ✅ {name}")
        return True
    skipped.append(name)
    print(f"  ⚠  スキップ（適用済みまたはコード差異）: {name}")
    return False

print("── パッチ適用中 ────────────────────────────────────────────────────")

# ─────────────────────────────────────────────────────────────────────────────
# 修正①-A: JS変数のデフォルト値を 15 → 60 秒
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "修正①-A: smartCooldown デフォルト 15→60秒",
    "let smartCooldown    = 15;     // 変化後の最小待機秒数（連続撮影防止）",
    "let smartCooldown    = 60;     // 変化後の最小待機秒数（60秒=終日動作の基準値）"
)

# ─────────────────────────────────────────────────────────────────────────────
# 修正①-B: UIのセレクトボックスで 60秒 をデフォルト選択にする
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "修正①-B: UIセレクト 60秒をデフォルト選択に",
    '                <option value="10">10秒</option>\n'
    '                <option value="15" selected>15秒</option>\n'
    '                <option value="30">30秒</option>\n'
    '                <option value="60">60秒</option>',

    '                <option value="15">15秒</option>\n'
    '                <option value="30">30秒</option>\n'
    '                <option value="60" selected>60秒（推奨・終日動作）</option>\n'
    '                <option value="120">120秒</option>'
)

# ─────────────────────────────────────────────────────────────────────────────
# 修正②: Vision API 優先順位 — Gemini → Groq (未適用の場合のみ)
#
# 旧順序: Gemini(2番) → OR(4番) → Groq(5番)
# 新順序: Groq(2番) → OR(3番) → Gemini(4番)
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "修正②: Vision優先順位 Groq→OR→Gemini に変更",
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
    "  }",

    "  // ── 2. Groq Vision（無料・Gemini消費ゼロ・最優先）───────────────\n"
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
    "  // ── 3. OpenRouter 無料Visionモデル ────────────────────────────\n"
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
    "  // ── 4. Gemini（Groq/OR が両方失敗した時のみ使用・クォータ温存）─\n"
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

# ─────────────────────────────────────────────────────────────────────────────
# 書き出し
# ─────────────────────────────────────────────────────────────────────────────
print("\n── 結果 ──────────────────────────────────────────────────────────────")
if html == original:
    print("❌ 変更なし。")
    sys.exit(1)

target.write_text(html, encoding="utf-8")
print(f"\n✅ 適用 {len(applied)}件 / スキップ {len(skipped)}件")
print(f"💾 保存先: {target}")
print(f"🔁 戻す場合: {backup}\n")
print("次のステップ:")
print("  1. LearnAI_start.bat を再起動")
print("  2. Ctrl+Shift+R でブラウザ強制リロード\n")
print("修正後の Vision API 呼び出し回数（1日8時間）:")
print("  60秒間隔: 最大480回 → Gemini1キー(1500/日)で余裕")
print("  Groq Vision が先に処理 → Gemini はさらに温存")
