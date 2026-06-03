@echo off
echo === Fixing Git Index Lock ===
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"

echo Checking for lock file...
dir /a "C:\Users\nao\Desktop\Sage_Final_Unified\.git\index*"

echo.
echo Attempting to remove index.lock with attrib first...
attrib -r -s -h "C:\Users\nao\Desktop\Sage_Final_Unified\.git\index.lock" 2>nul
del /f /q "C:\Users\nao\Desktop\Sage_Final_Unified\.git\index.lock" 2>nul

echo Trying PowerShell Remove-Item...
powershell -Command "Remove-Item -Force -Path 'C:\Users\nao\Desktop\Sage_Final_Unified\.git\index.lock' -ErrorAction SilentlyContinue; Write-Host 'PowerShell done'"

echo.
echo Verifying...
if exist "C:\Users\nao\Desktop\Sage_Final_Unified\.git\index.lock" (
    echo STILL EXISTS - trying handle close
    powershell -Command "Get-Process | Where-Object { $_.Modules -match 'index.lock' } | Stop-Process -Force" 2>nul
) else (
    echo index.lock successfully removed!
)

echo.
echo Running git status to verify...
git -C "C:\Users\nao\Desktop\Sage_Final_Unified" status

pause
