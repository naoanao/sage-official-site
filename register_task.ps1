$action = New-ScheduledTaskAction `
    -Execute 'C:\Windows\System32\cmd.exe' `
    -Argument '/c "C:\Users\nao\Desktop\Sage_Final_Unified\run_sage.bat"' `
    -WorkingDirectory 'C:\Users\nao\Desktop\Sage_Final_Unified'

$trigger = New-ScheduledTaskTrigger -AtLogOn -User 'nao'
$trigger.Delay = 'PT30S'

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable `
    -DontStopOnIdleEnd

Register-ScheduledTask `
    -TaskName 'SageAutoStart' `
    -Description 'Sage 3.0 Flask server auto-start at login (30s delay)' `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Force | Select-Object TaskName, State

Write-Host "Done."
