# Restaura workspace aiyra-care após junction quebrada.
# FECHE O CURSOR antes de rodar.
# Uso: npm run fix:workspace
$ErrorActionPreference = 'Stop'
$filhos = Join-Path $env:USERPROFILE 'Documents\Filhos'
$aiyra = Join-Path $env:USERPROFILE 'Documents\aiyra-care'

if (-not (Test-Path $filhos)) {
  Write-Error "Pasta Filhos não encontrada: $filhos"
}

if (Test-Path $aiyra) {
  $item = Get-Item $aiyra -Force
  if ($item.LinkType -eq 'Junction') {
    Write-Host 'Junction já OK:' $aiyra '→' $item.Target -ForegroundColor Green
    exit 0
  }
  Write-Host "Removendo pasta aiyra-care (não é junction)..." -ForegroundColor Yellow
  Remove-Item $aiyra -Recurse -Force
}

Write-Host "Criando junction aiyra-care → Filhos..." -ForegroundColor Cyan
cmd /c mklink /J "$aiyra" "$filhos" | Out-Null

if (-not (Test-Path (Join-Path $aiyra 'package.json'))) {
  Write-Error 'Junction criada mas package.json não encontrado — verifique Filhos.'
}

Write-Host 'OK. Abra no Cursor: C:\Users\rafae\Documents\aiyra-care' -ForegroundColor Green
Write-Host 'Opcional (Cursor fechado): rmdir junction + Rename-Item Filhos aiyra-care' -ForegroundColor DarkGray
