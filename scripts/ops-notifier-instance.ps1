# Single-instance helpers for ops-local-notifier-tray.ps1 (one tray per port).

function Get-OpsNotifierPidFile {
  param(
    [string]$Root,
    [int]$Port
  )
  $dir = Join-Path $Root '.run'
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  Join-Path $dir "ops-notifier-$Port.pid"
}

function Get-OpsNotifierMutexName {
  param([int]$Port)
  "Global\AiyraCare.OpsNotifier.$Port"
}

function Test-OpsNotifierHealthy {
  param([int]$Port)
  try {
    $code = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 2).StatusCode
    return $code -eq 200
  } catch {
    return $false
  }
}

function Get-OpsNotifierTrayProcesses {
  Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*ops-local-notifier-tray.ps1*' }
}

function Test-ProcessListensOnPort {
  param(
    [int]$ProcessId,
    [int]$Port
  )
  try {
    $owns = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Where-Object { $_.OwningProcess -eq $ProcessId })
    return $owns.Count -gt 0
  } catch {
    return $false
  }
}

function Test-OpsNotifierTrayProcessForPort {
  param(
    [int]$ProcessId,
    [string]$CommandLine,
    [int]$Port
  )
  if ($CommandLine -match '-NotifierPort\s+(\d+)') {
    return [int]$matches[1] -eq $Port
  }
  if (Test-ProcessListensOnPort -ProcessId $ProcessId -Port $Port) {
    return $true
  }
  # Legacy orphan: tray icon without bound notifier port — safe to remove on next start.
  $on3012 = Test-ProcessListensOnPort -ProcessId $ProcessId -Port 3012
  $on3022 = Test-ProcessListensOnPort -ProcessId $ProcessId -Port 3022
  return -not $on3012 -and -not $on3022
}

function Get-OpsNotifierTrayProcessesForPort {
  param([int]$Port)
  Get-OpsNotifierTrayProcesses | Where-Object {
    Test-OpsNotifierTrayProcessForPort -ProcessId $_.ProcessId -CommandLine $_.CommandLine -Port $Port
  }
}

function Stop-OpsNotifierInstance {
  param(
    [string]$Root,
    [int]$Port
  )

  $pidFile = Get-OpsNotifierPidFile -Root $Root -Port $Port
  if (Test-Path $pidFile) {
    $raw = (Get-Content $pidFile -Raw -ErrorAction SilentlyContinue)
    if ($raw) {
      $oldPid = [int]$raw.Trim()
      if ($oldPid -gt 0) {
        Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
      }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }

  try {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      ForEach-Object {
        if ($_.OwningProcess -gt 0) {
          Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
      }
  } catch { }

  foreach ($proc in (Get-OpsNotifierTrayProcessesForPort -Port $Port)) {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
  }

  Start-Sleep -Milliseconds 500
}
