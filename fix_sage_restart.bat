@echo off
taskkill /F /IM python.exe 2>nul
taskkill /F /IM ngrok.exe 2>nul
powershell -Command "Get-WmiObject Win32_Process | Where-Object {$_.CommandLine -like '*run_sage*'} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 3 /nobreak >nul
del /f /q "%~dp0sage_server_8080.pid" 2>nul
del /f /q "%~dp0*.pid" 2>nul
timeout /t 1 /nobreak >nul
wscript //nologo "%~dp0Sage_start.vbs"
