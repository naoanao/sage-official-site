@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1

:: ============================================================
:: Sage  |  起動スクリプト（買い手用）
:: ダブルクリックで Sage が起動します。
:: ============================================================

:: スクリプトのあるフォルダをプロジェクトルートにする
cd /d "%~dp0"

:: ── セットアップ確認 ─────────────────────────────────────────
if not exist ".env" (
    echo.
    echo  [ERROR] .env が見つかりません。
    echo          先に setup.bat を実行してください。
    echo.
    pause
    exit /b 1
)

if not exist "backend\flask_server.py" (
    echo.
    echo  [ERROR] backend\flask_server.py が見つかりません。
    echo          Sage フォルダが正しく解凍されているか確認してください。
    echo.
    pause
    exit /b 1
)

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
    echo.
    echo  [ERROR] Python が見つかりません。
    echo          setup.bat を先に実行してください。
    echo.
    pause
    exit /b 1
)

:: ── ログフォルダ作成 ─────────────────────────────────────────
if not exist "logs" mkdir logs

:: ── ポート 8080 の既存プロセスをクリーンアップ ────────────────
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%P >nul 2>&1
)

:: ── Sage 起動 ─────────────────────────────────────────────────
echo.
echo  ============================================================
echo   Sage を起動しています...
echo  ============================================================
echo.
echo  ブラウザが自動で開きます: http://localhost:8080
echo  このウィンドウを閉じると Sage が停止します。
echo.
echo  ────────────────────────────────────────────────────────────

:: 3秒後にブラウザを開く（Flask が起動するのを待つ）
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8080"

:: Flask をこのウィンドウで実行（ログが見える）
!PY! -m backend.flask_server

:: Flask が終了した場合
echo.
echo  ────────────────────────────────────────────────────────────
echo  Sage が停止しました。
pause
