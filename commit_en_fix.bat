@echo off
cd /d C:\Users\nao\Desktop\Sage_Final_Unified
if exist .git\index.lock del /f .git\index.lock
cd ai-marketing-app
git add app/api/marketing/analyze/route.ts
git commit -m "fix(analyze): full English prompt for all 8 frameworks - isEn branching"
git push origin main
echo DONE
pause
