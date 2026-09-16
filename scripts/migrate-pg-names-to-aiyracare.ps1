# Renomeia PG local openhealth → aiyracare (se ainda existir).
# Uso: npm run migrate:pg-names
$ErrorActionPreference = 'Stop'
$psql = & (Join-Path $PSScriptRoot 'resolve-psql.ps1')
$pgHost = '127.0.0.1'
$pgPort = 5432
$user = 'postgres'
$password = 'postgres123'
$env:PGPASSWORD = $password

function Rename-DbIfExists([string]$from, [string]$to) {
  $existsFrom = & $psql -h $pgHost -p $pgPort -U $user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$from'"
  $existsTo = & $psql -h $pgHost -p $pgPort -U $user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$to'"
  if ($existsFrom -ne '1') {
    Write-Host "Skip $from (not found)" -ForegroundColor DarkGray
    return
  }
  if ($existsTo -eq '1') {
    Write-Host "Skip $from → $to ($to already exists)" -ForegroundColor Yellow
    return
  }
  Write-Host "Renaming $from → $to..." -ForegroundColor Cyan
  & $psql -h $pgHost -p $pgPort -U $user -d postgres -c "ALTER DATABASE $from RENAME TO $to"
}

Rename-DbIfExists 'openhealth' 'aiyracare'
Rename-DbIfExists 'openhealth_preview' 'aiyracare_preview'
Write-Host 'Done. Update DATABASE_URL in .env if needed.' -ForegroundColor Green
