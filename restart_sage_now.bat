@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "run_sage.ps1"
