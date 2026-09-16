# Fix better-sqlite3 NODE_MODULE_VERSION mismatch on Windows after `agent update`.
# Known issue: https://forum.cursor.com/t/windows-remote-control-worker-crashes-better-sqlite3/167841

$ErrorActionPreference = "Continue"
$npmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"
if (-not (Test-Path $npmCli)) {
  Write-Warning "npm-cli.js not found; skip repair."
  exit 0
}

$agentRoot = Join-Path $env:LOCALAPPDATA "cursor-agent\versions"
if (-not (Test-Path $agentRoot)) {
  Write-Warning "cursor-agent versions dir not found."
  exit 0
}

$latest = Get-ChildItem $agentRoot -Directory |
  Where-Object { $_.Name -match '^\d{4}\.\d{1,2}\.\d{1,2}-[a-f0-9]+$' } |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $latest) {
  Write-Warning "No cursor-agent version directory found."
  exit 0
}

$node = Join-Path $latest.FullName "node.exe"
$sqliteDir = Join-Path $latest.FullName "node_modules\better-sqlite3"
if ((Test-Path $node) -and (Test-Path $sqliteDir)) {
  Write-Host "Rebuilding better-sqlite3 in $($latest.Name)..."
  Push-Location $sqliteDir
  & $node $npmCli rebuild 2>&1
  Pop-Location
}

Write-Host "Repair done. Run: agent worker debug"
