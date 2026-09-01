param(
  [switch]$Watch
)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path $PSScriptRoot -Parent
$opsConsoleDir = Join-Path $root "packages\ops-console"
$opsConsolePort = if ($env:OPS_CONSOLE_PORT) { [int]$env:OPS_CONSOLE_PORT } else { 3013 }

$envFile = Join-Path $root ".env"
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
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      if ($c.OwningProcess -gt 0) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  } catch { }
}

function Stop-OpsConsoleProcesses {
  try {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -eq 'node.exe' -and $_.CommandLine -match 'ops-console'
      } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'ops-console'
      } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  } catch { }
}

Stop-OpsConsoleProcesses
Stop-ListenerOnPort $opsConsolePort
Start-Sleep -Milliseconds 800

if (-not $env:OPS_ALERT_DASHBOARD_URL) {
  $env:OPS_ALERT_DASHBOARD_URL = "http://127.0.0.1:$opsConsolePort"
}

$tsxCmd = if ($Watch) { 'npx tsx watch src/server.ts' } else { 'npx tsx src/server.ts' }
$cmdInner = "cd /d `"$opsConsoleDir`"&&$tsxCmd"
cmd /c "start /B cmd /c `"$cmdInner`""

for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$opsConsolePort/health" -ErrorAction Stop
    if ($h.service -eq 'aiyracare-ops-console') {
      Write-Host "Ops console OK http://127.0.0.1:$opsConsolePort" -ForegroundColor Green
      exit 0
    }
  } catch { }
}

Write-Host "Ops console FAIL (port $opsConsolePort)" -ForegroundColor Red
exit 1
