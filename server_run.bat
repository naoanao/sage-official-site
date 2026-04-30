@echo off
cd /d "%~dp0"
title LearnAI Server

echo ============================================
echo  LearnAI サーバー (Notion・SambaNova用)
echo  http://localhost:8000/LearnAI.html
echo  終了: Ctrl+C
echo ============================================
echo.

py server.py
if %errorlevel% neq 0 python server.py
if %errorlevel% neq 0 python3 server.py

echo.
echo サーバーが停止しました。
pause
