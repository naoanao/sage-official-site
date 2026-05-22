@echo off
cd /d "%~dp0"
echo 前のサーバーを停止中...
taskkill /F /IM node.exe >nul 2>&1
if exist ".next" rmdir /s /q ".next" >nul 2>&1
echo AIマーケアプリを起動中...
start "AIマーケアプリ" cmd /k "npm run dev"
timeout /t 20 /nobreak >nul
start "" http://localhost:3000
