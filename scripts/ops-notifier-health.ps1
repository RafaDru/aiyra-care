# Health probes for ops system-tray farol (per deployment tier).

function Get-OpsNotifierTierPorts {
  param([int]$NotifierPort)
  if ($NotifierPort -eq 3022) {
    return @{
      apiPort = 3020
      webPort = 5174
      opsConsolePort = 3023
      notifierPort = 3022
      tierLabel = 'Staging'
    }
  }
  return @{
    apiPort = 3010
    webPort = 5173
    opsConsolePort = 3013
    notifierPort = 3012
    tierLabel = 'Dev'
  }
}

function Test-PortListening {
  param([int]$Port)
  try {
    $conns = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    return $conns.Count -gt 0
  } catch {
    return $false
  }
}

function Test-OpsHttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSec = 2
  )
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    $sw.Stop()
    return @{
      ok = $true
      status = [int]$r.StatusCode
      latencyMs = [int]$sw.ElapsedMilliseconds
      error = $null
    }
  } catch {
    $sw.Stop()
    return @{
      ok = $false
      status = $null
      latencyMs = [int]$sw.ElapsedMilliseconds
      error = $_.Exception.Message
    }
  }
}

function Test-OpsApiHealth {
  param([int]$ApiPort)
  if (-not (Test-PortListening $ApiPort)) {
    return @{ state = 'down'; detail = 'porta fechada'; latencyMs = 0; error = 'not listening' }
  }
  $base = Test-OpsHttpOk "http://127.0.0.1:$ApiPort/health"
  if (-not $base.ok) {
    return @{ state = 'down'; detail = 'sem resposta'; latencyMs = $base.latencyMs; error = $base.error }
  }
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/health" -TimeoutSec 3
    $svc = [string]$h.service
    if ($svc -match 'aiyra') {
      $st = [string]$h.status
      if ($st -eq 'degraded') {
        return @{ state = 'warn'; detail = "degraded | $svc"; latencyMs = $base.latencyMs; error = $null }
      }
      return @{ state = 'ok'; detail = "$svc | $st"; latencyMs = $base.latencyMs; error = $null }
    }
    return @{ state = 'warn'; detail = "service=$svc"; latencyMs = $base.latencyMs; error = $null }
  } catch {
    return @{ state = 'warn'; detail = 'health invalido'; latencyMs = $base.latencyMs; error = $_.Exception.Message }
  }
}

function Test-OpsDbHealth {
  param([int]$ApiPort)
  $api = Test-OpsApiHealth -ApiPort $ApiPort
  if ($api.state -eq 'down') {
    return @{ state = 'down'; detail = 'API off'; latencyMs = 0; error = $api.error }
  }
  $base = Test-OpsHttpOk "http://127.0.0.1:$ApiPort/health/db"
  if (-not $base.ok) {
    return @{ state = 'down'; detail = 'sem /health/db'; latencyMs = $base.latencyMs; error = $base.error }
  }
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/health/db" -TimeoutSec 4
    $pg = [string]$h.postgres
    if ($pg -eq 'ok') {
      return @{ state = 'ok'; detail = 'Postgres'; latencyMs = $base.latencyMs; error = $null }
    }
    if ($pg -like 'error*' -or $pg -like 'fail*') {
      return @{ state = 'down'; detail = $pg; latencyMs = $base.latencyMs; error = $null }
    }
    return @{ state = 'warn'; detail = "pg=$pg"; latencyMs = $base.latencyMs; error = $null }
  } catch {
    return @{ state = 'warn'; detail = 'db check falhou'; latencyMs = $base.latencyMs; error = $_.Exception.Message }
  }
}

function Test-OpsWebHealth {
  param([int]$WebPort)
  if (-not (Test-PortListening $WebPort)) {
    return @{ state = 'down'; detail = 'porta fechada'; latencyMs = 0; error = 'not listening' }
  }
  $base = Test-OpsHttpOk "http://localhost:$WebPort"
  if (-not $base.ok) {
    return @{ state = 'down'; detail = 'Vite off'; latencyMs = $base.latencyMs; error = $base.error }
  }
  if ($base.latencyMs -gt 4000) {
    return @{ state = 'warn'; detail = "lento $($base.latencyMs)ms"; latencyMs = $base.latencyMs; error = $null }
  }
  return @{ state = 'ok'; detail = "HTTP $($base.status)"; latencyMs = $base.latencyMs; error = $null }
}

function Test-OpsConsoleHealth {
  param([int]$OpsConsolePort)
  if (-not (Test-PortListening $OpsConsolePort)) {
    return @{ state = 'down'; detail = 'porta fechada'; latencyMs = 0; error = 'not listening' }
  }
  $base = Test-OpsHttpOk "http://127.0.0.1:$OpsConsolePort/health"
  if (-not $base.ok) {
    return @{ state = 'down'; detail = 'console off'; latencyMs = $base.latencyMs; error = $base.error }
  }
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$OpsConsolePort/health" -TimeoutSec 3
    if ([string]$h.service -eq 'aiyracare-ops-console') {
      return @{ state = 'ok'; detail = ":$OpsConsolePort"; latencyMs = $base.latencyMs; error = $null }
    }
    return @{ state = 'warn'; detail = 'service inesperado'; latencyMs = $base.latencyMs; error = $null }
  } catch {
    return @{ state = 'warn'; detail = 'health invalido'; latencyMs = $base.latencyMs; error = $_.Exception.Message }
  }
}

function Test-OpsNotifierHealth {
  param(
    [int]$NotifierPort,
    [switch]$Self
  )
  if ($Self) {
    return @{ state = 'ok'; detail = 'OK'; latencyMs = 0; error = $null }
  }
  $base = Test-OpsHttpOk "http://127.0.0.1:$NotifierPort/health" 2
  if (-not $base.ok) {
    return @{ state = 'warn'; detail = 'listener?'; latencyMs = $base.latencyMs; error = $base.error }
  }
  return @{ state = 'ok'; detail = ":$NotifierPort"; latencyMs = $base.latencyMs; error = $null }
}

function Get-OpsNotifierLayerHealth {
  param([int]$NotifierPort)

  $ports = Get-OpsNotifierTierPorts -NotifierPort $NotifierPort
  $api = Test-OpsApiHealth -ApiPort $ports.apiPort
  $web = Test-OpsWebHealth -WebPort $ports.webPort
  $db = Test-OpsDbHealth -ApiPort $ports.apiPort
  $ops = Test-OpsConsoleHealth -OpsConsolePort $ports.opsConsolePort
  $notifier = Test-OpsNotifierHealth -NotifierPort $ports.notifierPort -Self

  $layers = @(
    @{
      key = 'frontend'
      label = 'Frontend'
      port = $ports.webPort
      state = $web.state
      detail = $web.detail
      latencyMs = $web.latencyMs
    },
    @{
      key = 'backend'
      label = 'Backend'
      port = $ports.apiPort
      state = $api.state
      detail = $api.detail
      latencyMs = $api.latencyMs
    },
    @{
      key = 'database'
      label = 'Banco'
      port = $ports.apiPort
      state = $db.state
      detail = $db.detail
      latencyMs = $db.latencyMs
    },
    @{
      key = 'observability'
      label = 'Observabilidade'
      port = $ports.opsConsolePort
      state = $ops.state
      detail = $ops.detail
      latencyMs = $ops.latencyMs
    },
    @{
      key = 'notifier'
      label = 'Notificador'
      port = $ports.notifierPort
      state = $notifier.state
      detail = $notifier.detail
      latencyMs = $notifier.latencyMs
    }
  )

  $okCount = @($layers | Where-Object { $_.state -eq 'ok' }).Count
  $warnCount = @($layers | Where-Object { $_.state -eq 'warn' }).Count
  $downCount = @($layers | Where-Object { $_.state -eq 'down' }).Count

  $overall = if ($downCount -gt 0) { 'down' } elseif ($warnCount -gt 0) { 'warn' } else { 'ok' }

  return @{
    tierLabel = $ports.tierLabel
    ports = $ports
    layers = $layers
    okCount = $okCount
    warnCount = $warnCount
    downCount = $downCount
    overall = $overall
    checkedAt = Get-Date
  }
}

function Format-OpsNotifierTrayTooltip {
  param($Health)
  $summary = switch ($Health.overall) {
    'ok' { 'OK' }
    'warn' { 'Atencao' }
    'down' { 'Degradado' }
    default { '?' }
  }
  $down = @($Health.layers | Where-Object { $_.state -eq 'down' } | ForEach-Object { $_.label.Substring(0, [Math]::Min(3, $_.label.Length)) })
  $suffix = if ($down.Count) { " | $($down -join ',') down" } else { '' }
  $text = "Aiyra $([string]$Health.tierLabel) $summary $($Health.okCount)/$($Health.layers.Count)$suffix"
  if ($text.Length -gt 63) { return $text.Substring(0, 63) }
  return $text
}
