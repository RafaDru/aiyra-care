# Legado: migração Documents\Filhos → workspace\aiyra-care (concluída 2026-09-03).
# Mantido para referência; o destino canônico já é %USERPROFILE%\workspace\aiyra-care.
param(
  [switch]$CopyOnly,
  [string]$Source = "$env:USERPROFILE\workspace\_archive\Filhos-2026-09-03",
  [string]$Target = "$env:USERPROFILE\workspace\aiyra-care"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $Source)) {
  Write-Error "Origem não encontrada: $Source"
}

New-Item -ItemType Directory -Path (Split-Path $Target -Parent) -Force | Out-Null

Write-Host "Robocopy (espelho, sem node_modules) -> $Target" -ForegroundColor Cyan
robocopy $Source $Target /MIR /XD node_modules test-results .turbo /NFL /NDL /NJH /NJS /nc /ns /np
if ($LASTEXITCODE -ge 8) { throw "robocopy falhou ($LASTEXITCODE)" }
Write-Host "Copia concluída. Rode npm install na raiz se necessário." -ForegroundColor Green
Write-Host "Abra em Cursor: $Target" -ForegroundColor Yellow
