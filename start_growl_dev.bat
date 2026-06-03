@echo off
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified\ai-marketing-app"
echo === Starting Growl Dev Server on port 3000 ===
start "Growl Dev Server" cmd /k "npm run dev"
echo Dev server starting in background window...
timeout /t 3
