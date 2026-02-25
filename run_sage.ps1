# ============================================================
# Sage 3.0 Auto-Launcher (PowerShell)
# Runs flask_server.py hidden at Windows startup/login.
# On each start:
#   1. Kill stale processes / PID file
#   2. Start Flask backend (port 8080)
#   3. Start Cloudflare Tunnel (trycloudflare.com)
#   4. Wait for tunnel URL, update src/config/backendUrl.js
#   5. git commit + push → triggers Cloudflare Pages auto-rebuild
# ============================================================

$SageDir   = "C:\Users\nao\Desktop\Sage_Final_Unified"
$Python    = "C:\Users\nao\AppData\Local\Programs\Python\Python311\python.exe"
$CfExe     = "C:\Users\nao\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe"
$LogFile   = "$SageDir\logs\sage_autostart.log"
$CfLog     = "$SageDir\logs\cloudflared.log"
$BackendFn = "$SageDir\functions\_backend.js"

Set-Location $SageDir

# ── Ensure logs directory ─────────────────────────────────────────────────
if (-not (Test-Path "$SageDir\logs")) {
    New-Item -ItemType Directory -Path "$SageDir\logs" | Out-Null
}

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $LogFile "[$ts] === Sage 3.0 AutoStart ================================"

# ── Load .env into process environment ───────────────────────────────────
Get-Content "$SageDir\.env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        $key   = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}
Add-Content $LogFile "[$ts] .env loaded"

# ── Kill any process already listening on port 8080 ───────────────────────
$existing = netstat -ano | Select-String ":8080 " | Select-String "LISTENING"
foreach ($line in $existing) {
    $pid8080 = ($line -split '\s+')[-1]
    if ($pid8080 -match '^\d+$') {
        Stop-Process -Id $pid8080 -Force -ErrorAction SilentlyContinue
        Add-Content $LogFile "[$ts] Killed PID $pid8080 (was on :8080)"
    }
}

Start-Sleep -Seconds 2

# ── Remove stale PID file ─────────────────────────────────────────────────
$pidFile = "$SageDir\sage_server_8080.pid"
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
    Add-Content $LogFile "[$ts] Removed stale PID file"
}

# ── Start Flask backend (hidden) ──────────────────────────────────────────
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

# ── Start Cloudflare Tunnel ───────────────────────────────────────────────
if (-not (Test-Path $CfExe)) {
    Add-Content $LogFile "[$ts] WARNING: cloudflared not found at $CfExe"
    exit 0
}

# Kill existing cloudflared processes before starting new one
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Clear old log so URL search is clean
if (Test-Path $CfLog) { Remove-Item $CfLog -Force -ErrorAction SilentlyContinue }

Add-Content $LogFile "[$ts] Launching Cloudflare Tunnel..."
Start-Process -FilePath $CfExe `
    -ArgumentList "tunnel","--url","http://localhost:8080","--logfile",$CfLog `
    -WindowStyle Hidden

# ── Wait for tunnel URL (up to 30s) ──────────────────────────────────────
$tunnelUrl = ""
$waited = 0
while ($waited -lt 30) {
    Start-Sleep -Seconds 2
    $waited += 2
    if (Test-Path $CfLog) {
        $match = Select-String "trycloudflare.com" $CfLog -ErrorAction SilentlyContinue | Select-Object -Last 1
        if ($match) {
            $found = [regex]::Match($match.Line, "https://[a-z0-9\-]+\.trycloudflare\.com").Value
            if ($found) {
                $tunnelUrl = $found
                break
            }
        }
    }
}

if (-not $tunnelUrl) {
    Add-Content $LogFile "[$ts] WARNING: Tunnel URL not detected after 30s — using previous URL."
    exit 0
}

Add-Content $LogFile "[$ts] Tunnel URL: $tunnelUrl"

# ── Update .env (local reference) ────────────────────────────────────────
$envContent = Get-Content "$SageDir\.env" -Raw
if ($envContent -match "VITE_BACKEND_URL=") {
    $envContent = $envContent -replace "VITE_BACKEND_URL=.*", "VITE_BACKEND_URL=$tunnelUrl"
} else {
    $envContent += "`nVITE_BACKEND_URL=$tunnelUrl"
}
Set-Content "$SageDir\.env" $envContent -NoNewline
Add-Content $LogFile "[$ts] .env updated with VITE_BACKEND_URL=$tunnelUrl"

# ── Update functions/_backend.js (Pages Function fallback URL) ───────────
$jsContent = "// Auto-updated by run_sage.ps1 on $ts`nexport const BACKEND_URL = `"$tunnelUrl`";"
Set-Content $BackendFn $jsContent -Encoding UTF8 -NoNewline
Add-Content $LogFile "[$ts] functions/_backend.js updated"

# ── Git commit + push → triggers Cloudflare Pages rebuild ────────────────
$git = "C:\Program Files\Git\bin\git.exe"
if (-not (Test-Path $git)) { $git = "git" }

try {
    & $git -C $SageDir add "functions/_backend.js" 2>&1 | Out-Null
    & $git -C $SageDir commit -m "chore: update tunnel URL [$tunnelUrl]" 2>&1 | Out-Null
    & $git -C $SageDir push origin main 2>&1 | Out-Null
    Add-Content $LogFile "[$ts] git push OK — Cloudflare Pages will rebuild."
} catch {
    Add-Content $LogFile "[$ts] WARNING: git push failed: $_"
}

Add-Content $LogFile "[$ts] === Sage 3.0 startup complete. Tunnel: $tunnelUrl ==="
