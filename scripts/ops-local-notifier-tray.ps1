# AiyraCare ops — ícone na bandeja + receptor HTTP local (:3012/ops-alert).
# Dashboard de observabilidade: console independente :3013 (não o app :5173/ops).
param()

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$iconPath = Join-Path $root 'packages\web\public\brand\logo-icon.png'
$logFile = Join-Path $root 'ops-notifier.log'
$port = if ($env:OPS_LOCAL_NOTIFIER_PORT) { $env:OPS_LOCAL_NOTIFIER_PORT.Trim() } else { '3012' }
$alertPath = if ($env:OPS_LOCAL_NOTIFIER_PATH) { $env:OPS_LOCAL_NOTIFIER_PATH.Trim() } else { '/ops-alert' }
if (-not $alertPath.StartsWith('/')) { $alertPath = "/$alertPath" }

$envFile = Join-Path $root '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
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
  $explicit = $env:OPS_ALERT_DASHBOARD_URL
  if ($explicit -and $explicit.Trim()) {
    $url = $explicit.Trim()
    if ($url.EndsWith('/')) { $url = $url.Substring(0, $url.Length - 1) }
    # Legado: dashboard embutido no app antes do ops-console independente
    if ($url -match ':5173/ops$') {
      Write-NotifierLog "legacy dashboard URL ignored: $url"
      $consolePort = if ($env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT.Trim() } else { '3013' }
      return "http://127.0.0.1:$consolePort"
    }
    return $url
  }
  $consolePort = if ($env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT.Trim() } else { '3013' }
  return "http://127.0.0.1:$consolePort"
}

function Resolve-AiyraAppUrl {
  $web = $env:LANDING_CAPTURE_WEB_URL
  if ($web -and $web.Trim()) {
    $url = $web.Trim()
    if ($url.EndsWith('/')) { $url = $url.Substring(0, $url.Length - 1) }
    return $url
  }
  return 'http://localhost:5173'
}

$observabilityUrl = Resolve-ObservabilityUrl
$aiyraAppUrl = Resolve-AiyraAppUrl
$opsConsoleUpScript = Join-Path $root 'scripts\ops-console-up.ps1'
$stackScript = Join-Path $root 'scripts\aiyracare-stack.ps1'

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
        $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
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
$icon = New-Object System.Windows.Forms.NotifyIcon
$icon.Icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$icon.Text = 'AiyraCare Ops - observabilidade'
$icon.Visible = $true

function Open-Observability {
  try {
    $h = Invoke-RestMethod -Uri "$observabilityUrl/health" -TimeoutSec 2 -ErrorAction Stop
    if ($h.service -ne 'aiyracare-ops-console') { throw 'not ops-console' }
    Start-Process $observabilityUrl
  } catch {
    Write-NotifierLog "observability down, restarting console"
    Start-Process powershell -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $opsConsoleUpScript
    ) -WindowStyle Hidden
    Start-Sleep 3
    Start-Process $observabilityUrl
  }
}

function Open-AiyraApp {
  Start-Process $aiyraAppUrl
}

function Run-AlertsCheck {
  $cmd = "cd /d `"$root`" && npm run ops:alerts-check"
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WindowStyle Hidden
}

function Restart-OpsConsole {
  Start-Process powershell -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $opsConsoleUpScript
  ) -WindowStyle Hidden
  $icon.ShowBalloonTip(6000, 'AiyraCare Ops', 'Console observabilidade reiniciando (:3013)', [System.Windows.Forms.ToolTipIcon]::Info)
  Write-NotifierLog 'ops-console restart requested'
}

function Show-StackStatus {
  Start-Process powershell -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $stackScript, '-Action', 'status'
  )
}

function Stop-Notifier {
  Write-NotifierLog 'exit requested'
  $timer.Stop()
  if ($sync.Listener) {
    try { $sync.Listener.Stop() } catch { }
    try { $sync.Listener.Close() } catch { }
  }
  try { $ps.Stop() } catch { }
  try { $runspace.Close() } catch { }
  $icon.Visible = $false
  $icon.Dispose()
  [System.Windows.Forms.Application]::Exit()
}

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$menu.Items.Add('Observabilidade (:3013)', $null, { Open-Observability }).Name = 'observability'
$menu.Items.Add('App Aiyra (:5173)', $null, { Open-AiyraApp }).Name = 'app'
$menu.Items.Add('Verificar alertas agora', $null, { Run-AlertsCheck }).Name = 'check'
$menu.Items.Add('Reiniciar console ops', $null, { Restart-OpsConsole }).Name = 'restart-console'
$menu.Items.Add('Status stack API/Web', $null, { Show-StackStatus }).Name = 'stack'
$menu.Items.Add('Sair', $null, { Stop-Notifier }).Name = 'exit'
$icon.ContextMenuStrip = $menu
$icon.Add_DoubleClick({ Open-Observability })

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400
$timer.Add_Tick({
  $payload = $null
  while ($queue.TryDequeue([ref]$payload)) {
    try {
      $json = $payload | ConvertFrom-Json
      $text = [string]$json.text
      $line = ($text -split "`n" | Where-Object { $_.Trim().StartsWith('•') } | Select-Object -First 1)
      if (-not $line) { $line = ($text -split "`n" | Select-Object -First 1) }
      $line = $line.Trim()
      if ($line.Length -gt 240) { $line = $line.Substring(0, 240) }
      $icon.ShowBalloonTip(12000, 'AiyraCare Ops', $line, [System.Windows.Forms.ToolTipIcon]::Warning)
      $url = [string]$json.dashboardUrl
      if ($url) {
        Start-Process $url
      } else {
        Open-Observability
      }
    } catch {
      Write-NotifierLog "bad alert payload: $($_.Exception.Message)"
    }
  }
})
$timer.Start()

$icon.ShowBalloonTip(
  8000,
  'AiyraCare Ops',
  "Notificador ativo. Observabilidade: $observabilityUrl",
  [System.Windows.Forms.ToolTipIcon]::Info
)
Write-NotifierLog "tray started observability=$observabilityUrl webhook=http://127.0.0.1:$port$alertPath"

[System.Windows.Forms.Application]::Run()
