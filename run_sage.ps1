# ============================================================
# Sage 3.0 Auto-Launcher (PowerShell)
# Runs flask_server.py hidden at Windows startup/login.
# ============================================================

$SageDir = "C:\Users\nao\Desktop\Sage_Final_Unified"
$Python  = "C:\Users\nao\AppData\Local\Programs\Python\Python311\python.exe"
$LogFile = "$SageDir\logs\sage_autostart.log"

Set-Location $SageDir

# Ensure logs directory exists
if (-not (Test-Path "$SageDir\logs")) {
    New-Item -ItemType Directory -Path "$SageDir\logs" | Out-Null
}

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $LogFile "[$ts] === Sage 3.0 AutoStart (PS1) ==========================="

# Load .env into current process environment
Get-Content "$SageDir\.env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        $key   = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}
Add-Content $LogFile "[$ts] .env loaded"

# Kill any process already listening on port 8080
$existing = netstat -ano | Select-String ":8080 " | Select-String "LISTENING"
foreach ($line in $existing) {
    $pid8080 = ($line -split '\s+')[-1]
    if ($pid8080 -match '^\d+$') {
        Stop-Process -Id $pid8080 -Force -ErrorAction SilentlyContinue
        Add-Content $LogFile "[$ts] Killed PID $pid8080 (was on :8080)"
    }
}

Start-Sleep -Seconds 2

# Remove stale PID file so flask doesn't think it's already running
$pidFile = "$SageDir\sage_server_8080.pid"
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
    Add-Content $LogFile "[$ts] Removed stale PID file"
}

# Start flask_server.py in a hidden process
# NOTE: Let flask_server.py write its own PID file — do NOT write it here.
Add-Content $LogFile "[$ts] Launching flask_server.py ..."
$proc = Start-Process `
    -FilePath $Python `
    -ArgumentList "-m", "backend.flask_server" `
    -WorkingDirectory $SageDir `
    -RedirectStandardOutput "$SageDir\logs\flask_stdout.log" `
    -RedirectStandardError  "$SageDir\logs\flask_stderr.log" `
    -WindowStyle Hidden `
    -PassThru

Add-Content $LogFile "[$ts] flask_server.py started. PID: $($proc.Id)"
