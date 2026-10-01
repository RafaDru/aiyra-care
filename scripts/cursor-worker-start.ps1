# Start Cursor My Machines worker for Projects / Cloud Agents (local execution).
# Docs: https://cursor.com/docs/cloud-agent/my-machines

param(
  [switch]$Autostart
)

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$WorkerName = if ($env:CURSOR_WORKER_NAME) { $env:CURSOR_WORKER_NAME } else { "NotebookRafael" }
$LogFile = Join-Path $env:LOCALAPPDATA "cursor-agent\worker-autostart.log"
$LockFile = Join-Path $env:LOCALAPPDATA "cursor-agent\worker.lock"

function Write-WorkerLog {
  param([string]$Message)
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  if ($Autostart) {
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
  } else {
    Write-Host $line
  }
}

function Test-WorkerVisible {
  try {
    $debug = agent worker debug 2>&1 | Out-String
    if ($debug -match 'Non-privacy\s+0 worker') { return $false }
    return $debug -match 'Non-privacy\s+[1-9]\d*\s+worker'
  } catch {
    return $false
  }
}

function Clear-StaleWorkerLock {
  if ((Test-Path $LockFile) -and -not (Test-WorkerVisible)) {
    Write-WorkerLog "Removing stale worker.lock (no worker visible in cloud)."
    Remove-Item -Force $LockFile -ErrorAction SilentlyContinue
  }
}

if (-not (Get-Command agent -ErrorAction SilentlyContinue)) {
  Write-WorkerLog "Cursor CLI not found. Install: irm 'https://cursor.com/install?win32=true' | iex"
  exit 1
}

Clear-StaleWorkerLock

if (Test-WorkerVisible) {
  Write-WorkerLog "Worker already visible in cloud; skip start."
  exit 0
}

function Start-WorkerOnce {
  Write-WorkerLog "Updating Cursor CLI..."
  agent update 2>&1 | Out-Null

  $repairScript = Join-Path $PSScriptRoot "cursor-worker-repair.ps1"
  if (Test-Path $repairScript) {
    & $repairScript *> $null
  }

  Set-Location $RepoRoot
  Write-WorkerLog "Starting worker '$WorkerName' at $RepoRoot"

  $agentArgs = @("worker", "start", "--name", $WorkerName)
  if (-not $Autostart) {
    $agentArgs += "--verbose"
    Write-Host "Keep this window open. Select '$WorkerName' under My Machines in Projects or cursor.com/agents."
  }

  & agent @agentArgs
  return $LASTEXITCODE
}

if (-not $Autostart) {
  exit (Start-WorkerOnce)
}

while ($true) {
  $code = Start-WorkerOnce
  Write-WorkerLog "Worker exited (code=$code). Restarting in 30s..."
  Clear-StaleWorkerLock
  Start-Sleep -Seconds 30
}
