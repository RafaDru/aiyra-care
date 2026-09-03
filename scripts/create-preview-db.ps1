# Cria PG aiyracare_preview (Ambiente 2 local) se não existir.
$ErrorActionPreference = 'Stop'
$psql = & (Join-Path $PSScriptRoot 'resolve-psql.ps1')
$pgHost = '127.0.0.1'
$pgPort = 5432
$user = 'postgres'
$password = 'postgres123'
$db = 'aiyracare_preview'

$env:PGPASSWORD = $password
$exists = & $psql -h $pgHost -p $pgPort -U $user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'"
if ($exists -eq '1') {
  Write-Host "Database $db already exists." -ForegroundColor Green
  exit 0
}

Write-Host "Creating database $db..." -ForegroundColor Cyan
& $psql -h $pgHost -p $pgPort -U $user -d postgres -c "CREATE DATABASE $db"
Write-Host "Done." -ForegroundColor Green
