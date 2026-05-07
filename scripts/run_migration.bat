@echo off
chcp 65001 >nul
title Sage/Growl 統合 — market_signals テーブル作成

echo.
echo ============================================================
echo  Sage/Growl 統合セットアップ
echo  market_signals テーブルを Supabase に作成します
echo ============================================================
echo.

:: スクリプトのあるディレクトリを基準に Sage_Final_Unified のルートを探す
cd /d "%~dp0\.."

:: Python の確認
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python が見つかりません。Python をインストールしてください。
    echo         https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [OK] Python が見つかりました。マイグレーションを開始します...
echo.

python scripts\migrate_market_signals.py

echo.
echo ============================================================
echo  完了しました。このウィンドウを閉じて構いません。
echo ============================================================
echo.
pause
