@echo off
cd /d "C:\Users\nao\Desktop\Sage_Final_Unified"

echo Checking git...
where git > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo git not found in PATH, trying common locations...
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set GIT_CMD="C:\Program Files\Git\cmd\git.exe"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set GIT_CMD="C:\Program Files (x86)\Git\cmd\git.exe"
    ) else (
        echo ERROR: git.exe not found!
        pause
        exit /b 1
    )
) else (
    set GIT_CMD=git
)

echo Git found: %GIT_CMD%
echo.
echo Current status:
%GIT_CMD% log --oneline -3
echo.
echo Pushing to origin main...
%GIT_CMD% push origin main
echo.
echo Exit code: %ERRORLEVEL%
pause
