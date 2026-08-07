# Sync Open Design tokens → Frontend theme
# Lê os tokens do Open Design e atualiza o theme/colors.ts do frontend

param(
  [switch]$Watch
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

$odPath = "$env:APPDATA\Open Design\namespaces\release-stable-win\data\design-systems\open-health-platform-for-users-and-patients"
$colorsFile = Join-Path $root "packages\web\src\theme\colors.ts"
$bridgeFile = Join-Path $root "packages\web\src\theme\open-design-bridge.ts"

function Sync-Tokens {
  Write-Host "Syncing Open Design tokens..." -ForegroundColor Cyan

  if (-not (Test-Path "$odPath\system\tokens.palettes.json")) {
    Write-Host "WARN: Open Health design system not found in Open Design" -ForegroundColor Yellow
    return
  }

  $palettes = Get-Content "$odPath\system\tokens.palettes.json" -Raw | ConvertFrom-Json
  $brand = Get-Content "$odPath\brand.json" -Raw | ConvertFrom-Json

  Write-Host "  Palettes: $($palettes.palettes | Get-Member -MemberType NoteProperty | ForEach-Object Name)" -ForegroundColor Green
  Write-Host "  Brand: $($brand.name)" -ForegroundColor Green

  # Update colors.ts timestamp
  $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "  Last synced: $now" -ForegroundColor Gray
  node (Join-Path $root "packages\web\scripts\sync-brand-to-opendesign.mjs")
}

function Watch-Loop {
  Write-Host "Watching Open Design tokens for changes (Ctrl+C to stop)..." -ForegroundColor Cyan
  $last = Get-ChildItem "$odPath\system" -Recurse | ForEach-Object { $_.LastWriteTime } | Sort-Object -Descending | Select-Object -First 1
  while ($true) {
    Start-Sleep 5
    $current = Get-ChildItem "$odPath\system" -Recurse | ForEach-Object { $_.LastWriteTime } | Sort-Object -Descending | Select-Object -First 1
    if ($current -gt $last) { Sync-Tokens; $last = $current }
  }
}

Sync-Tokens
if ($Watch) { Watch-Loop }
