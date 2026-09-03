param(
  [switch]$RegisterScheduledTask,
  [int]$IntervalMinutes = 15,
  [switch]$SkipKeyGeneration,
  [string]$EnvFile = ''
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $EnvFile) {
  $EnvFile = Join-Path $root ".env"
} elseif (-not [System.IO.Path]::IsPathRooted($EnvFile)) {
  $EnvFile = Join-Path $root $EnvFile
}
$cronScript = Join-Path $root "scripts\ops-alerts-cron.ps1"

function Read-EnvValue([string]$name) {
  if (-not (Test-Path $EnvFile)) { return $null }
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match "^\s*$name=(.*)$") {
      return $matches[1].Trim()
    }
  }
  return $null
}

function Append-EnvLine([string]$line) {
  if (-not (Test-Path $EnvFile)) {
    New-Item -ItemType File -Path $EnvFile -Force | Out-Null
  }
  Add-Content -Path $EnvFile -Value $line -Encoding utf8
}

function Set-EnvValue([string]$name, [string]$value) {
  if (-not (Test-Path $EnvFile)) {
    New-Item -ItemType File -Path $EnvFile -Force | Out-Null
  }
  $lines = @()
  $found = $false
  foreach ($line in Get-Content $EnvFile) {
    if ($line -match "^\s*$name=") {
      $lines += "$name=$value"
      $found = $true
    } else {
      $lines += $line
    }
  }
  if (-not $found) { $lines += "$name=$value" }
  Set-Content -Path $EnvFile -Value $lines -Encoding utf8
}

Write-Host "AiyraCare - setup ops alertas" -ForegroundColor Cyan
Write-Host "Repo: $root"
Write-Host "Env:  $EnvFile" -ForegroundColor DarkGray

if (-not $SkipKeyGeneration) {
  $existing = Read-EnvValue "OPS_METRICS_KEY"
  if ($existing) {
    Write-Host "OPS_METRICS_KEY already set (kept)." -ForegroundColor Yellow
  } else {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $key = ([BitConverter]::ToString($bytes) -replace '-', '').ToLower()
    Append-EnvLine ""
    Append-EnvLine "# Ops alertas - $(Get-Date -Format 'yyyy-MM-dd')"
    Append-EnvLine "OPS_METRICS_KEY=$key"
    Write-Host "OPS_METRICS_KEY generated and saved" -ForegroundColor Green
  }
}

$webhook = Read-EnvValue "OPS_ALERT_WEBHOOK_URL"
if (-not $webhook) {
  $defaultWebhook = if ($EnvFile -match '\.preview$') { 'http://127.0.0.1:3022/ops-alert' } else { 'http://127.0.0.1:3012/ops-alert' }
  Set-EnvValue 'OPS_ALERT_WEBHOOK_URL' $defaultWebhook
  Write-Host "OPS_ALERT_WEBHOOK_URL set to $defaultWebhook" -ForegroundColor Green
} else {
  Write-Host "OPS_ALERT_WEBHOOK_URL is set." -ForegroundColor Green
}

$dashboard = Read-EnvValue "OPS_ALERT_DASHBOARD_URL"
if (-not $dashboard) {
  $defaultDash = if ($EnvFile -match '\.preview$') { 'http://127.0.0.1:3023' } else { 'http://127.0.0.1:3013' }
  Set-EnvValue 'OPS_ALERT_DASHBOARD_URL' $defaultDash
  Write-Host "OPS_ALERT_DASHBOARD_URL set to $defaultDash" -ForegroundColor Green
} else {
  Write-Host "OPS_ALERT_DASHBOARD_URL is set." -ForegroundColor Green
}

$tier = Read-EnvValue "DEPLOYMENT_TIER"
if (-not $tier) {
  $defaultTier = if ($EnvFile -match '\.preview$') { 'preview' } else { 'integration' }
  Set-EnvValue 'DEPLOYMENT_TIER' $defaultTier
  Write-Host "DEPLOYMENT_TIER=$defaultTier" -ForegroundColor Green
}

$workerMon = Read-EnvValue "OPS_WORKER_MONITOR"
if (-not $workerMon) {
  $defaultMon = if ($EnvFile -match '\.preview$') { '1' } else { '0' }
  Set-EnvValue 'OPS_WORKER_MONITOR' $defaultMon
  Write-Host "OPS_WORKER_MONITOR=$defaultMon" -ForegroundColor Green
}

Write-Host ""
Write-Host "Local notifier (Windows tray):" -ForegroundColor Cyan
Write-Host "  npm run ops:notifier:up"
Write-Host ""
Write-Host "Observability console:" -ForegroundColor Cyan
Write-Host "  npm run ops:console:up"
Write-Host ""
Write-Host "Smoke:" -ForegroundColor Cyan
Write-Host "  npm run ops:smoke"
Write-Host "  npm run validate:env-tier"
Write-Host "  npm run validate:ops-dual-keys"

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
