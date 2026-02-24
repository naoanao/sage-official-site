$cf  = "C:\Users\nao\AppData\Local\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe"
$log = "C:\Users\nao\Desktop\Sage_Final_Unified\logs\cloudflared.log"

# Stop any existing cloudflared
Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

# Start tunnel
Start-Process -FilePath $cf -ArgumentList "tunnel","--url","http://localhost:8080","--logfile",$log -WindowStyle Hidden
Write-Host "cloudflared started. Waiting 12s for URL..."
Start-Sleep 12

if (Test-Path $log) {
    $match = Select-String "trycloudflare.com" $log | Select-Object -Last 1
    if ($match) {
        $url = [regex]::Match($match.Line, "https://[a-z0-9\-]+\.trycloudflare\.com").Value
        Write-Host "TUNNEL_URL=$url"
        # Append to .env
        $envFile = "C:\Users\nao\Desktop\Sage_Final_Unified\.env"
        $content = Get-Content $envFile -Raw
        if ($content -match "VITE_BACKEND_URL=") {
            $content = $content -replace "VITE_BACKEND_URL=.*", "VITE_BACKEND_URL=$url"
        } else {
            $content += "`nVITE_BACKEND_URL=$url"
        }
        Set-Content $envFile $content -NoNewline
        Write-Host ".env updated with VITE_BACKEND_URL=$url"
    } else {
        Write-Host "URL not found in log yet. Log tail:"
        Get-Content $log -Tail 5
    }
} else {
    Write-Host "Log file not created."
}
