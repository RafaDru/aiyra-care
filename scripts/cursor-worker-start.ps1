# Start Cursor My Machines worker for Projects / Cloud Agents (local execution).
# Docs: https://cursor.com/docs/cloud-agent/my-machines

param(
  [switch]$Autostart
)

$ErrorActionPreference = "Stop"
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

function Test-WorkerRunning {
  if (-not (Test-Path $LockFile)) { return $false }
  try {
    $debug = agent worker debug 2>&1 | Out-String
    return $debug -match 'Visibility[\s\S]*\d+ worker'
  } catch {
    return $false
  }
}

if (-not (Get-Command agent -ErrorAction SilentlyContinue)) {
  Write-WorkerLog "Cursor CLI not found. Install: irm 'https://cursor.com/install?win32=true' | iex"
  exit 1
}

if (Test-WorkerRunning) {
  Write-WorkerLog "Worker already running; skip start."
  exit 0
}

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
