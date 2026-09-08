# AiyraCare ops — ícone na bandeja + receptor HTTP local (:3012/ops-alert).
# Dashboard de observabilidade: console independente :3013 (não o app :5173/ops).
param(
  [int]$NotifierPort = 0
)

$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'ops-notifier-instance.ps1')
. (Join-Path $PSScriptRoot 'ops-notifier-health.ps1')
. (Join-Path $PSScriptRoot 'ops-notifier-tray-ui.ps1')
. (Join-Path $PSScriptRoot 'ops-notifier-toast-design.ps1')
$iconPath = Join-Path $root 'packages\web\public\brand\logo-icon.png'
$logSuffix = if ($env:OPS_NOTIFIER_LOG_SUFFIX) { $env:OPS_NOTIFIER_LOG_SUFFIX } else { '' }
$logFile = Join-Path $root "ops-notifier$logSuffix.log"
$toastResolveScript = Join-Path $PSScriptRoot 'ops-toast-resolve.ps1'
. $toastResolveScript
$importDotenv = Join-Path $PSScriptRoot 'import-dotenv.ps1'
& $importDotenv -Path (Join-Path $root '.env')
if ($env:OPS_LOCAL_NOTIFIER_PORT -eq '3022' -or $env:DEPLOYMENT_TIER -eq 'preview') {
  & $importDotenv -Path (Join-Path $root '.env.preview') -Override
}
if ($NotifierPort -gt 0) {
  $env:OPS_LOCAL_NOTIFIER_PORT = [string]$NotifierPort
}
$port = if ($env:OPS_LOCAL_NOTIFIER_PORT) { $env:OPS_LOCAL_NOTIFIER_PORT.Trim() } else { '3012' }
$portInt = [int]$port
$tierLabel = if ($env:AIYRA_NOTIFIER_TIER) { $env:AIYRA_NOTIFIER_TIER.Trim() } elseif ($port -eq '3022') { 'Staging' } else { 'Dev' }

$mutexName = Get-OpsNotifierMutexName -Port $portInt
$instanceMutex = New-Object System.Threading.Mutex($false, $mutexName)
$mutexAcquired = $false
try {
  $mutexAcquired = $instanceMutex.WaitOne(0, $false)
} catch {
  $mutexAcquired = $false
}
if (-not $mutexAcquired) {
  exit 0
}

$pidFile = Get-OpsNotifierPidFile -Root $root -Port $portInt
Set-Content -Path $pidFile -Value $PID -NoNewline

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$opsConsolePort = if ($env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT.Trim() } else { if ($port -eq '3022') { '3023' } else { '3013' } }
$apiPort = if ($port -eq '3022') { '3020' } else { '3010' }
$webPort = if ($port -eq '3022') { '5174' } else { '5173' }
$alertPath = if ($env:OPS_LOCAL_NOTIFIER_PATH) { $env:OPS_LOCAL_NOTIFIER_PATH.Trim() } else { '/ops-alert' }
if (-not $alertPath.StartsWith('/')) { $alertPath = "/$alertPath" }

$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      if ($k -and $v -and -not [Environment]::GetEnvironmentVariable($k, 'Process')) {
        Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue
      }
    }
  }
}
$envPreviewFile = Join-Path $root '.env.preview'
if ($port -eq '3022' -and (Test-Path $envPreviewFile)) {
  Get-Content $envPreviewFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      if ($k -and $v) { Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue }
    }
  }
}

function Write-NotifierLog([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $logFile -Value $line -Encoding utf8
}

function Resolve-ObservabilityUrl {
  $consolePort = if ($env:OPS_CONSOLE_PORT -and $env:OPS_CONSOLE_PORT.Trim()) {
    $env:OPS_CONSOLE_PORT.Trim()
  } elseif ($port -eq '3022') {
    '3023'
  } else {
    '3013'
  }
  $explicit = $env:OPS_ALERT_DASHBOARD_URL
  if ($explicit -and $explicit.Trim()) {
    $url = $explicit.Trim()
    if ($url.EndsWith('/')) { $url = $url.Substring(0, $url.Length - 1) }
    if ($url -match ':5173/ops$') {
      Write-NotifierLog "legacy dashboard URL ignored: $url"
      return "http://127.0.0.1:$consolePort"
    }
    return Normalize-OpsLocalServiceUrl -Url $url -FallbackPort ([int]$consolePort)
  }
  return "http://127.0.0.1:$consolePort"
}

function Resolve-AiyraAppUrl {
  $web = $env:LANDING_CAPTURE_WEB_URL
  if ($web -and $web.Trim()) {
    $url = $web.Trim()
    if ($url.EndsWith('/')) { $url = $url.Substring(0, $url.Length - 1) }
    return $url
  }
  return "http://localhost:$webPort"
}

$observabilityUrl = Resolve-ObservabilityUrl
$aiyraAppUrl = Resolve-AiyraAppUrl
$openBrowser = $true
if ($env:OPS_LOCAL_NOTIFIER_OPEN -and $env:OPS_LOCAL_NOTIFIER_OPEN.Trim() -eq '0') {
  $openBrowser = $false
}
$opsConsoleUpScript = Join-Path $root 'scripts\ops-console-up.ps1'
$stackScript = Join-Path $root 'scripts\aiyracare-stack.ps1'
$layerControlScript = Join-Path $PSScriptRoot 'ops-notifier-layer-control.ps1'

if (-not (Test-Path $iconPath)) {
  Write-NotifierLog "icon missing: $iconPath"
  throw "Icone nao encontrado: $iconPath"
}

$queue = New-Object System.Collections.Concurrent.ConcurrentQueue[string]
$sync = [hashtable]::Synchronized(@{})

$listenerScript = {
  param($Sync, $Queue, $Port, $AlertPath, $LogFile)

  function Log([string]$msg) {
    $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    Add-Content -Path $LogFile -Value $line -Encoding utf8
  }

  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://127.0.0.1:$Port/")
  try {
    $listener.Start()
  } catch {
    Log "HttpListener failed: $($_.Exception.Message)"
    return
  }

  $Sync.Listener = $listener
  Log "listening http://127.0.0.1:$Port$AlertPath"

  while ($listener.IsListening) {
    try {
      $ctx = $listener.GetContext()
    } catch {
      break
    }

    $req = $ctx.Request
    $res = $ctx.Response
    $path = $req.Url.AbsolutePath

    try {
      if ($req.HttpMethod -eq 'GET' -and $path -eq '/health') {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('ok')
        $res.StatusCode = 200
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      elseif ($req.HttpMethod -eq 'POST' -and $path -eq $AlertPath) {
        $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.UTF8Encoding]::new($false))
        $body = $reader.ReadToEnd()
        $reader.Close()
        $Queue.Enqueue($body)
        Log "alert received ($($body.Length) bytes)"
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('ok')
        $res.StatusCode = 200
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      else {
        $res.StatusCode = 404
      }
    } finally {
      $res.Close()
    }
  }

  Log 'listener stopped'
}

$runspace = [runspacefactory]::CreateRunspace()
$runspace.Open()
$ps = [powershell]::Create()
$ps.Runspace = $runspace
$ps.AddScript($listenerScript).AddArgument($sync).AddArgument($queue).AddArgument($port).AddArgument($alertPath).AddArgument($logFile)
$ps.BeginInvoke()

$bitmap = [System.Drawing.Bitmap]::FromFile($iconPath)
$iconHandle = $bitmap.GetHicon()
$baseIcon = [System.Drawing.Icon]::FromHandle($iconHandle)
$icon = New-Object System.Windows.Forms.NotifyIcon
$icon.Icon = $baseIcon
$icon.Text = "AiyraCare Ops ($tierLabel)"
$icon.Visible = $true

$script:healthCache = $null
$script:healthCacheAt = [datetime]::MinValue
$script:healthCacheTtlSec = 20
$script:healthRefreshBusy = $false
$script:healthRefreshPs = $null
$script:healthRefreshRunspace = $null
$healthScriptPath = Join-Path $PSScriptRoot 'ops-notifier-health.ps1'
$script:layerControlBusy = $false
$script:layerControlPs = $null
$script:layerControlRunspace = $null
$script:layerControlAsync = $null
$script:layerControlPending = $null

function Apply-TrayHealth {
  param($Health)
  if (-not $Health) { return }
  $script:healthCache = $Health
  $script:healthCacheAt = Get-Date
  try {
    $icon.Text = Format-OpsNotifierTrayTooltip $Health
    $composite = Get-OpsTrayCompositeIcon -BaseIcon $baseIcon -OverallState $Health.overall
    $icon.Icon = $composite
  } catch {
    Write-NotifierLog "tray icon update: $($_.Exception.Message)"
  }
  if ($menu) {
    Update-OpsTrayFarolMenu -Menu $menu -Health $Health
  }
}

function Start-TrayHealthRefresh {
  param([bool]$Force = $false)

  $age = ((Get-Date) - $script:healthCacheAt).TotalSeconds
  if (-not $Force -and $script:healthCache -and $age -lt $script:healthCacheTtlSec) {
    Apply-TrayHealth $script:healthCache
    return
  }
  if ($script:healthRefreshBusy) { return }

  $script:healthRefreshBusy = $true
  try {
    if ($script:healthRefreshPs) {
      try { $script:healthRefreshPs.Dispose() } catch { }
      $script:healthRefreshPs = $null
    }
    if ($script:healthRefreshRunspace) {
      try { $script:healthRefreshRunspace.Close() } catch { }
      $script:healthRefreshRunspace.Dispose()
      $script:healthRefreshRunspace = $null
    }

    $script:healthRefreshRunspace = [runspacefactory]::CreateRunspace()
    $script:healthRefreshRunspace.Open()
    $script:healthRefreshPs = [powershell]::Create()
    $script:healthRefreshPs.Runspace = $script:healthRefreshRunspace
    $null = $script:healthRefreshPs.AddScript({
      param($HealthScript, $NotifierPort)
      . $HealthScript
      Get-OpsNotifierLayerHealth -NotifierPort $NotifierPort
    }).AddArgument($healthScriptPath).AddArgument($portInt)
    $script:healthRefreshAsync = $script:healthRefreshPs.BeginInvoke()
  } catch {
    $script:healthRefreshBusy = $false
    Write-NotifierLog "health async start failed: $($_.Exception.Message)"
    try {
      Apply-TrayHealth (Get-OpsNotifierLayerHealth -NotifierPort $portInt)
    } catch { }
  }
}

function Poll-TrayHealthRefresh {
  if (-not $script:healthRefreshBusy -or -not $script:healthRefreshAsync) { return }
  if (-not $script:healthRefreshAsync.IsCompleted) { return }
  try {
    $result = $script:healthRefreshPs.EndInvoke($script:healthRefreshAsync)
    if ($result) { Apply-TrayHealth $result }
  } catch {
    Write-NotifierLog "health async poll failed: $($_.Exception.Message)"
  } finally {
    $script:healthRefreshBusy = $false
    try { $script:healthRefreshPs.Dispose() } catch { }
    $script:healthRefreshPs = $null
    if ($script:healthRefreshRunspace) {
      try { $script:healthRefreshRunspace.Close() } catch { }
      $script:healthRefreshRunspace.Dispose()
      $script:healthRefreshRunspace = $null
    }
  }
}

function Refresh-TrayHealth {
  param([bool]$Force = $false)
  Start-TrayHealthRefresh -Force $Force
}

function Get-OpsTrayLayerActionHeadline {
  param(
    [string]$Layer,
    [string]$Action,
    [bool]$Ok = $true
  )
  $layerLabels = @{
    frontend = 'Frontend'
    backend = 'Backend'
    database = 'Banco'
    observability = 'Observabilidade'
    notifier = 'Notificador'
  }
  $actionLabels = @{
    start = 'Iniciar'
    restart = 'Reiniciar'
    stop = 'Parar'
    log = 'Ver log'
  }
  $ln = if ($layerLabels.ContainsKey($Layer)) { $layerLabels[$Layer] } else { $Layer }
  $an = if ($actionLabels.ContainsKey($Action)) { $actionLabels[$Action] } else { $Action }
  if ($Ok) { return "$an $ln" }
  return "Falha ao $an $ln"
}

function Invoke-TrayUiSafe {
  param(
    [scriptblock]$Action,
    [string]$Context = 'acao'
  )
  try {
    & $Action
  } catch {
    $msg = $_.Exception.Message
    Write-NotifierLog "ui $Context failed: $msg"
    try {
      Show-OpsTrayBalloon -Kind 'system' -Headline 'Erro' -Body $msg -ContextLine $Context -IconName 'warning' -Ok $false -NotifyIcon $icon
    } catch { }
  }
}

function Complete-LayerControlResult {
  param($Result)
  if (-not $Result) { return }
  try {
    Show-OpsTrayBalloon -Kind 'farol' `
      -Headline (Get-OpsTrayLayerActionHeadline -Layer $Result.layer -Action $Result.action -Ok ([bool]$Result.ok)) `
      -Body ([string]$Result.message) `
      -ContextLine 'Acao local' `
      -Tier ([string]$Result.tier) `
      -Ok ([bool]$Result.ok) `
      -NotifyIcon $icon
  } catch { }
  Write-NotifierLog "layer $($Result.layer) $($Result.action): $($Result.message)"
  Start-TrayHealthRefresh -Force $true
}

function Start-LayerControlAsync {
  param(
    [string]$Layer,
    [string]$Action
  )

  if ($script:layerControlBusy) {
    try {
      Show-OpsTrayBalloon -Kind 'system' -Headline 'Aguarde' -Body 'Acao anterior em andamento.' -ContextLine 'Fila ocupada' -IconName 'warning' -NotifyIcon $icon -TimeoutMs 5000
    } catch { }
    return
  }

  if ($Layer -eq 'notifier' -and ($Action -eq 'restart' -or $Action -eq 'stop')) {
    try {
      Show-OpsTrayBalloon -Kind 'farol' -Headline (Get-OpsTrayLayerActionHeadline -Layer $Layer -Action $Action) -Body 'Processo separado' -ContextLine 'Notificador' -Tier $tierLabel -NotifyIcon $icon -TimeoutMs 5000
    } catch { }
    Start-OpsTrayHiddenScript -ScriptPath $layerControlScript -ScriptArgs @(
      '-NotifierPort', $portInt,
      '-Layer', $Layer,
      '-Action', $Action,
      '-Json'
    )
    return
  }

  $script:layerControlPending = @{ layer = $Layer; action = $Action }
  $script:layerControlBusy = $true
  try {
    Show-OpsTrayBalloon -Kind 'farol' -Headline (Get-OpsTrayLayerActionHeadline -Layer $Layer -Action $Action) -Body 'Executando...' -ContextLine 'Solicitado' -Tier $tierLabel -NotifyIcon $icon -TimeoutMs 5000
  } catch { }

  try {
    if ($script:layerControlPs) {
      try { $script:layerControlPs.Dispose() } catch { }
      $script:layerControlPs = $null
    }
    if ($script:layerControlRunspace) {
      try { $script:layerControlRunspace.Close() } catch { }
      $script:layerControlRunspace.Dispose()
      $script:layerControlRunspace = $null
    }

    $script:layerControlRunspace = [runspacefactory]::CreateRunspace()
    $script:layerControlRunspace.Open()
    $script:layerControlPs = [powershell]::Create()
    $script:layerControlPs.Runspace = $script:layerControlRunspace
    $null = $script:layerControlPs.AddScript({
      param($ControlScript, $NotifierPort, $Layer, $Action)
      $raw = & $ControlScript -NotifierPort $NotifierPort -Layer $Layer -Action $Action -Json 2>&1 | Out-String
      return $raw
    }).AddArgument($layerControlScript).AddArgument($portInt).AddArgument($Layer).AddArgument($Action)
    $script:layerControlAsync = $script:layerControlPs.BeginInvoke()
  } catch {
    $script:layerControlBusy = $false
    $script:layerControlPending = $null
    Write-NotifierLog "layer async start failed: $($_.Exception.Message)"
    try {
      Show-OpsTrayBalloon -Kind 'farol' -Headline (Get-OpsTrayLayerActionHeadline -Layer $Layer -Action $Action -Ok $false) -Body 'Nao foi possivel iniciar a acao' -Tier $tierLabel -IconName 'warning' -Ok $false -NotifyIcon $icon
    } catch { }
  }
}

function Poll-LayerControlAsync {
  if (-not $script:layerControlBusy -or -not $script:layerControlAsync) { return }
  if (-not $script:layerControlAsync.IsCompleted) { return }
  try {
    $raw = $script:layerControlPs.EndInvoke($script:layerControlAsync)
    $result = ConvertFrom-OpsTrayJson $raw
    Complete-LayerControlResult $result
  } catch {
    $pending = $script:layerControlPending
    $label = if ($pending) { "$($pending.action) $($pending.layer)" } else { 'camada' }
    Write-NotifierLog "layer async poll failed: $($_.Exception.Message)"
    try {
      Show-OpsTrayBalloon -Kind 'farol' -Headline 'Erro na acao' -Body $_.Exception.Message -ContextLine $label -IconName 'warning' -Ok $false -NotifyIcon $icon
    } catch { }
  } finally {
    $script:layerControlBusy = $false
    $script:layerControlPending = $null
    try { $script:layerControlPs.Dispose() } catch { }
    $script:layerControlPs = $null
    if ($script:layerControlRunspace) {
      try { $script:layerControlRunspace.Close() } catch { }
      $script:layerControlRunspace.Dispose()
      $script:layerControlRunspace = $null
    }
  }
}

function Invoke-OpsTrayLayerAction {
  param(
    [string]$Layer,
    [string]$Action
  )
  Invoke-LayerControl -Layer $Layer -Action $Action
}

function Invoke-LayerControl {
  param(
    [string]$Layer,
    [string]$Action
  )
  Invoke-TrayUiSafe {
    Start-LayerControlAsync -Layer $Layer -Action $Action
  } "$Action camada $Layer"
}

function Open-Observability {
  $consoleUrl = "http://127.0.0.1:$opsConsolePort"
  try {
    $h = Invoke-RestMethod -Uri "$consoleUrl/health" -TimeoutSec 2 -ErrorAction Stop
    if ($h.service -ne 'aiyracare-ops-console') { throw 'not ops-console' }
    Start-OpsTrayUrl $consoleUrl
    return
  } catch {
    Write-NotifierLog "observability down ($($_.Exception.Message)), restarting console"
  }

  Start-OpsTrayHiddenScript -ScriptPath $opsConsoleUpScript
  Start-Sleep -Seconds 3
  Start-OpsTrayUrl $consoleUrl
}

function Open-AiyraApp {
  $url = Normalize-OpsLocalServiceUrl -Url $aiyraAppUrl -FallbackPort ([int]$webPort)
  Start-OpsTrayUrl $url
}

function Run-AlertsCheck {
  $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if (-not $npm) {
    throw 'npm nao encontrado no PATH'
  }
  $cmd = "cd /d `"$root`" && npm run ops:alerts-check"
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WindowStyle Hidden -ErrorAction Stop | Out-Null
}

function Restart-OpsConsole {
  Start-OpsTrayHiddenScript -ScriptPath $opsConsoleUpScript
  Show-OpsTrayBalloon -Kind 'system' -Headline 'Console reiniciando' -Body ":$opsConsolePort" -Tier $tierLabel -NotifyIcon $icon -TimeoutMs 6000
  Write-NotifierLog 'ops-console restart requested'
}

function Show-StackStatus {
  Start-OpsTrayHiddenScript -ScriptPath $stackScript -ScriptArgs @('-Action', 'status')
}

function Stop-Notifier {
  Write-NotifierLog 'exit requested'
  $timer.Stop()
  $healthTimer.Stop()
  $healthPollTimer.Stop()
  if ($sync.Listener) {
    try { $sync.Listener.Stop() } catch { }
    try { $sync.Listener.Close() } catch { }
  }
  try { $ps.Stop() } catch { }
  try { $runspace.Close() } catch { }
  $icon.Visible = $false
  $icon.Dispose()
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  try {
    if ($mutexAcquired) { $instanceMutex.ReleaseMutex() }
  } catch { }
  try { $instanceMutex.Dispose() } catch { }
  [System.Windows.Forms.Application]::Exit()
}

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$menu.ImageScalingSize = New-Object System.Drawing.Size 16, 16
$menu.ShowImageMargin = $true
$menu.ShowItemToolTips = $true

$headerItem = New-OpsTrayMenuItem -Text "$tierLabel - verificando..." -Enabled $true
$headerItem.Name = 'farol-header'
try {
  $headerItem.Font = New-Object System.Drawing.Font($headerItem.Font.FontFamily, $headerItem.Font.Size, [System.Drawing.FontStyle]::Bold)
} catch { }
$menu.Items.Add($headerItem) | Out-Null

$layerKeys = @('frontend', 'backend', 'database', 'observability', 'notifier')
$layerLabels = @{
  frontend = 'Frontend'
  backend = 'Backend'
  database = 'Banco'
  observability = 'Observabilidade'
  notifier = 'Notificador'
}
$layerPorts = @{
  frontend = [int]$webPort
  backend = [int]$apiPort
  database = [int]$apiPort
  observability = [int]$opsConsolePort
  notifier = $portInt
}
foreach ($key in $layerKeys) {
  $item = New-OpsTrayFarolLayerMenuItem -Name "farol-$key" -Label $layerLabels[$key] -Port $layerPorts[$key]
  $menu.Items.Add($item) | Out-Null
}

$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

$actionObs = New-OpsTrayMenuItem -Text "Observabilidade (:$opsConsolePort)" -Image (New-OpsTrayGlyphBitmap '📊') -OnClick { Invoke-TrayUiSafe { Open-Observability } 'abrir observabilidade' }
$actionObs.Name = 'observability'
$menu.Items.Add($actionObs) | Out-Null

$actionApp = New-OpsTrayMenuItem -Text "App Aiyra (:$webPort)" -Image (New-OpsTrayGlyphBitmap '🌐', '#ECFDF5') -OnClick { Invoke-TrayUiSafe { Open-AiyraApp } 'abrir app' }
$actionApp.Name = 'app'
$menu.Items.Add($actionApp) | Out-Null

$actionCheck = New-OpsTrayMenuItem -Text 'Verificar alertas agora' -Image (New-OpsTrayGlyphBitmap '⚡', '#FEF3C7') -OnClick { Invoke-TrayUiSafe { Run-AlertsCheck } 'verificar alertas' }
$actionCheck.Name = 'check'
$menu.Items.Add($actionCheck) | Out-Null

$actionRestart = New-OpsTrayMenuItem -Text 'Reiniciar console ops' -Image (New-OpsTrayGlyphBitmap '🔄', '#E0E7FF') -OnClick { Invoke-TrayUiSafe { Restart-OpsConsole } 'reiniciar console' }
$actionRestart.Name = 'restart-console'
$menu.Items.Add($actionRestart) | Out-Null

$actionStack = New-OpsTrayMenuItem -Text "Status stack API/Web (:$apiPort/:$webPort)" -Image (New-OpsTrayGlyphBitmap '📡', '#F1F5F9') -OnClick { Invoke-TrayUiSafe { Show-StackStatus } 'status stack' }
$actionStack.Name = 'stack'
$menu.Items.Add($actionStack) | Out-Null

$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

$actionRefresh = New-OpsTrayMenuItem -Text 'Atualizar farol' -Image (New-OpsTrayGlyphBitmap '🔍', '#F5F3FF') -OnClick { Refresh-TrayHealth -Force $true }
$actionRefresh.Name = 'refresh-farol'
$menu.Items.Add($actionRefresh) | Out-Null

$actionExit = New-OpsTrayMenuItem -Text 'Sair' -Image (New-OpsTrayGlyphBitmap '🚪', '#FEE2E2') -OnClick { Stop-Notifier }
$actionExit.Name = 'exit'
$menu.Items.Add($actionExit) | Out-Null

$menu.Add_Opening({
  try {
    if ($script:healthCache) {
      Apply-TrayHealth $script:healthCache
    }
    Start-TrayHealthRefresh -Force $true
  } catch {
    Write-NotifierLog "menu opening failed: $($_.Exception.Message)"
  }
})

$icon.ContextMenuStrip = $menu
$icon.Add_DoubleClick({ Invoke-TrayUiSafe { Open-Observability } 'abrir observabilidade' })

$healthPollTimer = New-Object System.Windows.Forms.Timer
$healthPollTimer.Interval = 250
$healthPollTimer.Add_Tick({
  Poll-TrayHealthRefresh
  Poll-LayerControlAsync
})
$healthPollTimer.Start()

$healthTimer = New-Object System.Windows.Forms.Timer
$healthTimer.Interval = 30000
$healthTimer.Add_Tick({ Start-TrayHealthRefresh })
$healthTimer.Start()
Start-TrayHealthRefresh -Force $true

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400
$timer.Add_Tick({
  $payload = $null
  while ($queue.TryDequeue([ref]$payload)) {
    try {
      $json = $payload | ConvertFrom-Json
      $toast = Resolve-OpsToastFromPayload -Json $json
      Show-OpsTrayBalloon -Kind $toast.Kind -Headline $toast.Headline -Body $toast.Body -ContextLine $toast.ContextLine -IconName $toast.IconName -NotifyIcon $icon -TimeoutMs 12000
      $profile = Get-OpsToastKindProfile $toast.Kind
      $url = [string]$json.dashboardUrl
      if ($openBrowser -and $profile.opensBrowser) {
        if ($url) {
          try {
            Start-OpsTrayUrl $url
          } catch {
            Write-NotifierLog "alert browser open failed: $($_.Exception.Message)"
            Invoke-TrayUiSafe { Open-Observability } 'abrir observabilidade'
          }
        } else {
          Invoke-TrayUiSafe { Open-Observability } 'abrir observabilidade'
        }
      } else {
        Write-NotifierLog "browser open skipped (OPS_LOCAL_NOTIFIER_OPEN=0)"
      }
    } catch {
      Write-NotifierLog "bad alert payload: $($_.Exception.Message)"
    }
  }
})
$timer.Start()

Show-OpsTrayBalloon -Kind 'system' -Headline 'Notificador ativo' -Body $observabilityUrl -ContextLine 'Pronto' -NotifyIcon $icon -TimeoutMs 8000
Write-NotifierLog "tray started observability=$observabilityUrl webhook=http://127.0.0.1:$port$alertPath"

[System.Windows.Forms.Application]::Run()
