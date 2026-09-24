# Expo Go na rua: Metro (--tunnel) + API acessível pelo celular (localtunnel em :3010).
# Pré-requisito: API rodando em http://127.0.0.1:3010 (npm run stack:start ou scripts/up.ps1).
param(
  [ValidateSet('street', 'lan')]
  [string]$Mode = 'street'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$mobileDir = Join-Path $root 'packages\mobile'
$envFile = Join-Path $mobileDir '.env'
$urlFile = Join-Path $mobileDir '.api-tunnel-url'
$tunnelLog = Join-Path $mobileDir '.api-tunnel.log'
$expoUrlFile = Join-Path $mobileDir '.expo-url.txt'

# Metro em CI desliga watch/reload e quebra QR no Expo Go — nunca herdar CI do agente/terminal.
function Clear-ExpoDevCiEnv {
  Remove-Item Env:CI -ErrorAction SilentlyContinue
}
Clear-ExpoDevCiEnv

function Get-LanIPv4 {
  $addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      ($_.PrefixOrigin -eq 'Dhcp' -or $_.PrefixOrigin -eq 'Manual')
    } |
    Sort-Object InterfaceMetric
  if ($addrs) {
    return ($addrs | Select-Object -First 1).IPAddress
  }
  return $null
}

function Import-MobileEnvFile {
  if (-not (Test-Path $envFile)) {
    Write-Host "AVISO: Crie packages/mobile/.env a partir de .env.example (Supabase + API)." -ForegroundColor Yellow
    return
  }
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
    if ($val -match 'localhost|127\.0\.0\.1') {
      Write-Host "Ignorando $key (loopback no .env - use IP LAN)" -ForegroundColor Yellow
      return
    }
    Set-Item -Path "Env:$key" -Value $val
  }
}

function Write-ExpoPublicEnvAudit {
  Write-Host 'EXPO_PUBLIC_* (processo Metro):' -ForegroundColor Cyan
  Get-ChildItem Env:EXPO_PUBLIC_* -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
    $v = $_.Value
    if ($_.Name -match 'KEY|ANON') { $v = if ($v.Length -gt 8) { $v.Substring(0, 8) + '...' } else { '...' } }
    Write-Host "  $($_.Name)=$v" -ForegroundColor DarkGray
  }
}

function Test-ApiHealth {
  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3010/health' -UseBasicParsing -TimeoutSec 4
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

Push-Location $root
try {
  $branch = (git branch --show-current 2>$null)
  $commit = (git log -1 --oneline 2>$null)
  Write-Host ""
  Write-Host "=== AiyraCare mobile ($Mode) ===" -ForegroundColor Cyan
  Write-Host "Git: $branch @ $commit"
  Write-Host ""

  if (-not (Test-ApiHealth)) {
    Write-Host "API nao responde em http://127.0.0.1:3010/health" -ForegroundColor Red
    Write-Host "Suba a stack: npm run stack:start   (ou scripts/up.ps1 no seu PC)" -ForegroundColor Yellow
    exit 1
  }

  Import-MobileEnvFile
  Remove-Item Env:EXPO_PUBLIC_OAUTH_REDIRECT_URI -ErrorAction SilentlyContinue
  if ($env:EXPO_PUBLIC_OAUTH_USE_WEB_BRIDGE -ne '1') {
    Remove-Item Env:EXPO_PUBLIC_OAUTH_USE_WEB_BRIDGE -ErrorAction SilentlyContinue
  }

  $tunnelProc = $null
  if ($Mode -eq 'street') {
    Remove-Item $urlFile -ErrorAction SilentlyContinue
    Remove-Item $tunnelLog -ErrorAction SilentlyContinue
    Write-Host "Abrindo tunel publico para API :3010 (localtunnel)..." -ForegroundColor Cyan
    $tunnelProc = Start-Process -FilePath 'node' `
      -ArgumentList (Join-Path $root 'scripts\mobile-api-tunnel.mjs') `
      -WorkingDirectory $root `
      -RedirectStandardOutput $tunnelLog `
      -RedirectStandardError $tunnelLog `
      -PassThru -WindowStyle Hidden

    $deadline = (Get-Date).AddSeconds(45)
    $apiUrl = $null
    while ((Get-Date) -lt $deadline) {
      if (Test-Path $urlFile) {
        $apiUrl = (Get-Content $urlFile -Raw).Trim()
        if ($apiUrl) { break }
      }
      Start-Sleep -Milliseconds 400
    }
    if (-not $apiUrl) {
      Write-Host "Tunel da API nao subiu a tempo. Veja $tunnelLog" -ForegroundColor Red
      if ($tunnelProc) { Stop-Process -Id $tunnelProc.Id -Force -ErrorAction SilentlyContinue }
      exit 1
    }
    $env:EXPO_PUBLIC_API_URL = $apiUrl
    Write-Host "EXPO_PUBLIC_API_URL = $apiUrl" -ForegroundColor Green
    Write-Host "Metro: expo start --tunnel --clear (escaneie o QR no Expo Go SDK 57)" -ForegroundColor Green
    Write-Host ""
    Write-Host "PC precisa ficar ligado com internet. Primeira chamada ao tunel pode pedir confirmacao no browser (localtunnel)." -ForegroundColor Yellow
  } else {
    $lan = Get-LanIPv4
    if (-not $lan) {
      Write-Host "Nao achei IP LAN. Use -Mode street para 4G." -ForegroundColor Red
      exit 1
    }
    $env:EXPO_PUBLIC_API_URL = "http://${lan}:3010"
    $env:EXPO_PUBLIC_WEB_APP_URL = "http://${lan}:5173"
    Remove-Item Env:EXPO_PUBLIC_OAUTH_REDIRECT_URI -ErrorAction SilentlyContinue
    Remove-Item Env:EXPO_PUBLIC_OAUTH_USE_WEB_BRIDGE -ErrorAction SilentlyContinue
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = $lan
    $expoLanUrl = "exp://${lan}:8081"
    Set-Content -Path $expoUrlFile -Value $expoLanUrl -Encoding UTF8
    Write-Host "EXPO_PUBLIC_API_URL = $($env:EXPO_PUBLIC_API_URL)" -ForegroundColor Green
    Write-Host "OAuth redirect: exp://${lan}:8081/--/auth/callback (bridge web desligado)" -ForegroundColor Green
    Write-Host "REACT_NATIVE_PACKAGER_HOSTNAME = $lan" -ForegroundColor Green
    Write-Host "Expo Go (manual): $expoLanUrl  (tambem em packages/mobile/.expo-url.txt)" -ForegroundColor Green
    Write-Host "Metro: expo start --lan --clear (mesmo Wi-Fi que o celular)" -ForegroundColor Green
  }

  Write-Host ""
  Write-Host "Se o app parecer igual ao de antes: force fechar o Expo Go e escaneie de novo (--clear)." -ForegroundColor Yellow
  Write-Host "Branch atual: $branch (git pull antes de testar)." -ForegroundColor Yellow
  Write-Host ""

  Clear-ExpoDevCiEnv
  Write-ExpoPublicEnvAudit

  Push-Location $mobileDir
  try {
    if ($Mode -eq 'street') {
      npx expo start --tunnel --clear
    } else {
      npx expo start --lan --clear
    }
  } finally {
    Pop-Location
    if ($tunnelProc -and -not $tunnelProc.HasExited) {
      Stop-Process -Id $tunnelProc.Id -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $urlFile -ErrorAction SilentlyContinue
  }
} finally {
  Pop-Location
}
