@echo off
cd /d C:\Users\nao\Desktop\Sage_Final_Unified
del .git\index.lock 2>nul
del .git\HEAD.lock 2>nul
del .git\refs\heads\main.lock 2>nul
del .git\COMMIT_EDITMSG.lock 2>nul
git add ai-marketing-app/app/marketing/page.tsx
git add ai-marketing-app/app/report/page.tsx
git add ai-marketing-app/app/learn/page.tsx
git add ai-marketing-app/app/payment-success/page.tsx
git add ai-marketing-app/app/product/page.tsx
git add ai-marketing-app/components/FreeProgressBar.tsx
git commit -m "feat: English translation for all hardcoded Japanese pages"
git push
echo Done! Vercel will deploy in ~60 seconds.
pause
