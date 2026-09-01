param([switch]$Cloud)

$root = Split-Path $PSScriptRoot -Parent
$apiDir = Join-Path $root "packages\api"
$webDir = Join-Path $root "packages\web"
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

# LLM keys often live in Windows user env (not .env)
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
  } catch {
    # Get-NetTCPConnection pode falhar sem privilégios — ignorar
  }
}

Write-Host "Starting API..." -NoNewline
$apiPort = 3010
Stop-ListenerOnPort $apiPort
$logApi = Join-Path $root "api.log"
$env:PORT = "$apiPort"
if (-not $Cloud) {
  $env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/openhealth"
}
$llmQuotaUnlimited = $env:LLM_QUOTA_UNLIMITED
$cmdApi = "set PORT=$apiPort&&set DATABASE_URL=$env:DATABASE_URL&&set LLM_QUOTA_UNLIMITED=$llmQuotaUnlimited&&set OPENCODE_GO_API_KEY=$env:OPENCODE_GO_API_KEY&&set OPENCODE_ZEN_API_KEY=$env:OPENCODE_ZEN_API_KEY&&set GEMINI_API_KEY=$env:GEMINI_API_KEY&&set GROQ_API_KEY=$env:GROQ_API_KEY&&cd /d $apiDir&&npx tsx watch src/index.ts >`"$logApi`" 2>&1"
cmd /c "start /B cmd /c `"$cmdApi`""

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -ErrorAction Stop
    if ($h.service -eq 'aiyracare-api' -or $h.service -eq 'open-health-api') { Write-Host " OK ($($h.status))" -ForegroundColor Green; break }
    Write-Host "." -NoNewline
  }
  catch { Write-Host "." -NoNewline; if ($i -eq 11) { Write-Host " FAIL" -ForegroundColor Red } }
}

Write-Host "Starting Ops console..." -NoNewline
$opsConsolePort = if ($env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT } else { "3013" }
& (Join-Path $PSScriptRoot "ops-console-up.ps1") | Out-Null
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:$opsConsolePort/health" -ErrorAction Stop
  if ($h.service -eq 'aiyracare-ops-console') { Write-Host " OK" -ForegroundColor Green }
  else { Write-Host " skip" -ForegroundColor Yellow }
} catch { Write-Host " FAIL" -ForegroundColor Red }

Write-Host "Starting Ops notifier..." -NoNewline
$notifierPort = if ($env:OPS_LOCAL_NOTIFIER_PORT) { $env:OPS_LOCAL_NOTIFIER_PORT } else { "3012" }
& (Join-Path $PSScriptRoot "ops-notifier-up.ps1") | Out-Null
try {
  $code = (Invoke-WebRequest -Uri "http://127.0.0.1:$notifierPort/health" -UseBasicParsing -TimeoutSec 2).StatusCode
  if ($code -eq 200) { Write-Host " OK" -ForegroundColor Green }
  else { Write-Host " skip" -ForegroundColor Yellow }
} catch { Write-Host " FAIL" -ForegroundColor Red }


Write-Host "Starting Web..." -NoNewline
$logWeb = Join-Path $root "web.log"
Stop-ListenerOnPort 5173
$cmdWeb = "cd /d $webDir&&npx vite --host 0.0.0.0 >`"$logWeb`" 2>&1"
cmd /c "start /B cmd /c `"$cmdWeb`""

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep 1
  try { $code = (Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2).StatusCode; Write-Host " OK ($code)" -ForegroundColor Green; break }
  catch { Write-Host "." -NoNewline; if ($i -eq 11) { Write-Host " FAIL" -ForegroundColor Red } }
}

Write-Host @"
`nAiyraCare running:
  API  http://127.0.0.1:$apiPort/health
  Web  http://localhost:5173
  Ops  http://127.0.0.1:$opsConsolePort (console independente)
  Notifier http://127.0.0.1:$notifierPort/ops-alert
  Logs api.log / web.log / ops-console.log / ops-notifier.log
"@

Start-Process "http://localhost:5173/login"
