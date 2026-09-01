# AiyraCare ops — ícone na bandeja do sistema + receptor HTTP local.
# Windows: preferir este script em vez de ops-local-notifier.mjs (node headless).
param()

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$iconPath = Join-Path $root 'packages\web\public\brand\logo-icon.png'
$logFile = Join-Path $root 'ops-notifier.log'
$dashboardUrl = if ($env:OPS_ALERT_DASHBOARD_URL) { $env:OPS_ALERT_DASHBOARD_URL.Trim() } else { 'http://localhost:5173/ops' }
$port = if ($env:OPS_LOCAL_NOTIFIER_PORT) { $env:OPS_LOCAL_NOTIFIER_PORT.Trim() } else { '3012' }
$alertPath = if ($env:OPS_LOCAL_NOTIFIER_PATH) { $env:OPS_LOCAL_NOTIFIER_PATH.Trim() } else { '/ops-alert' }
if (-not $alertPath.StartsWith('/')) { $alertPath = "/$alertPath" }

function Write-NotifierLog([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $logFile -Value $line -Encoding utf8
}

if (-not (Test-Path $iconPath)) {
  Write-NotifierLog "icon missing: $iconPath"
  throw "Ícone não encontrado: $iconPath"
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
$icon.Text = 'AiyraCare Ops — notificador'
$icon.Visible = $true

function Open-Dashboard {
  Start-Process $dashboardUrl
}

function Run-AlertsCheck {
  $cmd = "cd /d `"$root`" && npm run ops:alerts-check"
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -WindowStyle Hidden
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
$menu.Items.Add('Dashboard Ops', $null, { Open-Dashboard }).Name = 'dashboard'
$menu.Items.Add('Verificar alertas agora', $null, { Run-AlertsCheck }).Name = 'check'
$menu.Items.Add('Sair', $null, { Stop-Notifier }).Name = 'exit'
$icon.ContextMenuStrip = $menu
$icon.Add_DoubleClick({ Open-Dashboard })

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
      if ($url) { Start-Process $url }
    } catch {
      Write-NotifierLog "bad alert payload: $($_.Exception.Message)"
    }
  }
})
$timer.Start()

$icon.ShowBalloonTip(6000, 'AiyraCare Ops', 'Notificador ativo na bandeja do sistema', [System.Windows.Forms.ToolTipIcon]::Info)
Write-NotifierLog 'tray started'

[System.Windows.Forms.Application]::Run()
