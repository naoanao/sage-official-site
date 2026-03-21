@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1

:: ============================================================
:: Sage - First-Time Setup Wizard
:: 初回セットアップ（買い手用）
:: ============================================================
echo.
echo  ============================================================
echo   Sage  ^|  First-Time Setup
echo  ============================================================
echo.

:: ── スクリプトのあるフォルダをプロジェクトルートにする ──────────
cd /d "%~dp0"

:: ── Python 検出 ───────────────────────────────────────────────
set "PY="

where py >nul 2>&1
if not errorlevel 1 (
    py -3 --version >nul 2>&1
    if not errorlevel 1 (
        set "PY=py -3"
    )
)

if not defined PY (
    where python >nul 2>&1
    if not errorlevel 1 (
        set "PY=python"
    )
)

if not defined PY (
    where python3 >nul 2>&1
    if not errorlevel 1 (
        set "PY=python3"
    )
)

if not defined PY (
    echo  [ERROR] Python 3 が見つかりません。
    echo.
    echo  Python 3.10 以上をインストールしてください:
    echo    https://www.python.org/downloads/
    echo.
    echo  インストール時に "Add Python to PATH" にチェックを入れてください。
    echo  インストール後、このスクリプトを再実行してください。
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('!PY! --version 2^>^&1') do set "PYVER=%%v"
echo  [OK] Python 検出: !PYVER!
echo.

:: ── Python バージョン確認 (3.10+) ────────────────────────────
for /f "tokens=2 delims= " %%v in ("!PYVER!") do set "PVNUM=%%v"
for /f "tokens=1,2 delims=." %%a in ("!PVNUM!") do (
    set "PMAJ=%%a"
    set "PMIN=%%b"
)
if !PMAJ! LSS 3 (
    echo  [ERROR] Python 3.10 以上が必要です。現在: !PYVER!
    pause
    exit /b 1
)
if !PMAJ! EQU 3 (
    if !PMIN! LSS 10 (
        echo  [WARN] Python 3.10 以上を推奨します。現在: !PYVER!
        echo         続行しますが、問題が起きる場合は Python を更新してください。
        echo.
    )
)

:: ── [STEP 1/3] Python 依存パッケージインストール ───────────────
echo  [1/3] Python パッケージをインストールしています...
echo        (初回は数分かかる場合があります)
echo.

!PY! -m pip install --upgrade pip --quiet 2>&1
!PY! -m pip install -r backend/requirements.txt

if errorlevel 1 (
    echo.
    echo  [ERROR] パッケージのインストールに失敗しました。
    echo          上のエラーメッセージを確認してください。
    echo.
    pause
    exit /b 1
)

echo.
echo  [OK] Python パッケージのインストール完了。

:: ── [STEP 2/3] フロントエンド確認 ────────────────────────────
echo.
echo  [2/3] フロントエンドの確認...

if exist "dist\index.html" (
    echo  [OK] フロントエンド (dist/) が見つかりました。
) else (
    echo  [INFO] dist/ フォルダが見つかりません。Node.js でビルドを試みます...
    echo.
    where node >nul 2>&1
    if errorlevel 1 (
        echo  [WARN] Node.js が見つかりません。
        echo         フロントエンドなしで起動します（APIのみ動作）。
        echo.
        echo         完全な画面を使うには:
        echo           1. https://nodejs.org から Node.js をインストール
        echo           2. このスクリプトを再実行する
    ) else (
        echo  Node.js 検出。依存パッケージをインストールしてビルドします...
        call npm install --silent
        call npm run build
        if errorlevel 1 (
            echo  [WARN] フロントエンドのビルドに失敗しました。APIのみで起動します。
        ) else (
            echo  [OK] フロントエンドのビルド完了。
        )
    )
)

:: ── [STEP 3/3] .env 作成 ─────────────────────────────────────
echo.
echo  [3/3] API キーの設定...

if exist ".env" (
    echo  [INFO] .env が既に存在します。スキップします。
    echo         変更する場合は .env を直接編集してください。
    goto :setup_done
)

echo.
echo  ┌──────────────────────────────────────────────────────┐
echo  │  Groq API キーが必要です（無料で取得できます）         │
echo  │  取得先: https://console.groq.com                    │
echo  │   1. サインアップ（無料）                              │
echo  │   2. "API Keys" → "Create API Key"                   │
echo  │   3. 表示されたキーをコピー                            │
echo  └──────────────────────────────────────────────────────┘
echo.
set /p "GROQ_KEY=Groq API キーを貼り付けてください (Enter で後回し): "

if "!GROQ_KEY!"=="" (
    echo.
    echo  [WARN] APIキーが未入力です。後で .env を編集して設定してください。
    set "GROQ_KEY=YOUR_GROQ_API_KEY_HERE"
)

:: .env を書き出す
(
echo # ============================================================
echo # Sage  ^|  設定ファイル
echo # .env.example を参考に追加の設定ができます
echo # ============================================================
echo.
echo # [必須] AI エンジン - https://console.groq.com で無料取得
echo GROQ_API_KEY=!GROQ_KEY!
echo.
echo # ── オプション機能 (使わない場合は 0 のまま) ─────────────────
echo.
echo # Notion 連携
echo SAGE_ENABLE_NOTION=0
echo NOTION_API_KEY=
echo.
echo # Telegram 通知
echo SAGE_ENABLE_TELEGRAM=0
echo TELEGRAM_BOT_TOKEN=
echo TELEGRAM_CHAT_ID=
echo.
echo # Bluesky 投稿
echo SAGE_ENABLE_BLUESKY=0
echo BLUESKY_HANDLE=
echo BLUESKY_APP_PASSWORD=
echo.
echo # Perplexity (Web 検索強化)
echo PERPLEXITY_API_KEY=
echo.
echo # ── システム設定 ──────────────────────────────────────────────
echo SAGE_OFFLINE_MODE=False
echo SAGE_BYPASS_CHROMA=1
) > .env

echo  [OK] .env を作成しました。

:setup_done
echo.
echo  ============================================================
echo   セットアップ完了！
echo.
echo   次のステップ:
echo     start_sage.bat をダブルクリックして起動してください。
echo     ブラウザで http://localhost:8080 が開きます。
echo  ============================================================
echo.
pause
exit /b 0
