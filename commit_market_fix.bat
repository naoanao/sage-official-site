@echo off
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"

echo Removing lock files...
del /f .git\HEAD.lock 2>nul
del /f .git\index.lock 2>nul

echo.
echo Adding changed file...
git add ai-marketing-app/app/api/cron/market-scan/route.ts

echo.
echo Committing...
git commit -m "fix(cron): use Groq instead of Gemini for market-scan (Gemini free tier exhausted)"

echo.
echo Pushing...
git push origin main

echo.
echo Exit code: %ERRORLEVEL%
pause
