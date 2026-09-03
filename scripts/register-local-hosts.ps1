# Registra hostnames locais em C:\Windows\System32\drivers\etc\hosts
# Requer PowerShell como Administrador: npm run hosts:register

$ErrorActionPreference = 'Stop'

$markerStart = '# AiyraCare local hostnames (npm run hosts:register)'
$markerEnd = '# /AiyraCare local hostnames'

$entries = @(
  '127.0.0.1 staging.aiyracare.test api.staging.aiyracare.test ops.staging.aiyracare.test'
  '127.0.0.1 dev.aiyracare.test api.dev.aiyracare.test ops.dev.aiyracare.test'
)

$hostsPath = Join-Path $env:Windir 'System32\drivers\etc\hosts'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host 'Execute como Administrador (terminal elevado).' -ForegroundColor Yellow
  Write-Host '  npm run hosts:register' -ForegroundColor Cyan
  exit 1
}

$content = Get-Content -Path $hostsPath -Raw -ErrorAction Stop
if ($content -match [regex]::Escape($markerStart)) {
  Write-Host 'Hostnames AiyraCare ja registrados em hosts.' -ForegroundColor Green
  exit 0
}

$block = @(
  ''
  $markerStart
  $entries
  $markerEnd
  ''
) -join "`r`n"

Add-Content -Path $hostsPath -Value $block -Encoding ascii
Write-Host 'Hostnames registrados:' -ForegroundColor Green
foreach ($line in $entries) { Write-Host "  $line" }
Write-Host ''
Write-Host 'Proximo: npm run caddy:local (porta 80, admin)' -ForegroundColor Cyan
Write-Host 'Staging: http://staging.aiyracare.test' -ForegroundColor DarkGray
