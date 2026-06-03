@echo off
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"
git add "ai-marketing-app/app/dashboard/page.tsx"
git add "ai-marketing-app/components/AdBoostCard.tsx"
git commit -m "fix: dashboard conflict resolved"
git push origin main
echo Done!
pause
