param()

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path $PSScriptRoot -Parent
$notifierPort = if ($env:OPS_LOCAL_NOTIFIER_PORT) { [int]$env:OPS_LOCAL_NOTIFIER_PORT } else { 3012 }
$trayScript = Join-Path $PSScriptRoot 'ops-local-notifier-tray.ps1'

$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      if ($k -and $v) { Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue }
    }
  }
}

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

function Stop-TrayProcesses {
  try {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'ops-local-notifier-tray\.ps1'
      } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  } catch { }
}

Stop-TrayProcesses
Stop-ListenerOnPort $notifierPort
Start-Sleep -Seconds 2

if (-not $env:OPS_ALERT_WEBHOOK_URL) {
  $env:OPS_ALERT_WEBHOOK_URL = "http://127.0.0.1:$notifierPort/ops-alert"
}

Start-Process powershell -ArgumentList @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $trayScript
) -WindowStyle Hidden

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep 1
  try {
    $code = (Invoke-WebRequest -Uri "http://127.0.0.1:$notifierPort/health" -UseBasicParsing -TimeoutSec 2).StatusCode
    if ($code -eq 200) {
      Write-Host "Ops notifier OK http://127.0.0.1:$notifierPort/ops-alert" -ForegroundColor Green
      exit 0
    }
  } catch { }
}

Write-Host "Ops notifier FAIL (port $notifierPort)" -ForegroundColor Red
exit 1
