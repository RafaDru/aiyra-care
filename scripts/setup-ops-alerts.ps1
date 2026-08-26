param(
  [switch]$RegisterScheduledTask,
  [int]$IntervalMinutes = 15,
  [switch]$SkipKeyGeneration
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $root ".env"
$cronScript = Join-Path $root "scripts\ops-alerts-cron.ps1"

function Read-EnvValue([string]$name) {
  if (-not (Test-Path $envFile)) { return $null }
  foreach ($line in Get-Content $envFile) {
    if ($line -match "^\s*$name=(.*)$") {
      return $matches[1].Trim()
    }
  }
  return $null
}

function Append-EnvLine([string]$line) {
  if (-not (Test-Path $envFile)) {
    New-Item -ItemType File -Path $envFile -Force | Out-Null
  }
  Add-Content -Path $envFile -Value $line -Encoding utf8
}

Write-Host "AiyraCare - setup ops alertas" -ForegroundColor Cyan
Write-Host "Repo: $root"

if (-not $SkipKeyGeneration) {
  $existing = Read-EnvValue "OPS_METRICS_KEY"
  if ($existing) {
    Write-Host "OPS_METRICS_KEY already set in .env (kept)." -ForegroundColor Yellow
  } else {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $key = ([BitConverter]::ToString($bytes) -replace '-', '').ToLower()
    Append-EnvLine ""
    Append-EnvLine "# Ops alertas - $(Get-Date -Format 'yyyy-MM-dd')"
    Append-EnvLine "OPS_METRICS_KEY=$key"
    Write-Host "OPS_METRICS_KEY generated and saved to .env" -ForegroundColor Green
  }
}

$webhook = Read-EnvValue "OPS_ALERT_WEBHOOK_URL"
if (-not $webhook) {
  Write-Host ""
  Write-Host "Next step: add OPS_ALERT_WEBHOOK_URL to .env" -ForegroundColor Yellow
  Write-Host "  Slack: Workspace > Apps > Incoming Webhooks"
  Write-Host "  Example: OPS_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../..."
} else {
  Write-Host "OPS_ALERT_WEBHOOK_URL is set." -ForegroundColor Green
}

Write-Host ""
Write-Host "Local smoke (API running):" -ForegroundColor Cyan
Write-Host "  npm run ops:smoke"
Write-Host "  npm run ops:metrics"
Write-Host "  npm run ops:alerts-check"

if ($RegisterScheduledTask) {
  $taskName = "AiyraCare-OpsAlerts"
  $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  }
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$cronScript`""
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration ([TimeSpan]::MaxValue)
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "AiyraCare ops alerts check" | Out-Null
  Write-Host ""
  Write-Host "Scheduled task '$taskName' every $IntervalMinutes min" -ForegroundColor Green
}

Write-Host ""
Write-Host "Production: docs/infra/OPS_ALERTS_PRODUCTION.md" -ForegroundColor Cyan
