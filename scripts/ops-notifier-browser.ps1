# Browser open dedup for ops tray / local notifier (Windows).

param(
  [ValidateSet('open-if-needed')]
  [string]$Action = '',
  [string]$Url = ''
)

function Initialize-OpsNotifierBrowserHelpers {
  if (-not (Get-Command Normalize-OpsTrayUrl -ErrorAction SilentlyContinue)) {
    $trayUi = Join-Path $PSScriptRoot 'ops-notifier-tray-ui.ps1'
    if (Test-Path -LiteralPath $trayUi) {
      . $trayUi
    }
  }
}

$script:OpsTrayLastBrowserOpenAt = @{}

function Get-OpsBrowserMatchNeedles {
  param([string]$Url)

  $u = Normalize-OpsTrayUrl $Url
  if (-not $u) {
    return @{ titleNeedles = @(); commandNeedles = @(); isOpsConsole = $false }
  }

  try {
    $parsed = [Uri]$u
    $host = $parsed.Host.ToLowerInvariant()
    if ($host -ne '127.0.0.1' -and $host -ne 'localhost' -and -not $host.EndsWith('.aiyracare.test')) {
      return @{ titleNeedles = @(); commandNeedles = @(); isOpsConsole = $false }
    }

    $port = if ($parsed.Port -gt 0) { $parsed.Port } else { 80 }
    $isOpsConsole = ($port -eq 3013 -or $port -eq 3023)

    $commandNeedles = @(
      "${host}:$port",
      "127.0.0.1:$port",
      "localhost:$port",
      ":$port/",
      ":$port`?"
    )
    $titleNeedles = @(":$port", "${host}:$port")
    if ($isOpsConsole) {
      $titleNeedles += 'Observabilidade'
    }

    return @{
      titleNeedles = $titleNeedles
      commandNeedles = $commandNeedles
      isOpsConsole = $isOpsConsole
    }
  } catch {
    return @{ titleNeedles = @(); commandNeedles = @(); isOpsConsole = $false }
  }
}

function Test-OpsBrowserNeedleMatch {
  param(
    [string]$Haystack,
    [string[]]$Needles
  )
  if ([string]::IsNullOrWhiteSpace($Haystack)) { return $false }
  foreach ($needle in $Needles) {
    if ($Haystack -like "*$needle*") { return $true }
  }
  return $false
}

function Test-OpsBrowserUrlOpen {
  param([string]$Url)

  $needles = Get-OpsBrowserMatchNeedles -Url $Url
  if (-not $needles.commandNeedles -or $needles.commandNeedles.Count -eq 0) {
    return $false
  }

  $browserNames = @('chrome', 'msedge', 'brave', 'firefox', 'opera', 'vivaldi')
  foreach ($name in $browserNames) {
    $procs = @(Get-Process -Name $name -ErrorAction SilentlyContinue)
    foreach ($proc in $procs) {
      if (Test-OpsBrowserNeedleMatch -Haystack $proc.MainWindowTitle -Needles $needles.titleNeedles) {
        return $true
      }
    }
  }

  $browserExes = @('chrome.exe', 'msedge.exe', 'brave.exe', 'firefox.exe', 'opera.exe', 'vivaldi.exe')
  $cim = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $browserExes -contains $_.Name -and $_.CommandLine })
  foreach ($proc in $cim) {
    if (Test-OpsBrowserNeedleMatch -Haystack $proc.CommandLine -Needles $needles.commandNeedles) {
      return $true
    }
  }

  return $false
}

function Start-OpsBrowserUrlIfNeeded {
  param(
    [string]$Url,
    [switch]$Force
  )

  $u = Normalize-OpsTrayUrl $Url
  if (-not $u) { throw 'URL vazia' }

  $portKey = 'url'
  try {
    $parsed = [Uri]$u
    if ($parsed.Port -gt 0) { $portKey = [string]$parsed.Port }
  } catch { }

  if (-not $Force) {
    if (Test-OpsBrowserUrlOpen -Url $u) {
      return @{ opened = $false; reason = 'already_open'; url = $u }
    }
    if ($script:OpsTrayLastBrowserOpenAt.ContainsKey($portKey)) {
      $ago = (Get-Date) - $script:OpsTrayLastBrowserOpenAt[$portKey]
      if ($ago.TotalSeconds -lt 8) {
        return @{ opened = $false; reason = 'debounce'; url = $u }
      }
    }
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $u
  $psi.UseShellExecute = $true
  [void][System.Diagnostics.Process]::Start($psi)
  $script:OpsTrayLastBrowserOpenAt[$portKey] = Get-Date
  return @{ opened = $true; reason = 'launched'; url = $u }
}

if ($Action -eq 'open-if-needed') {
  Initialize-OpsNotifierBrowserHelpers
  if ([string]::IsNullOrWhiteSpace($Url)) {
    Write-Error 'Url obrigatoria'
    exit 2
  }
  $outcome = Start-OpsBrowserUrlIfNeeded -Url $Url
  if ($outcome.opened) {
    Write-Output 'opened'
    exit 0
  }
  Write-Output "skipped:$($outcome.reason)"
  exit 0
}
