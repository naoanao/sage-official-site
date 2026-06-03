@echo off
cd /d "%~dp0"

if exist "%~dp0LearnAIstart.vbs" (
  wscript //nologo "%~dp0LearnAIstart.vbs"
  exit /b
)

if exist "%~dp0LearnAI_start.vbs" (
  wscript //nologo "%~dp0LearnAI_start.vbs"
  exit /b
)

if exist "%~dp0LearnAI_start-4.vbs" (
  wscript //nologo "%~dp0LearnAI_start-4.vbs"
  exit /b
)

echo [ERROR] VBS launcher not found.
pause
