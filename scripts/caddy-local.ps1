# Proxy local :80 → portas dev/staging. Requer Caddy + hosts registrados.
param([switch]$Stop)

$root = Split-Path $PSScriptRoot -Parent
$caddyfile = Join-Path $root 'Caddyfile'
$logFile = Join-Path $root 'caddy.log'
$pidFile = Join-Path $root '.caddy-local.pid'

function Get-CaddyExe {
  $cmd = Get-Command caddy -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $winget = "${env:LOCALAPPDATA}\Microsoft\WinGet\Links\caddy.exe"
  if (Test-Path $winget) { return $winget }
  return $null
}

if ($Stop) {
  if (Test-Path $pidFile) {
    $procId = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($procId) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host 'Caddy local parado.' -ForegroundColor Green
  } else {
    Write-Host 'Nenhum Caddy local registrado.' -ForegroundColor Yellow
  }
  exit 0
}

$caddy = Get-CaddyExe
if (-not $caddy) {
  Write-Host 'Caddy não encontrado. Instale:' -ForegroundColor Yellow
  Write-Host '  winget install Caddy.Caddy' -ForegroundColor Cyan
  Write-Host 'Ou: https://caddyserver.com/docs/install#windows' -ForegroundColor DarkGray
  exit 1
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host 'Caddy na porta 80 requer terminal como Administrador.' -ForegroundColor Yellow
  exit 1
}

if (Test-Path $pidFile) {
  $old = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($old -and (Get-Process -Id $old -ErrorAction SilentlyContinue)) {
    Write-Host "Caddy já em execução (PID $old). Use: npm run caddy:local:stop" -ForegroundColor Green
    exit 0
  }
}

Write-Host 'Iniciando Caddy local...' -ForegroundColor Cyan
$p = Start-Process -FilePath $caddy -ArgumentList @('run', '--config', $caddyfile) `
  -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $logFile -PassThru
Set-Content -Path $pidFile -Value $p.Id
Start-Sleep 1

Write-Host @"

Caddy OK (PID $($p.Id))
  Staging  http://staging.aiyracare.test
  API      http://api.staging.aiyracare.test
  Ops      http://ops.staging.aiyracare.test
  Dev      http://dev.aiyracare.test
  Log      caddy.log
"@ -ForegroundColor Green
