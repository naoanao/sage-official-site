@echo off
cd /d C:\Users\nao\Desktop\Sage_Final_Unified
echo Current HEAD:
git log --oneline -1
echo.
echo Pushing to GitHub...
git push origin main
echo.
echo Exit code: %errorlevel%
pause
