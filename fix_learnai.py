#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LearnAI.html バグ修正スクリプト v2
実行方法:
  python fix_learnai.py                        # LearnAI.html と同フォルダで実行
  python fix_learnai.py C:\path\to\LearnAI.html  # パス直接指定

【修正内容と理由】
  FIX1: 変数追加 (_isCapturingNow, _prevOcrText)
  FIX2: _smartDetecting のリセットを doCapture 完了後に移動（二重取込バグ）
  FIX3: doCapture() 並行実行防止（全returnポイントにフラグ解放追加）
  FIX4: OCR事前変化チェック ← 最重要
        → OCRは「出力」ではなく「同じ画面か判定」にのみ使用
        → Vision API(Gemini等)は変化があった場合のみ呼び出す
        → 同一スライドを何度も Gemini/Groq/OpenRouter/GitHub と試さない
  FIX5: sendChat() 二重送信防止
  FIX6: stopCapture() で _prevOcrText をリセット
"""

import sys, shutil
from pathlib import Path

# ─── ファイル特定 ──────────────────────────────────────────────────────────
if len(sys.argv) >= 2:
    target = Path(sys.argv[1])
else:
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
backup = target.with_suffix(".html.bak")
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
    print(f"  ⚠  スキップ: {name}")
    return False

print("── パッチ適用中 ────────────────────────────────────────────────────")

# ─────────────────────────────────────────────────────────────────────────────
# FIX 1: 変数宣言を追加
#   _isCapturingNow: 並行取込防止フラグ
#   _prevOcrText   : 前回キャプチャのOCRテキスト（変化検知用のみ）
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX1: 変数追加 (_isCapturingNow, _prevOcrText)",
    "let _smartDetecting  = false;  // 変化検知後・安定待ち中フラグ",
    "let _smartDetecting  = false;  // 変化検知後・安定待ち中フラグ\n"
    "let _isCapturingNow  = false;  // 並行取込防止フラグ\n"
    "let _prevOcrText     = '';     // 前回OCRテキスト（変化検知用のみ・出力には不使用）"
)

# ─────────────────────────────────────────────────────────────────────────────
# FIX 2: _smartDetecting のリセットを doCapture() 完了後に移動
#
# バグ: doCapture() を呼ぶ前に _smartDetecting = false にしていた
#       → Vision API の応答待ち（5〜15秒）中に次の変化検知が走り二重取込発生
# 修正: await doCapture() が終わった後にリセット
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX2: _smartDetecting リセットタイミング修正（二重取込バグ）",
    "    _smartStabTimer = setTimeout(async () => {\n"
    "      if (!isCap) { _smartDetecting = false; return; }\n"
    "      _smartLastCapTs = Date.now();\n"
    "      _smartDetecting = false;\n"
    "      const badge = document.getElementById('smartStatusBadge');\n"
    "      if (badge) badge.textContent = '📸 撮影中…';\n"
    "      await doCapture(false);\n"
    "      if (badge) badge.textContent = '🔍 監視中';\n"
    "      // CDラベルをクールダウン表示に切り替え\n"
    "      _smartShowCooldown();\n"
    "    }, 3000);",

    "    _smartStabTimer = setTimeout(async () => {\n"
    "      if (!isCap) { _smartDetecting = false; return; }\n"
    "      _smartLastCapTs = Date.now();\n"
    "      const badge = document.getElementById('smartStatusBadge');\n"
    "      if (badge) badge.textContent = '📸 撮影中…';\n"
    "      await doCapture(false);       // API完了まで待つ\n"
    "      _smartDetecting = false;      // ← 完了後にリセット（二重取込防止）\n"
    "      if (badge) badge.textContent = '🔍 監視中';\n"
    "      _smartShowCooldown();\n"
    "    }, 3000);"
)

# ─────────────────────────────────────────────────────────────────────────────
# FIX 3a: doCapture() 先頭に並行実行ガードを追加
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX3a: doCapture() 並行実行ガード（先頭）",
    "async function doCapture(force = false) {\n"
    "  const vid = document.getElementById('capVideo');\n"
    "  if (!vid.videoWidth) {\n"
    "    if (force) toast('⚠ 映像がまだ届いていません。数秒待ってから再度押してください', 'err');\n"
    "    return;\n"
    "  }",

    "async function doCapture(force = false) {\n"
    "  if (_isCapturingNow) {\n"
    "    if (force) toast('⚠ 前の取込処理がまだ完了していません', 'err');\n"
    "    return;\n"
    "  }\n"
    "  _isCapturingNow = true;\n"
    "  const vid = document.getElementById('capVideo');\n"
    "  if (!vid.videoWidth) {\n"
    "    if (force) toast('⚠ 映像がまだ届いていません。数秒待ってから再度押してください', 'err');\n"
    "    _isCapturingNow = false; return;\n"
    "  }"
)

# ─────────────────────────────────────────────────────────────────────────────
# FIX 3b: canvas セキュリティエラー時の早期 return にフラグ解放追加
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX3b: canvas secErr return にフラグ解放",
    "  } catch(secErr) {\n"
    "    toast('⚠ 画面共有エラー：「画面全体」または「ウィンドウ」で共有してください', 'err');\n"
    "    return;\n"
    "  }",

    "  } catch(secErr) {\n"
    "    toast('⚠ 画面共有エラー：「画面全体」または「ウィンドウ」で共有してください', 'err');\n"
    "    _isCapturingNow = false; return;\n"
    "  }"
)

# ─────────────────────────────────────────────────────────────────────────────
# FIX 3c: 固定間隔モードの差分スキップ return にフラグ解放追加
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX3c: 差分スキップ return にフラグ解放",
    "    if (diffRatio < 0.02) {\n"
    "      skipCnt++; updateCapStats();\n"
    "      toast('変化なしのためスキップ');\n"
    "      return;\n"
    "    }",

    "    if (diffRatio < 0.02) {\n"
    "      skipCnt++; updateCapStats();\n"
    "      toast('変化なしのためスキップ');\n"
    "      _isCapturingNow = false; return;\n"
    "    }"
)

# ─────────────────────────────────────────────────────────────────────────────
# FIX 3d: doCapture() catch/finally でフラグを確実に解放
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX3d: doCapture() catch/finally フラグ解放",
    "  } catch(e) {\n"
    "    const msg = (e.message || '');\n"
    "    const msgLow = msg.toLowerCase();\n"
    "    // 画像解析全失敗 → accumに記録しない（類似度チェックを汚染しないため）・キャプチャは継続\n"
    "    const isAllFailed = msg.includes('全て失敗') || msg.includes('画像解析');\n"
    "    const isAuthErr = !isAllFailed && (msgLow.includes('401') || msgLow.includes('403') || msgLow.includes('unauthorized') || msgLow.includes('未設定'));\n"
    "    if (isAllFailed) {\n"
    "      // フレームをスキップして継続（accumに記録しない）\n"
    "      toast('⚠ 画像解析失敗 → フレームスキップ・継続中', 'err');\n"
    "      updateBubble(ai, `⏭ 画像解析失敗（スキップして次の取込を待機中）\\n${msg.slice(0,120)}`);\n"
    "    } else {\n"
    "      showErrorBubble(ai, e);\n"
    "    }\n"
    "  }\n"
    "}",

    "  } catch(e) {\n"
    "    const msg = (e.message || '');\n"
    "    const msgLow = msg.toLowerCase();\n"
    "    // 画像解析全失敗 → accumに記録しない（類似度チェックを汚染しないため）・キャプチャは継続\n"
    "    const isAllFailed = msg.includes('全て失敗') || msg.includes('画像解析');\n"
    "    const isAuthErr = !isAllFailed && (msgLow.includes('401') || msgLow.includes('403') || msgLow.includes('unauthorized') || msgLow.includes('未設定'));\n"
    "    if (isAllFailed) {\n"
    "      toast('⚠ 画像解析失敗 → フレームスキップ・継続中', 'err');\n"
    "      updateBubble(ai, `⏭ 画像解析失敗（スキップして次の取込を待機中）\\n${msg.slice(0,120)}`);\n"
    "    } else {\n"
    "      showErrorBubble(ai, e);\n"
    "    }\n"
    "  } finally {\n"
    "    _isCapturingNow = false; // 成功・失敗どちらでも必ず解放\n"
    "  }\n"
    "}"
)

# ─────────────────────────────────────────────────────────────────────────────
# FIX 4: OCR事前変化チェック【最重要・Vision API節約の核心】
#
# 【変更前の問題】
#   スライドが変わっていなくても毎回 Vision API（Gemini/Groq/OR/GitHub/HF）を呼んでいた。
#   さらに失敗すると次のプロバイダーへと何度もAPIコールが発生。
#   例: Gemini5キー全滅 → Groq Vision → OpenRouter → GitHub → HuggingFace
#       = 1回のキャプチャで最大10回以上のAPI呼び出し
#
# 【変更後の設計】
#   Vision APIを呼ぶ前に OCR（ローカル・無料）で変化を事前チェック。
#   OCRが「前回と88%以上一致」と判定した場合 → Vision API を呼ばずスキップ。
#   OCRが読めない（図解・画像スライド）や「変化あり」の場合 → 従来通り Vision API を呼ぶ。
#
# 【出力品質への影響】
#   なし。Vision API を呼ぶ場合は従来と全く同じ処理。
#   OCR は「変化したか」の判定にのみ使用し、出力テキスト生成には一切使わない。
#
# 【節約効果の試算】
#   典型的な学習動画: 同じスライドを平均60秒表示、30秒間隔でキャプチャなら50%重複
#   → Vision API呼び出しを最大50%削減 → Geminiの1日1500枠が実質3000枠相当に
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX4: OCR事前変化チェック（Vision API節約・最重要）",

    # ── OLD: Vision API直接呼び出しブロック ──────────────────────────────
    "    // ── スマートOCR優先 + Vision フォールバック設計 ─────────────────────\n"
    "    //\n"
    "    // コスト構造（すべて無料）:\n"
    "    //   OCR (Tesseract.js)     → ローカル処理、完全無料・無制限\n"
    "    //   テキストLLM (Cerebras) → 1,000,000 tok/日 無料\n"
    "    //   Vision API  (Gemini)   → 1,500回/日 × 5キー = 7,500回/日 無料\n"
    "    //\n"
    "    // 優先順位:\n"
    "    //   1. OCR で十分読めた場合 → OCR + テキストLLM（Cerebras）→ 完全無料\n"
    "    //   2. OCR が不十分（図解・ボックス中心）→ Gemini Vision（7,500回/日）\n"
    "    //   3. Vision キーもない → OCR + テキストLLM で最善を尽くす\n"
    "    //\n"
    "    // 典型的な1日の消費量（60秒間隔・8時間学習 = 480回）:\n"
    "    //   テキストスライド(60%): 288回 × Cerebras ~500tok = 144,000tok (Cerebras上限の14%)\n"
    "    //   図解スライド  (40%): 192回 × Gemini Vision    = 192回/7,500枠 (枠の2.6%)\n"
    "    //   → 余裕で1日使い切れる\n"
    "\n"
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
    "\n"
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
    "    }",

    # ── NEW: OCR事前チェック → 変化ありのみ Vision API 呼び出し ─────────
    "    // ── Vision API 呼び出し設計（OCR事前変化チェック付き）────────────────\n"
    "    //\n"
    "    // 【フロー】\n"
    "    //   Step1: OCR（ローカル・無料）で画面テキストを取得\n"
    "    //   Step2: 前回OCRと88%以上一致 → スキップ（Vision API不使用）\n"
    "    //   Step3: 変化あり / OCR読取不可（図解）→ Vision API で高品質解析\n"
    "    //\n"
    "    // 【重要】OCR は「変化検知用」のみ。出力は Vision API が担当（品質維持）\n"
    "\n"
    "    let r;\n"
    "    const hasVisionKey = !!(apiKey || groqKey || orKey || ghKey);\n"
    "\n"
    "    // ── Step1: OCR事前チェック（Vision API呼び出し前の節約ゲート）──────\n"
    "    const _ocrPreCheck = await callLocalOCR(b64);\n"
    "    const _ocrReadable = !!(_ocrPreCheck && _ocrPreCheck.length > 50);\n"
    "\n"
    "    if (_ocrReadable && _prevOcrText) {\n"
    "      // テキストが読めた かつ 前回比較データがある → 類似度チェック\n"
    "      const _ocrSim = _captureSimilarity(_ocrPreCheck, _prevOcrText);\n"
    "      if (_ocrSim > 0.88) {\n"
    "        // 88%以上一致 → 同一スライドと判定 → Vision API 呼び出しをスキップ\n"
    "        _prevOcrText = _ocrPreCheck; // 次回比較用に更新\n"
    "        skipCnt++; updateCapStats();\n"
    "        updateBubble(ai, `⏭ 画面変化なし（一致率${Math.round(_ocrSim*100)}%）のためスキップ`);\n"
    "        toast(`⏭ OCR事前スキップ（${Math.round(_ocrSim*100)}%）`);\n"
    "        _isCapturingNow = false; return;\n"
    "      }\n"
    "    }\n"
    "    // OCRが読めた場合は次回比較用に保存（読めなかった場合は更新しない）\n"
    "    if (_ocrReadable) _prevOcrText = _ocrPreCheck;\n"
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

# ─────────────────────────────────────────────────────────────────────────────
# FIX 5: sendChat() 二重送信防止
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX5a: sendChat() 送信中フラグ宣言と先頭ガード",
    "async function sendChat() {\n"
    "  const el = document.getElementById('chatIn');\n"
    "  const v  = el.value.trim(); if (!v) { toast('メッセージを入力してください', 'err'); return; }\n"
    "  el.value = '';\n"
    "\n"
    "  // ── 意図検出 ──\n"
    "  const intent = detectIntent(v);\n"
    "  addUserMsg(v, intent.label);\n"
    "\n"
    "  const ai = addAIMsg(); setTyping(ai);\n"
    "  document.getElementById('sendBtn').disabled = true;",

    "let _isChatSending = false;\n"
    "async function sendChat() {\n"
    "  if (_isChatSending) { toast('⚠ 送信中です。しばらくお待ちください', 'err'); return; }\n"
    "  _isChatSending = true;\n"
    "  const el = document.getElementById('chatIn');\n"
    "  const v  = el.value.trim();\n"
    "  if (!v) { _isChatSending = false; toast('メッセージを入力してください', 'err'); return; }\n"
    "  el.value = '';\n"
    "\n"
    "  // ── 意図検出 ──\n"
    "  const intent = detectIntent(v);\n"
    "  addUserMsg(v, intent.label);\n"
    "\n"
    "  const ai = addAIMsg(); setTyping(ai);\n"
    "  document.getElementById('sendBtn').disabled = true;"
)

# sendChat 末尾にフラグ解放を追加（関数内の最初のマッチのみ）
idx_chat = html.find("async function sendChat")
if idx_chat != -1:
    seg = html[idx_chat: idx_chat + 2500]
    old_end = (
        "  } catch(e) { showErrorBubble(ai, e); }\n"
        "  document.getElementById('sendBtn').disabled = false;\n"
        "}"
    )
    new_end = (
        "  } catch(e) { showErrorBubble(ai, e); }\n"
        "  document.getElementById('sendBtn').disabled = false;\n"
        "  _isChatSending = false;\n"
        "}"
    )
    if old_end in seg:
        html = html[:idx_chat] + seg.replace(old_end, new_end, 1) + html[idx_chat + 2500:]
        applied.append("FIX5b: sendChat() 末尾フラグ解放")
        print("  ✅ FIX5b: sendChat() 末尾フラグ解放")
    else:
        skipped.append("FIX5b: sendChat() 末尾")
        print("  ⚠  スキップ: FIX5b: sendChat() 末尾")

# ─────────────────────────────────────────────────────────────────────────────
# FIX 6: stopCapture() で _prevOcrText をリセット
#         キャプチャを止めて再開したとき前回のOCRが残らないようにする
# ─────────────────────────────────────────────────────────────────────────────
patch(
    "FIX6: stopCapture() で _prevOcrText リセット",
    "  lastPx = null;\n"
    "  document.getElementById('capActive').classList.remove('show');",

    "  lastPx = null;\n"
    "  _prevOcrText = ''; // OCR前回データをリセット\n"
    "  document.getElementById('capActive').classList.remove('show');"
)

# ─────────────────────────────────────────────────────────────────────────────
# 書き出し
# ─────────────────────────────────────────────────────────────────────────────
print("\n── 結果 ──────────────────────────────────────────────────────────────")
if html == original:
    print("❌ 変更なし。全パッチがスキップされました。")
    print("   ファイルのバージョンが異なる可能性があります。")
    sys.exit(1)

target.write_text(html, encoding="utf-8")
print(f"✅ 適用 {len(applied)}件: {', '.join(applied)}")
if skipped:
    print(f"⚠  スキップ {len(skipped)}件: {', '.join(skipped)}")
print(f"\n💾 保存先: {target}")
print(f"🔁 戻す場合: {backup} を上書きコピー\n")
print("─────────────────────────────────────────────────────────────────────")
print("次のステップ:")
print("  1. LearnAI_start.bat を再起動")
print("  2. Ctrl+Shift+R でブラウザ強制リロード")
print("  3. 画面自動取込を開始して確認\n")
print("期待される改善:")
print("  同一スライドの連続 → OCR事前チェックでVision API呼び出しゼロ")
print("  スライドが変わった → 従来通り Vision API（Gemini等）で高品質解析")
print("  図解・画像スライド → OCRが読めないのでVision APIへ（品質維持）")
print("  二重取込          → API応答完了まで次のキャプチャを開始しない")
print("  推定節約効果      → 同一スライド率50%なら Vision API 消費が約半分に")
