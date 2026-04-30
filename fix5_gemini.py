#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LearnAI.html Gemini APIクォータ浪費バグ修正スクリプト

【修正内容】
  GEMINI_FIX1: callGeminiModel — 429エラーで全キーのループを抜けるバグ
               キー1が上限でもキー2〜5を試さず Gemini 全体を3分停止していた
               → 全キー試してからクールダウン・throw に修正

  GEMINI_FIX2: callVisionAI — クールダウン中でも Gemini を叩き続けるバグ
               クールダウン中の 429 リクエストも RPM に積算される
               → クールダウン中はスキップして他プロバイダーへ

  GEMINI_FIX3: callGemini（画像）— quota エラーで次モデルを試さないバグ
               gemini-2.0-flash が quota 切れでも gemini-2.0-flash-lite を試せばいい
               → 全エラーで次モデルへ continue するよう修正

実行方法:
  python fix5_gemini.py
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
backup = target.with_suffix(".html.gemfixbak")
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
    print(f"  ⚠  スキップ: {name}  ← マッチせず")
    return False

print("── パッチ適用中 ────────────────────────────────────────────────────")

# ─────────────────────────────────────────────────────────────────────────────
# GEMINI_FIX1a: lastQuotaCoolMs 変数を追加
#   callGeminiModel でキーごとのクールダウン時間を記録するために必要
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "GEMINI_FIX1a: lastQuotaCoolMs 変数追加",
    "  let lastErr = null;\n"
    "\n"
    "  for (let attempt = 0; attempt < totalKeys; attempt++) {",

    "  let lastErr = null;\n"
    "  let lastQuotaCoolMs = 0; // quota超過時の最大クールダウン記録用\n"
    "\n"
    "  for (let attempt = 0; attempt < totalKeys; attempt++) {"
)

# ─────────────────────────────────────────────────────────────────────────────
# GEMINI_FIX1b: 429 を throw → continue に変更（キー全巡後にクールダウン設定）
#
# バグ: キー1が429を返したとき throw してループを抜けていた
#       → キー2〜5が試されず、Gemini全体が3分ブロック（実質1キー運用状態）
#
# 修正: continue で次のキーへ。全キー試した後でクールダウン設定。
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "GEMINI_FIX1b: 429 でキーローテーション継続（throw→continue）",
    "        if (res.status === 429 || (errMsg.toLowerCase().includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED'))) {\n"
    "          // ヘッダー駆動の可変クールダウン（Retry-After or デフォルト3分）\n"
    "          const coolMs = _parseCooldownMs(res.headers, 'Gemini');\n"
    "          _setProviderCooldown('gemini', coolMs);\n"
    "          toast('Gemini停止中: quota節約のため他プロバイダーへ切替', 'err');\n"
    "          throw new Error(`Google AI Studio 側の無料枠上限です。quota節約のため他プロバイダーへ切替します（key ${keyIdx + 1}）`);\n"
    "        }",

    "        if (res.status === 429 || (errMsg.toLowerCase().includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED'))) {\n"
    "          // quota/rate超過 → このキーをスキップして次のキーへ（全キー試してから諦める）\n"
    "          const coolMs = _parseCooldownMs(res.headers, 'Gemini');\n"
    "          lastQuotaCoolMs = Math.max(lastQuotaCoolMs, coolMs); // 最大クールダウンを記録\n"
    "          if (totalKeys > 1) {\n"
    "            toast(`⏩ Geminiキー${keyIdx + 1} quota超過 → キー${((keyIdx + 1) % totalKeys) + 1}へ切替`, 'err');\n"
    "          }\n"
    "          lastErr = new Error(`Gemini key ${keyIdx + 1} quota/rate超過`);\n"
    "          continue; // ← throw しない。次のキーへ\n"
    "        }"
)

# ─────────────────────────────────────────────────────────────────────────────
# GEMINI_FIX1c: 全キー失敗時のみクールダウンを設定
#   全キーが quota 超過した場合のみ Gemini 全体をクールダウン
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "GEMINI_FIX1c: 全キー失敗時のみクールダウン設定",
    "  // 全キー失敗\n"
    "  setApiStatus('err', 'Gemini 全キー失敗');\n"
    "  throw lastErr || new Error('Gemini: 全てのAPIキーが失敗しました。キーを確認してください。');",

    "  // 全キー失敗\n"
    "  if (lastQuotaCoolMs > 0) {\n"
    "    // 全キーquota超過の場合のみクールダウンを設定（RPM超過なら短時間、RPD枯渇なら長時間）\n"
    "    _setProviderCooldown('gemini', lastQuotaCoolMs);\n"
    "    toast('Gemini 全キーquota超過 → 他プロバイダーへ自動切替します', 'err');\n"
    "  }\n"
    "  setApiStatus('err', 'Gemini 全キー失敗');\n"
    "  throw lastErr || new Error('Gemini: 全てのAPIキーが失敗しました。キーを確認してください。');"
)

# ─────────────────────────────────────────────────────────────────────────────
# GEMINI_FIX2: callVisionAI — クールダウン中の Gemini 呼び出しをスキップ
#
# バグ: _isProviderCooling('gemini') のチェックがなく、クールダウン中でも
#       毎回 Gemini を叩いて 429 を受け続けていた
#
# 修正: クールダウン中はスキップして OpenRouter/Groq/GitHub にフォールバック
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "GEMINI_FIX2: callVisionAI クールダウンチェック追加",
    "  // ── 2. Gemini（キーがあれば最も安定）────────────────────────────\n"
    "  if (apiKey) {\n"
    "    try {\n"
    "      const r = await callGemini(prompt, [{ mimeType: 'image/jpeg', data: b64 }], false);\n"
    "      if (p !== 'gemini') toast('📷 画像解析: Gemini', '');\n"
    "      return r;\n"
    "    } catch(e) { errs.push(`Gemini: ${e.message.slice(0,60)}`); }\n"
    "  }",

    "  // ── 2. Gemini（クールダウン中はスキップして他プロバイダーへ）────\n"
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
# GEMINI_FIX3: callGemini（画像）— quota エラーで次モデルを試さないバグ
#
# バグ: gemini-2.0-flash が quota 切れ → throw して次のモデル試さず終了
#       gemini-2.0-flash-lite（別クォータ）を試せば成功するかもしれないのに
#
# 修正: 全エラーで continue して全モデルを試す
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "GEMINI_FIX3: callGemini画像モデルループ — 全エラーで次モデルへ継続",
    "    } catch(e) {\n"
    "      if (e.message.includes('全てのAPIキーが失敗')) throw e;\n"
    "      if (isModelNotFound(e.message)) { lastErr = e; continue; }\n"
    "      throw e;\n"
    "    }\n"
    "  }\n"
    "  throw lastErr || new Error('Gemini: 全モデルが失敗しました。しばらく待つか、別のAPIキーを設定してください。');",

    "    } catch(e) {\n"
    "      // quota/rate/auth/model問わず次のモデルへ（モデルごとに独立したクォータを持つ）\n"
    "      lastErr = e;\n"
    "      continue;\n"
    "    }\n"
    "  }\n"
    "  throw lastErr || new Error('Gemini: 全モデルが失敗しました。しばらく待つか、別のAPIキーを設定してください。');"
)

# ─────────────────────────────────────────────────────────────────────────────
# 書き出し
# ─────────────────────────────────────────────────────────────────────────────
print("\n── 結果 ──────────────────────────────────────────────────────────────")
if html == original:
    print("❌ 変更なし。全パッチがスキップされました。")
    sys.exit(1)

target.write_text(html, encoding="utf-8")
print(f"\n✅ 適用 {len(applied)}件: {', '.join(applied)}")
if skipped:
    print(f"⚠  スキップ {len(skipped)}件: {', '.join(skipped)}")
print(f"\n💾 保存先: {target}")
print(f"🔁 戻す場合: {backup} を上書きコピー\n")
print("─────────────────────────────────────────────────────────────────────")
print("次のステップ:")
print("  1. LearnAI_start.bat を再起動")
print("  2. Ctrl+Shift+R でブラウザ強制リロード\n")
print("期待される改善:")
print("  キー1が quota 超過 → キー2〜5へ自動切替（5倍の実効クォータ）")
print("  gemini-2.0-flash 枯渇 → gemini-2.0-flash-lite へ自動切替")
print("  クールダウン中は Gemini を叩かず OR/Groq/GitHub で即応答")
print("  → 合計で 数時間 → ほぼ終日 に伸びる見込み")
