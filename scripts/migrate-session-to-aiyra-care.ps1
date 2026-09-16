# Migra ambiente local à estrutura aiyra-care (PG + .env + Open Design).
# Uso: npm run migrate:session
param([switch]$SkipOpenDesign)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$envFile = Join-Path $root '.env'

function Set-EnvValue([string]$name, [string]$value) {
  if (-not (Test-Path $envFile)) {
    New-Item -ItemType File -Path $envFile -Force | Out-Null
  }
  $lines = @()
  $found = $false
  foreach ($line in Get-Content $envFile) {
    if ($line -match "^\s*$name=") {
      $lines += "$name=$value"
      $found = $true
    } else {
      $lines += $line
    }
  }
  if (-not $found) { $lines += "$name=$value" }
  Set-Content -Path $envFile -Value $lines -Encoding utf8NoBOM
}

Write-Host 'AiyraCare — migrate session to aiyra-care' -ForegroundColor Cyan

& (Join-Path $PSScriptRoot 'migrate-pg-names-to-aiyracare.ps1')
& (Join-Path $PSScriptRoot 'create-preview-db.ps1')

Set-EnvValue 'DATABASE_URL' 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare'
Set-EnvValue 'DEPLOYMENT_TIER' 'integration'
Set-EnvValue 'OPS_WORKER_MONITOR' '0'
Set-EnvValue 'CONNECT_WORKER_EXTERNAL' '0'
Set-EnvValue 'OPS_ALERTS_INTERVAL_MS' '0'

if (-not $SkipOpenDesign) {
  $odRoot = Join-Path $env:APPDATA 'Open Design\namespaces\release-stable-win\data\design-systems'
  $old = Join-Path $odRoot 'open-health-platform-for-users-and-patients'
  $new = Join-Path $odRoot 'aiyra-care-platform-for-users-and-patients'
  if ((Test-Path $old) -and -not (Test-Path $new)) {
    Write-Host 'Renaming Open Design folder...' -ForegroundColor Cyan
    Rename-Item -Path $old -NewName 'aiyra-care-platform-for-users-and-patients'
  } elseif (Test-Path $new) {
    Write-Host 'Open Design: aiyra-care-platform already exists' -ForegroundColor Green
  } else {
    Write-Host 'Open Design: no legacy folder found (skip)' -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Done. Next:' -ForegroundColor Green
Write-Host '  npm run validate:env-tier'
Write-Host '  restart stack (scripts/up.ps1)'
