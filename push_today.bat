@echo off
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"
if errorlevel 1 (
    echo ERROR: Could not cd to Sage_Final_Unified
    pause
    exit /b 1
)
echo === git push ===
git log --oneline origin/main..HEAD
echo.
echo Pushing to origin/main ...
git push origin main
echo.
echo === Done ===
pause
