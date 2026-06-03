@echo off
cd /d "%~dp0"

echo [1/4] Removing git lock files...
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\MERGE_HEAD" 2>nul

echo [2/4] Resetting bad commit (keeping good commit 845f599)...
git reset --soft HEAD~1
if %errorlevel% neq 0 (
  echo ERROR: git reset failed.
  pause
  exit /b 1
)

echo [3/4] Verifying HEAD is now at the correct commit...
git log --oneline -3

echo [4/4] Pushing correct commit to origin...
git push origin main
if %errorlevel% neq 0 (
  echo ERROR: git push failed.
  pause
  exit /b 1
)

echo.
echo SUCCESS! Vercel will deploy automatically.
pause
