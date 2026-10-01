# Register Windows logon task: start Cursor My Machines worker automatically.
# Run once: powershell -File scripts/cursor-worker-install-autostart.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$TaskName = "AiyraCare-CursorMyMachinesWorker"
$StartScript = Join-Path $PSScriptRoot "cursor-worker-start.ps1"
$Pwsh = "C:\Program Files\PowerShell\7\pwsh.exe"
if (-not (Test-Path $Pwsh)) {
  $Pwsh = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
}

$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`" -Autostart"

$action = New-ScheduledTaskAction -Execute $Pwsh -Argument $arguments -WorkingDirectory $RepoRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = "PT45S"

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 2)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Cursor Projects / My Machines worker (local execution for aiyra-care)." | Out-Null

Write-Host "Scheduled task registered: $TaskName"
Write-Host "Trigger: 45s after user logon ($env:USERNAME)"
Write-Host "Log: $env:LOCALAPPDATA\cursor-agent\worker-autostart.log"
Write-Host ""
Write-Host "Test now: Start-ScheduledTask -TaskName '$TaskName'"
