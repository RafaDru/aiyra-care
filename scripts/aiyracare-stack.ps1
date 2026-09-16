param(
  [ValidateSet('status', 'start', 'stop', 'restart')]
  [string]$Action = 'status',
  [switch]$Json,
  [switch]$Cloud
)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path $PSScriptRoot -Parent
$apiDir = Join-Path $root "packages\api"
$webDir = Join-Path $root "packages\web"
$apiPort = if ($env:PORT) { [int]$env:PORT } else { 3010 }
$webPort = 5173

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      if ($k -and $v) { Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue }
    }
  }
}

function Import-MachineEnvIfMissing {
  param([string]$Canonical, [string[]]$Aliases)
  if ([Environment]::GetEnvironmentVariable($Canonical, 'Process')) { return }
  foreach ($alias in $Aliases) {
    $v = [Environment]::GetEnvironmentVariable($alias, 'User')
    if (-not $v) { $v = [Environment]::GetEnvironmentVariable($alias, 'Machine') }
    if ($v) {
      Set-Item -Path "Env:$Canonical" -Value $v
      return
    }
  }
}

Import-MachineEnvIfMissing 'OPENCODE_GO_API_KEY' @('OPENCODEGO_API_KEY', 'OPENCODE_GO_API_KEY')
Import-MachineEnvIfMissing 'OPENCODE_ZEN_API_KEY' @('OPENCODE_ZEN_API_KEY', 'OPENCODEGO_API_KEY')
Import-MachineEnvIfMissing 'GEMINI_API_KEY' @('GEMINI_API_KEY')
Import-MachineEnvIfMissing 'GROQ_API_KEY' @('GROQ_API_KEY')

function Stop-ListenerOnPort {
  param([int]$Port)
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      if ($c.OwningProcess -gt 0) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  } catch { }
}

function Test-HttpStatus {
  param([string]$Url, [int]$TimeoutSec = 3)
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    return @{ up = $true; status = $r.StatusCode; error = $null }
  } catch {
    return @{ up = $false; status = $null; error = $_.Exception.Message }
  }
}

function Get-ApiHealth {
  $base = Test-HttpStatus "http://127.0.0.1:$apiPort/health"
  if (-not $base.up) { return $base }
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -TimeoutSec 3
    $base.service = [string]$h.service
    $base.healthStatus = [string]$h.status
  } catch {
    $base.error = $_.Exception.Message
  }
  return $base
}

function Get-StackStatus {
  $api = Get-ApiHealth
  $web = Test-HttpStatus "http://localhost:$webPort"
  return @{
    checkedAt = (Get-Date).ToUniversalTime().ToString('o')
    apiPort = $apiPort
    webPort = $webPort
    api = $api
    web = $web
  }
}

function Wait-ForStack {
  param([int]$MaxSeconds = 20)
  for ($i = 0; $i -lt $MaxSeconds; $i++) {
    Start-Sleep 1
    $s = Get-StackStatus
    if ($s.api.up -and $s.web.up) { return $s }
  }
  return Get-StackStatus
}

function Start-AiyraApi {
  Stop-ListenerOnPort $apiPort
  $logApi = Join-Path $root "api.log"
  $env:PORT = "$apiPort"
  if (-not $Cloud) {
    $env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare"
  }
  $llmQuotaUnlimited = $env:LLM_QUOTA_UNLIMITED
  $cmdApi = "set PORT=$apiPort&&set DATABASE_URL=$env:DATABASE_URL&&set LLM_QUOTA_UNLIMITED=$llmQuotaUnlimited&&set OPENCODE_GO_API_KEY=$env:OPENCODE_GO_API_KEY&&set OPENCODE_ZEN_API_KEY=$env:OPENCODE_ZEN_API_KEY&&set GEMINI_API_KEY=$env:GEMINI_API_KEY&&set GROQ_API_KEY=$env:GROQ_API_KEY&&cd /d $apiDir&&npx tsx watch src/index.ts >`"$logApi`" 2>&1"
  cmd /c "start /B cmd /c `"$cmdApi`""
}

function Start-AiyraWeb {
  Stop-ListenerOnPort $webPort
  $logWeb = Join-Path $root "web.log"
  $cmdWeb = "cd /d $webDir&&npx vite --host 0.0.0.0 >`"$logWeb`" 2>&1"
  cmd /c "start /B cmd /c `"$cmdWeb`""
}

function Start-AiyraStack {
  $before = Get-StackStatus
  if (-not $before.api.up) { Start-AiyraApi }
  if (-not $before.web.up) { Start-AiyraWeb }
  if ($before.api.up -and $before.web.up) {
    return @{
      action = 'start'
      message = 'API e web já estavam no ar'
      status = $before
    }
  }
  $after = Wait-ForStack 25
  return @{
    action = 'start'
    message = if ($after.api.up -and $after.web.up) { 'Stack iniciado' } else { 'Stack parcialmente iniciado - verifique logs' }
    status = $after
  }
}

function Stop-AiyraStack {
  Stop-ListenerOnPort $apiPort
  Stop-ListenerOnPort $webPort
  Start-Sleep 1
  return @{
    action = 'stop'
    message = 'API e web encerrados (ops-console e notificador mantidos)'
    status = Get-StackStatus
  }
}

function Restart-AiyraStack {
  Stop-ListenerOnPort $apiPort
  Stop-ListenerOnPort $webPort
  Start-Sleep 2
  Start-AiyraApi
  Start-AiyraWeb
  $after = Wait-ForStack 25
  return @{
    action = 'restart'
    message = if ($after.api.up -and $after.web.up) { 'Stack reiniciado' } else { 'Reinicio incompleto - verifique logs' }
    status = $after
  }
}

$result = switch ($Action) {
  'status' { @{ action = 'status'; status = Get-StackStatus } }
  'start' { Start-AiyraStack }
  'stop' { Stop-AiyraStack }
  'restart' { Restart-AiyraStack }
}

if ($Json) {
  $result | ConvertTo-Json -Depth 6 -Compress
} else {
  Write-Host "Aiyra stack - $($result.action)"
  if ($result.message) { Write-Host $result.message }
  $s = $result.status
  if ($s) {
    $apiState = if ($s.api.up) { 'UP' } else { 'DOWN' }
    $webState = if ($s.web.up) { 'UP' } else { 'DOWN' }
    Write-Host "  API ($apiPort): $apiState"
    Write-Host "  Web ($webPort): $webState"
  }
}
