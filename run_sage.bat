@echo off
:: ============================================================
:: Sage 3.0 Auto-Launcher
:: Starts flask_server.py in the background on Windows startup.
:: ============================================================
setlocal EnableDelayedExpansion

set "SAGE_DIR=C:\Users\nao\Desktop\Sage_Final_Unified"
set "PYTHON=C:\Users\nao\AppData\Local\Programs\Python\Python311\python.exe"
set "LOGFILE=%SAGE_DIR%\logs\sage_autostart.log"

:: Move to project root
cd /d "%SAGE_DIR%"

:: Create logs dir if missing
if not exist "%SAGE_DIR%\logs" mkdir "%SAGE_DIR%\logs"

:: Timestamp
for /f "tokens=1-2 delims= " %%a in ('powershell -NoProfile -Command "Get-Date -Format \"yyyy-MM-dd HH:mm:ss\""') do set "TS=%%a %%b"

echo [%TS%] === Sage 3.0 AutoStart ============================ >> "%LOGFILE%"
echo [%TS%] SAGE_DIR : %SAGE_DIR% >> "%LOGFILE%"
echo [%TS%] PYTHON   : %PYTHON% >> "%LOGFILE%"

:: Load .env (skip comments and blank lines)
for /f "usebackq tokens=1,* delims==" %%K in ("%SAGE_DIR%\.env") do (
    set "LINE=%%K"
    if not "!LINE:~0,1!"=="#" (
        if not "%%K"=="" (
            if not "%%L"=="" (
                set "%%K=%%L"
            )
        )
    )
)

echo [%TS%] .env loaded >> "%LOGFILE%"

:: Kill any existing flask process on port 8080
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING" 2^>nul') do (
    echo [%TS%] Killing existing PID %%P on port 8080 >> "%LOGFILE%"
    taskkill /F /PID %%P >nul 2>&1
)

:: Wait a moment for port to free
timeout /t 2 /nobreak >nul

:: Remove stale PID file (let flask_server.py manage its own PID)
if exist "%SAGE_DIR%\sage_server_8080.pid" (
    del /F "%SAGE_DIR%\sage_server_8080.pid"
    echo [%TS%] Removed stale PID file >> "%LOGFILE%"
)

:: Start flask_server.py in background (hidden window), redirect output to log
echo [%TS%] Starting flask_server.py ... >> "%LOGFILE%"
start "SageFlask" /B /MIN "%PYTHON%" -m backend.flask_server >> "%LOGFILE%" 2>&1

echo [%TS%] flask_server.py launched (PID managed by flask). >> "%LOGFILE%"

:done
echo [%TS%] Launch script complete. >> "%LOGFILE%"
endlocal
