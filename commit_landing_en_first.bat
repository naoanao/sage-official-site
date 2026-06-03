@echo off
chcp 65001 >nul
echo === commit: Landing page English-first layout ===
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"
git add src/pages/Landing.jsx
git commit -m "fix: Landing page English-first — JP text moved to secondary subtitles"
git push origin main
echo === Done ===
pause
