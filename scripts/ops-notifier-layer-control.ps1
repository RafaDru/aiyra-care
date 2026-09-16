# Per-layer start / restart / stop / log for ops tray farol (Dev + Staging local).
param(
  [int]$NotifierPort = 3012,
  [ValidateSet('frontend', 'backend', 'database', 'observability', 'notifier')]
  [string]$Layer,
  [ValidateSet('start', 'restart', 'stop', 'log')]
  [string]$Action,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'

$scriptsDir = $PSScriptRoot
$root = Split-Path $scriptsDir -Parent
. (Join-Path $scriptsDir 'ops-notifier-health.ps1')
. (Join-Path $scriptsDir 'ops-notifier-instance.ps1')
$importDotenv = Join-Path $scriptsDir 'import-dotenv.ps1'

& $importDotenv -Path (Join-Path $root '.env')
$preview = $NotifierPort -eq 3022
if ($preview) {
  & $importDotenv -Path (Join-Path $root '.env.preview') -Override
}

$ports = Get-OpsNotifierTierPorts -NotifierPort $NotifierPort
$logSuffix = if ($preview) { '-preview' } else { '' }
$apiDir = Join-Path $root 'packages\api'
$webDir = Join-Path $root 'packages\web'
$opsConsoleUpScript = Join-Path $scriptsDir 'ops-console-up.ps1'
$notifierUpScript = Join-Path $scriptsDir 'ops-notifier-up.ps1'
$createPreviewDbScript = Join-Path $scriptsDir 'create-preview-db.ps1'

function Get-OpsLayerContext {
  $dbName = if ($preview) { 'aiyracare_preview' } else { 'aiyracare' }
  return @{
    preview = $preview
    tierLabel = $ports.tierLabel
    logSuffix = $logSuffix
    apiPort = $ports.apiPort
    webPort = $ports.webPort
    opsConsolePort = $ports.opsConsolePort
    notifierPort = $ports.notifierPort
    databaseUrl = "postgresql://postgres:postgres123@127.0.0.1:5432/$dbName"
    apiLog = Join-Path $root "api$logSuffix.log"
    webLog = Join-Path $root "web$logSuffix.log"
    notifierLog = Join-Path $root "ops-notifier$logSuffix.log"
    opsConsoleLog = Join-Path $root 'ops-console.log'
  }
}

function Stop-OpsLayerPort {
  param([int]$Port)
  try {
    $conns = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    foreach ($c in $conns) {
      if ($c.OwningProcess -gt 0) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  } catch { }
}

function Wait-OpsLayerPortFree {
  param(
    [int]$Port,
    [int]$TimeoutSec = 12
  )
  for ($i = 0; $i -lt ($TimeoutSec * 5); $i++) {
    if (-not (Test-PortListening $Port)) { return $true }
    Start-Sleep -Milliseconds 200
  }
  return -not (Test-PortListening $Port)
}

function Import-OpsLayerMachineEnv {
  function Import-One {
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
  Import-One 'OPENCODE_GO_API_KEY' @('OPENCODEGO_API_KEY', 'OPENCODE_GO_API_KEY')
  Import-One 'OPENCODE_ZEN_API_KEY' @('OPENCODE_ZEN_API_KEY', 'OPENCODEGO_API_KEY')
  Import-One 'GEMINI_API_KEY' @('GEMINI_API_KEY')
  Import-One 'GROQ_API_KEY' @('GROQ_API_KEY')
}

function Start-OpsLayerBackendProcess {
  $ctx = Get-OpsLayerContext
  Import-OpsLayerMachineEnv
  Stop-OpsLayerPort $ctx.apiPort
  Wait-OpsLayerPortFree -Port $ctx.apiPort | Out-Null
  $env:PORT = [string]$ctx.apiPort
  $env:DATABASE_URL = $ctx.databaseUrl
  $env:DEPLOYMENT_TIER = if ($ctx.preview) { 'preview' } else { 'integration' }
  $llmQuotaUnlimited = $env:LLM_QUOTA_UNLIMITED
  $cmdApi = "set PORT=$($ctx.apiPort)&&set DEPLOYMENT_TIER=$($env:DEPLOYMENT_TIER)&&set DATABASE_URL=$($ctx.databaseUrl)&&set LLM_QUOTA_UNLIMITED=$llmQuotaUnlimited&&set OPENCODE_GO_API_KEY=$env:OPENCODE_GO_API_KEY&&set OPENCODE_ZEN_API_KEY=$env:OPENCODE_ZEN_API_KEY&&set GEMINI_API_KEY=$env:GEMINI_API_KEY&&set GROQ_API_KEY=$env:GROQ_API_KEY&&cd /d `"$apiDir`"&&npx tsx watch src/index.ts >>`"$($ctx.apiLog)`" 2>&1"
  $null = cmd /c "start /B cmd /c `"$cmdApi`" 2>nul"
}

function Start-OpsLayerFrontendProcess {
  $ctx = Get-OpsLayerContext
  Stop-OpsLayerPort $ctx.webPort
  Wait-OpsLayerPortFree -Port $ctx.webPort | Out-Null
  $viteApiUrl = "http://127.0.0.1:$($ctx.apiPort)"
  $viteOpsConsoleUrl = "http://127.0.0.1:$($ctx.opsConsolePort)"
  $cmdWeb = "set VITE_API_URL=$viteApiUrl&&set VITE_OPS_CONSOLE_URL=$viteOpsConsoleUrl&&cd /d `"$webDir`"&&npx vite --host 0.0.0.0 --port $($ctx.webPort) >>`"$($ctx.webLog)`" 2>&1"
  $null = cmd /c "start /B cmd /c `"$cmdWeb`" 2>nul"
}

function Start-OpsLayerObservabilityProcess {
  $ctx = Get-OpsLayerContext
  $env:OPS_CONSOLE_PORT = [string]$ctx.opsConsolePort
  if ($ctx.preview) { $env:DEPLOYMENT_TIER = 'preview' }
  & $opsConsoleUpScript | Out-Null
}

function Start-OpsLayerNotifierProcess {
  $exe = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
  if (-not $exe) {
    $exe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  }
  $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $notifierUpScript, '-Force')
  if ($preview) { $argList += '-Preview' }
  Start-Process -FilePath $exe -ArgumentList $argList -WindowStyle Hidden -ErrorAction Stop | Out-Null
}

function Test-OpsPostgresListening {
  return Test-PortListening 5432
}

function Start-OpsPostgresServiceIfPossible {
  $services = @(Get-Service -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like 'postgresql*' -or $_.DisplayName -like '*PostgreSQL*'
  })
  if (-not $services.Count) {
    return @{ ok = $false; message = 'Servico PostgreSQL nao encontrado (inicie manualmente na porta 5432)' }
  }
  foreach ($svc in $services) {
    try {
      if ($svc.Status -ne 'Running') {
        Start-Service $svc.Name -ErrorAction Stop
      }
      return @{ ok = $true; message = "PostgreSQL $($svc.Name) em execucao" }
    } catch {
      continue
    }
  }
  return @{ ok = $false; message = 'Nao foi possivel iniciar o servico PostgreSQL' }
}

function Restart-OpsPostgresServiceIfPossible {
  $services = @(Get-Service -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like 'postgresql*' -or $_.DisplayName -like '*PostgreSQL*'
  })
  if (-not $services.Count) {
    return @{ ok = $false; message = 'Servico PostgreSQL nao encontrado' }
  }
  foreach ($svc in $services) {
    try {
      Restart-Service $svc.Name -Force -ErrorAction Stop
      return @{ ok = $true; message = "PostgreSQL $($svc.Name) reiniciado" }
    } catch {
      continue
    }
  }
  return @{ ok = $false; message = 'Nao foi possivel reiniciar o servico PostgreSQL' }
}

function Wait-OpsApiHealth {
  param([int]$ApiPort, [int]$Seconds = 20)
  for ($i = 0; $i -lt $Seconds; $i++) {
    Start-Sleep 1
    $h = Test-OpsApiHealth -ApiPort $ApiPort
    if ($h.state -eq 'ok') { return $true }
  }
  return $false
}

function Open-OpsLayerLogFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    return @{ ok = $false; message = "Log nao encontrado: $Path" }
  }
  Start-Process -FilePath notepad.exe -ArgumentList $Path -ErrorAction Stop | Out-Null
  return @{ ok = $true; message = "Log aberto: $Path" }
}

function Invoke-OpsLayerControl {
  param(
    [string]$LayerKey,
    [string]$LayerAction
  )

  $ctx = Get-OpsLayerContext
  $message = ''

  switch ($LayerKey) {
    'frontend' {
      switch ($LayerAction) {
        'start' {
          if (Test-PortListening $ctx.webPort) {
            $message = "Frontend ja ativo na porta $($ctx.webPort)"
          } else {
            Start-OpsLayerFrontendProcess
            $message = "Frontend iniciando (:$($ctx.webPort))"
          }
        }
        'restart' {
          Stop-OpsLayerPort $ctx.webPort
          Wait-OpsLayerPortFree -Port $ctx.webPort | Out-Null
          Start-Sleep -Milliseconds 400
          Start-OpsLayerFrontendProcess
          $message = "Frontend reiniciando (:$($ctx.webPort))"
        }
        'stop' {
          Stop-OpsLayerPort $ctx.webPort
          $message = "Frontend parado (:$($ctx.webPort))"
        }
        'log' {
          $r = Open-OpsLayerLogFile $ctx.webLog
          $message = $r.message
        }
      }
    }
    'backend' {
      switch ($LayerAction) {
        'start' {
          if (Test-PortListening $ctx.apiPort) {
            $message = "Backend ja ativo na porta $($ctx.apiPort)"
          } else {
            Start-OpsLayerBackendProcess
            $message = "Backend iniciando (:$($ctx.apiPort))"
          }
        }
        'restart' {
          Stop-OpsLayerPort $ctx.apiPort
          Wait-OpsLayerPortFree -Port $ctx.apiPort | Out-Null
          Start-Sleep -Milliseconds 400
          Start-OpsLayerBackendProcess
          $message = "Backend reiniciando (:$($ctx.apiPort))"
        }
        'stop' {
          Stop-OpsLayerPort $ctx.apiPort
          $message = "Backend parado (:$($ctx.apiPort))"
        }
        'log' {
          $r = Open-OpsLayerLogFile $ctx.apiLog
          $message = $r.message
        }
      }
    }
    'database' {
      switch ($LayerAction) {
        'start' {
          if (-not (Test-OpsPostgresListening)) {
            $pg = Start-OpsPostgresServiceIfPossible
            if (-not $pg.ok) { return @{ ok = $false; message = $pg.message } }
            Start-Sleep 2
          }
          if ($ctx.preview) {
            & $createPreviewDbScript | Out-Null
          }
          if (-not (Test-PortListening $ctx.apiPort)) {
            Start-OpsLayerBackendProcess
            $message = 'Banco OK; backend iniciando para expor /health/db'
          } else {
            $db = Test-OpsDbHealth -ApiPort $ctx.apiPort
            $message = if ($db.state -eq 'ok') { 'Banco Postgres OK' } else { "Postgres no ar; API reporta: $($db.detail)" }
          }
        }
        'restart' {
          $pg = Restart-OpsPostgresServiceIfPossible
          if ($pg.ok) {
            Start-Sleep 2
            if (Test-PortListening $ctx.apiPort) {
              Stop-OpsLayerPort $ctx.apiPort
              Start-Sleep 1
              Start-OpsLayerBackendProcess
            }
            $message = "$($pg.message); backend reiniciado"
          } else {
            Stop-OpsLayerPort $ctx.apiPort
            Start-Sleep 1
            Start-OpsLayerBackendProcess
            $message = "$($pg.message). Backend reiniciado (fallback)"
          }
        }
        'stop' {
          return @{ ok = $false; message = 'Parar Postgres pelo tray nao e suportado (use servicos Windows)' }
        }
        'log' {
          $r = Open-OpsLayerLogFile $ctx.apiLog
          $message = if ($r.ok) { "$($r.message) (erros de DB costumam aparecer aqui)" } else { $r.message }
        }
      }
    }
    'observability' {
      switch ($LayerAction) {
        'start' {
          if (Test-PortListening $ctx.opsConsolePort) {
            $message = "Console ops ja ativo (:$($ctx.opsConsolePort))"
          } else {
            Start-OpsLayerObservabilityProcess
            $message = "Console ops iniciando (:$($ctx.opsConsolePort))"
          }
        }
        'restart' {
          Stop-OpsLayerPort $ctx.opsConsolePort
          Wait-OpsLayerPortFree -Port $ctx.opsConsolePort | Out-Null
          Start-Sleep -Milliseconds 400
          Start-OpsLayerObservabilityProcess
          $message = "Console ops reiniciando (:$($ctx.opsConsolePort))"
        }
        'stop' {
          Stop-OpsLayerPort $ctx.opsConsolePort
          $message = "Console ops parado (:$($ctx.opsConsolePort))"
        }
        'log' {
          $r = Open-OpsLayerLogFile $ctx.opsConsoleLog
          if (-not $r.ok) {
            $r = Open-OpsLayerLogFile $ctx.apiLog
          }
          $message = $r.message
        }
      }
    }
    'notifier' {
      switch ($LayerAction) {
        'start' {
          if (Test-OpsNotifierHealthy -Port $ctx.notifierPort) {
            $message = "Notificador ja ativo (:$($ctx.notifierPort))"
          } else {
            Start-OpsLayerNotifierProcess
            $message = "Notificador iniciando (:$($ctx.notifierPort))"
          }
        }
        'restart' {
          Start-OpsLayerNotifierProcess
          $message = "Notificador reiniciando (:$($ctx.notifierPort))"
        }
        'stop' {
          . (Join-Path $scriptsDir 'ops-notifier-instance.ps1') | Out-Null
          Stop-OpsNotifierInstance -Root $root -Port $ctx.notifierPort
          $message = "Notificador parado (:$($ctx.notifierPort))"
        }
        'log' {
          $r = Open-OpsLayerLogFile $ctx.notifierLog
          $message = $r.message
        }
      }
    }
  }

  return @{
    ok = $true
    tier = $ctx.tierLabel
    layer = $LayerKey
    action = $LayerAction
    message = $message
  }
}

if (-not $Layer -or -not $Action) {
  throw 'Use -Layer e -Action'
}

try {
  $result = Invoke-OpsLayerControl -LayerKey $Layer -LayerAction $Action
} catch {
  $ctx = Get-OpsLayerContext
  $result = @{
    ok = $false
    tier = $ctx.tierLabel
    layer = $Layer
    action = $Action
    message = $_.Exception.Message
  }
}

if ($Json) {
  [Console]::Out.WriteLine(($result | ConvertTo-Json -Compress -Depth 4))
} else {
  $color = if ($result.ok) { 'Green' } else { 'Yellow' }
  Write-Host "[$($result.tier)] $($result.layer) $($result.action): $($result.message)" -ForegroundColor $color
  if (-not $result.ok) { exit 1 }
}
