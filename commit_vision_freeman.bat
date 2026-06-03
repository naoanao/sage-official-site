@echo off
chcp 65001 >nul
echo === commit: Vision Freeman revenue setup ===
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"
git add backend/scheduler/sns_daily_scheduler.py
git add SAGE_MASTER_CONTEXT.md
git commit -m "feat: soft_cta to Gumroad + Vision Freeman roadmap in context"
git push origin main
echo === Done ===
pause
