# Ambiente 2 — Preview estável (local): PG dedicado + portas separadas.
# Integração continua em 3010/5173 (aiyracare). Preview em 3020/5174 (aiyracare_preview).
param([switch]$SkipSeed)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')

Write-Host 'AiyraCare — Preview local (Ambiente 2)' -ForegroundColor Cyan
Write-Host 'Integração (Ambiente 1) pode rodar em paralelo nas portas 3010/5173.' -ForegroundColor DarkGray

& (Join-Path $PSScriptRoot 'create-preview-db.ps1')

Write-Host 'Applying migrations on aiyracare_preview...' -ForegroundColor Cyan
$env:DATABASE_URL = 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview'
Push-Location (Join-Path $root 'packages\api')
node scripts/apply-all-migrations.mjs --continue-on-error
if ($LASTEXITCODE -ne 0) {
  Write-Warning 'Some migrations failed — check output above'
}
Pop-Location

if (-not $SkipSeed) {
  Write-Host 'Seeding preview PG (staging-refresh)...' -ForegroundColor Cyan
  $env:DATABASE_URL = 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview'
  Push-Location (Join-Path $root 'packages\api')
  npm run seed:staging-refresh
  Pop-Location
}

& (Join-Path $PSScriptRoot 'up.ps1') -Preview
