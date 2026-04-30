#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LearnAI.html FIX4 単体パッチ
（fix_learnai.py でスキップされた FIX4 のみを適用）

実行方法:
  python fix4_only.py
"""

import sys, shutil
from pathlib import Path

# ── ファイル特定 ───────────────────────────────────────────────────────────
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
backup = target.with_suffix(".html.fix4bak")
shutil.copy2(target, backup)
print(f"✅ バックアップ: {backup}\n")

html = target.read_text(encoding="utf-8")

# ── 適用済みチェック ──────────────────────────────────────────────────────
if "_ocrPreCheck" in html:
    print("✅ FIX4 はすでに適用済みです。終了します。")
    sys.exit(0)

# ── FIX4 パッチ ──────────────────────────────────────────────────────────
# OLD: Vision API を直接呼ぶコードブロック（コメントを除いた実コード部分）
OLD = (
    "    let r;\n"
    "    const hasVisionKey = !!(apiKey || groqKey || orKey || ghKey);\n"
    "\n"
    "    if (hasVisionKey) {\n"
    "      // ── 【Vision優先】Gemini/Groq/GitHub Vision で画像を直接解析 ──\n"
    "      // 図解・ボックス・複雑なレイアウトも正確に読み取れる\n"
    "      // Gemini 2.0-flash: 1500回/日 × キー数 → 5キーで7500回/日（終日使用可）\n"
    "      const provName = apiKey ? 'Gemini' : groqKey ? 'Groq' : orKey ? 'OpenRouter' : 'GitHub';\n"
    "      toast(`📸 ${provName} Vision で画面解析中…`);\n"
    "      r = await callVisionAI(capturePrompt, b64);\n"
    "\n"
    "    } else {\n"
    "      // ── 【OCRフォールバック】Vision APIキーなし → Tesseract OCR + テキストLLM ──\n"
    "      // Vision APIキー（Geminiなど）を設定すると画像認識が大幅に改善します\n"
    "      toast('⚠ Vision APIキー未設定 → OCRで代替中（Geminiキー設定で大幅改善）');\n"
    "      const ocrRawText = await callLocalOCR(b64);\n"
    "      const ocrInput = ocrRawText && ocrRawText.length > 20\n"
    "        ? ocrRawText\n"
    "        : `（OCRテキスト取得不可 / 図解・グラフ・画像中心のスライドと推定）`;\n"
    "      const ocrPrompt = _buildOCRPrompt(\n"
    "        ocrInput, isStructured, videoTopic, audioTranscript, prevCaptures, ts, diagramRules\n"
    "      );\n"
    "      r = await callAI(ocrPrompt, false, null); // Cerebras(1M/日) → Gemini → Groq...\n"
    "      r = `[OCR取込]\\n${r}`;\n"
    "    }"
)

# NEW: OCR事前変化チェックを挟んだ設計（出力は Vision API がそのまま担当）
NEW = (
    "    // ── OCR事前変化チェック → 変化ありのみ Vision API を呼ぶ ─────────\n"
    "    // Step1: OCR（ローカル・無料）でテキスト取得\n"
    "    // Step2: 前回と88%以上一致 → 同一スライド → Vision API をスキップ\n"
    "    // Step3: 変化あり / 図解（OCR読取不可）→ Vision API で高品質解析\n"
    "    // ※ OCR は「変化検知用」のみ。出力品質は Vision API がそのまま担保。\n"
    "\n"
    "    let r;\n"
    "    const hasVisionKey = !!(apiKey || groqKey || orKey || ghKey);\n"
    "\n"
    "    // ── Step1: OCR事前チェック（Vision API節約ゲート）────────────────\n"
    "    const _ocrPreCheck = await callLocalOCR(b64);\n"
    "    const _ocrReadable = !!(_ocrPreCheck && _ocrPreCheck.length > 50);\n"
    "\n"
    "    if (_ocrReadable && _prevOcrText) {\n"
    "      const _ocrSim = _captureSimilarity(_ocrPreCheck, _prevOcrText);\n"
    "      if (_ocrSim > 0.88) {\n"
    "        // 88%以上一致 → 同一スライドと判定 → Vision API を呼ばずスキップ\n"
    "        _prevOcrText = _ocrPreCheck;\n"
    "        skipCnt++; updateCapStats();\n"
    "        updateBubble(ai, `⏭ 画面変化なし（一致率${Math.round(_ocrSim*100)}%）のためスキップ`);\n"
    "        toast(`⏭ OCR事前スキップ（${Math.round(_ocrSim*100)}%）`);\n"
    "        return; // finally ブロックが _isCapturingNow = false を実行する\n"
    "      }\n"
    "    }\n"
    "    if (_ocrReadable) _prevOcrText = _ocrPreCheck; // 次回比較用に保存\n"
    "\n"
    "    // ── Step2: 変化あり / 図解スライド → Vision API で高品質解析 ──────\n"
    "    if (hasVisionKey) {\n"
    "      const provName = apiKey ? 'Gemini' : groqKey ? 'Groq' : orKey ? 'OpenRouter' : 'GitHub';\n"
    "      toast(`📸 ${provName} Vision で画面解析中…`);\n"
    "      r = await callVisionAI(capturePrompt, b64);\n"
    "\n"
    "    } else {\n"
    "      // Vision APIキーなし → OCRテキスト + テキストLLM で代替\n"
    "      toast('⚠ Vision APIキー未設定 → OCRで代替中（Geminiキー設定で大幅改善）');\n"
    "      const ocrInput = _ocrReadable\n"
    "        ? _ocrPreCheck\n"
    "        : `（OCRテキスト取得不可 / 図解・グラフ・画像中心のスライドと推定）`;\n"
    "      const ocrPrompt = _buildOCRPrompt(\n"
    "        ocrInput, isStructured, videoTopic, audioTranscript, prevCaptures, ts, diagramRules\n"
    "      );\n"
    "      r = await callAI(ocrPrompt, false, null);\n"
    "      r = `[OCR取込]\\n${r}`;\n"
    "    }"
)

if OLD in html:
    html = html.replace(OLD, NEW, 1)
    target.write_text(html, encoding="utf-8")
    print("✅ FIX4: OCR事前変化チェック を適用しました！")
    print(f"\n💾 保存先: {target}")
    print(f"🔁 戻す場合: {backup} を上書きコピー\n")
    print("次のステップ:")
    print("  1. LearnAI_start.bat を再起動")
    print("  2. Ctrl+Shift+R でブラウザ強制リロード")
    print("  3. 同一スライドで「⏭ OCR事前スキップ」が出ることを確認\n")
else:
    print("❌ マッチしませんでした。コードが異なる可能性があります。")
    print("\n── デバッグ情報 ──")
    # 部分マッチを探して手がかりを出す
    fragments = [
        "let r;\n    const hasVisionKey",
        "r = await callVisionAI(capturePrompt, b64);",
        "const ocrRawText = await callLocalOCR(b64);",
    ]
    for frag in fragments:
        idx = html.find(frag)
        if idx != -1:
            print(f"  ✅ 見つかった: {repr(frag[:40])}")
            # 周辺コードを表示
            snippet = html[max(0,idx-80):idx+80]
            print(f"     周辺: {repr(snippet[:120])}")
        else:
            print(f"  ❌ 見つからない: {repr(frag[:40])}")
    sys.exit(1)
