@echo off
cd /d %~dp0
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
del /f .git\refs\heads\main.lock 2>nul
git add backend/integrations/youtube_integration.py
git add backend/scheduler/instagram_daily_scheduler.py
git add get_youtube_token.py
git commit -m "feat: YouTube Shorts auto-post - upload_short() + daily scheduler JST18:00"
git push origin main
pause
