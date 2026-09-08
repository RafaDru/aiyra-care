param([switch]$Preview)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path $PSScriptRoot -Parent
$importDotenv = Join-Path $PSScriptRoot 'import-dotenv.ps1'
$trayScript = Join-Path $PSScriptRoot 'ops-local-notifier-tray.ps1'

& $importDotenv -Path (Join-Path $root '.env')
if ($Preview) {
  & $importDotenv -Path (Join-Path $root '.env.preview') -Override
  if (-not $env:OPS_LOCAL_NOTIFIER_PORT) { $env:OPS_LOCAL_NOTIFIER_PORT = '3022' }
  if (-not $env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT = '3023' }
  if (-not $env:OPS_ALERT_WEBHOOK_URL) { $env:OPS_ALERT_WEBHOOK_URL = 'http://127.0.0.1:3022/ops-alert' }
  if (-not $env:OPS_ALERT_DASHBOARD_URL) { $env:OPS_ALERT_DASHBOARD_URL = 'http://127.0.0.1:3023' }
  $tierLabel = 'Staging'
} else {
  if (-not $env:OPS_LOCAL_NOTIFIER_PORT) { $env:OPS_LOCAL_NOTIFIER_PORT = '3012' }
  if (-not $env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT = '3013' }
  if (-not $env:OPS_ALERT_WEBHOOK_URL) { $env:OPS_ALERT_WEBHOOK_URL = 'http://127.0.0.1:3012/ops-alert' }
  $tierLabel = 'Dev'
}

$notifierPort = [int]$env:OPS_LOCAL_NOTIFIER_PORT

function Stop-ListenerOnPort {
  param([int]$Port)
  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      ForEach-Object {
        if ($_.OwningProcess -gt 0) {
          Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
      }
  } catch { }
}

Stop-ListenerOnPort $notifierPort
Start-Sleep -Seconds 1

$env:AIYRA_NOTIFIER_TIER = $tierLabel
$env:OPS_NOTIFIER_LOG_SUFFIX = if ($Preview) { '-preview' } else { '' }

Start-Process powershell -ArgumentList @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $trayScript
) -WindowStyle Hidden

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep 1
  try {
    $code = (Invoke-WebRequest -Uri "http://127.0.0.1:$notifierPort/health" -UseBasicParsing -TimeoutSec 2).StatusCode
    if ($code -eq 200) {
      Write-Host "Ops notifier $tierLabel OK http://127.0.0.1:$notifierPort/ops-alert" -ForegroundColor Green
      exit 0
    }
  } catch { }
}

Write-Host "Ops notifier $tierLabel FAIL (port $notifierPort)" -ForegroundColor Red
exit 1
