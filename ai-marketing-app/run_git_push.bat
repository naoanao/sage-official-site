@echo off
SET GIT="C:\Program Files\Git\bin\git.exe"
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"

echo === git add ===
%GIT% add ai-marketing-app/

echo === git status ===
%GIT% status --short

echo === git commit ===
%GIT% commit -m "fix: bug fixes P1-P3 + onboarding guards + custom 404 + legal pages"

echo === git push ===
%GIT% push origin main

echo.
echo === 完了! Vercelにデプロイが開始されます ===
pause
