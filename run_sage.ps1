# ============================================================
# Sage 3.0 Auto-Launcher (PowerShell) - ngrok Edition
# Runs flask_server.py hidden at Windows startup/login.
# On each start:
#   1. Kill stale processes / PID file
#   2. Start Flask backend (port 8080)
#   3. Start ngrok Tunnel (Static Domain)
#   4. Update .env and functions/_backend.js
#   5. git commit + push (first time/if needed)
# ============================================================

$SageDir   = "C:\Users\nao\Desktop\Sage_Final_Unified"
$Python    = "C:\Users\nao\AppData\Local\Programs\Python\Python311\python.exe"
$NgrokExe  = "ngrok"
$LogFile   = "$SageDir\logs\sage_autostart.log"
$NgrokLog  = "$SageDir\logs\ngrok.log"
$BackendFn = "$SageDir\functions\_backend.js"
$StaticDomain = "tetchy-byssal-katherin.ngrok-free.dev"
$TunnelUrl = "https://$StaticDomain"

Set-Location $SageDir

# ── Ensure logs directory ─────────────────────────────────────────────────
if (-not (Test-Path "$SageDir\logs")) {
    New-Item -ItemType Directory -Path "$SageDir\logs" | Out-Null
}

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $LogFile "[$ts] === Sage 3.0 AutoStart (ngrok) ================================"

# ── Load .env ────────────────────────────────────────────────────────────
Get-Content "$SageDir\.env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        $key   = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}
Add-Content $LogFile "[$ts] .env loaded"

# ── Kill stale processes ──────────────────────────────────────────────────
# Port 8080 (Flask)
$existing8080 = netstat -ano | Select-String ":8080 " | Select-String "LISTENING"
foreach ($line in $existing8080) {
    $pid8080 = ($line -split '\s+')[-1]
    if ($pid8080 -match '^\d+$') {
        Stop-Process -Id $pid8080 -Force -ErrorAction SilentlyContinue
        Add-Content $LogFile "[$ts] Killed PID $pid8080 (was on :8080)"
    }
}

# ngrok
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# ── Start Flask backend (hidden) ──────────────────────────────────────────
$pidFile = "$SageDir\sage_server_8080.pid"
if (Test-Path $pidFile) { Remove-Item $pidFile -Force }

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

# ── Start ngrok Tunnel ────────────────────────────────────────────────────
Add-Content $LogFile "[$ts] Launching ngrok Tunnel with domain: $StaticDomain"
if (Test-Path $NgrokLog) { Remove-Item $NgrokLog -Force -ErrorAction SilentlyContinue }

Start-Process -FilePath $NgrokExe `
    -ArgumentList "http", "8080", "--domain=$StaticDomain", "--log=$NgrokLog" `
    -WindowStyle Hidden

Start-Sleep -Seconds 3

# ── Update configurations ────────────────────────────────────────────────
# Update .env
$envContent = Get-Content "$SageDir\.env" -Raw
if ($envContent -match "VITE_BACKEND_URL=") {
    $envContent = $envContent -replace "VITE_BACKEND_URL=.*", "VITE_BACKEND_URL=$TunnelUrl"
} else {
    $envContent += "`nVITE_BACKEND_URL=$TunnelUrl"
}
Set-Content "$SageDir\.env" $envContent -NoNewline
Add-Content $LogFile "[$ts] .env updated with VITE_BACKEND_URL=$TunnelUrl"

# Update functions/_backend.js
$jsContent = "// Auto-updated by run_sage.ps1 (ngrok) on $ts`nexport const BACKEND_URL = `"$TunnelUrl`";"
Set-Content $BackendFn $jsContent -Encoding UTF8 -NoNewline
Add-Content $LogFile "[$ts] functions/_backend.js updated"

# ── Update CF Pages env via API ──────────────────────────────────────────
$cfToken     = [System.Environment]::GetEnvironmentVariable("CF_API_TOKEN",     'Process')
$cfAccountId = [System.Environment]::GetEnvironmentVariable("CF_ACCOUNT_ID",    'Process')
$cfProject   = "sage-official-site"

if ($cfToken -and $cfAccountId) {
    try {
        $apiUrl = "https://api.cloudflare.com/client/v4/accounts/$cfAccountId/pages/projects/$cfProject"
        $body = @{
            deployment_configs = @{
                production = @{ env_vars = @{ BACKEND_URL = @{ value = $TunnelUrl } } }
            }
        } | ConvertTo-Json -Depth 5

        $resp = Invoke-RestMethod -Uri $apiUrl -Method PATCH `
            -Headers @{ "Authorization" = "Bearer $cfToken"; "Content-Type" = "application/json" } `
            -Body $body -ErrorAction Stop
        
        if ($resp.success) {
            Add-Content $LogFile "[$ts] CF Pages BACKEND_URL updated via API."
        }
    } catch {
        Add-Content $LogFile "[$ts] CF API update failed: $_"
    }
}

# ── Git Push (only if explicitly needed or first migration) ──────────────
# We'll do one final push to ensure the frontend code is synced with ngrok URL
$git = "git"
try {
    & $git -C $SageDir add "functions/_backend.js" 2>&1 | Out-Null
    & $git -C $SageDir commit -m "feat: permanent migration to ngrok static domain" 2>&1 | Out-Null
    & $git -C $SageDir push origin main 2>&1 | Out-Null
    Add-Content $LogFile "[$ts] git push OK."
} catch {
    Add-Content $LogFile "[$ts] git push skipped or failed (likely no changes)."
}

Add-Content $LogFile "[$ts] === Sage 3.0 startup complete. Tunnel: $TunnelUrl ==="

