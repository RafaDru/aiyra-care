param(
  [string]$Title = 'AiyraCare Ops',
  [string]$Body = '',
  [string]$BodyFile = '',
  [ValidateSet('Error', 'Warning', 'Info', 'None')]
  [string]$IconType = 'Warning'
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if ($BodyFile -and (Test-Path -LiteralPath $BodyFile)) {
  $utf8 = New-Object System.Text.UTF8Encoding $false
  $Body = [System.IO.File]::ReadAllText($BodyFile, $utf8)
  Remove-Item -LiteralPath $BodyFile -Force -ErrorAction SilentlyContinue
}

$Body = ($Body -replace "`r`n", "`n").Trim()
if ($Body.Length -gt 255) {
  $Body = $Body.Substring(0, 252) + '...'
}

$Title = ($Title -replace "`r`n", ' ').Trim()
if ($Title.Length -gt 63) {
  $Title = $Title.Substring(0, 60) + '...'
}

$tipIcon = [System.Windows.Forms.ToolTipIcon]::Warning
switch ($IconType) {
  'Error' { $tipIcon = [System.Windows.Forms.ToolTipIcon]::Error }
  'Info' { $tipIcon = [System.Windows.Forms.ToolTipIcon]::Info }
  'None' { $tipIcon = [System.Windows.Forms.ToolTipIcon]::None }
  'Warning' { $tipIcon = [System.Windows.Forms.ToolTipIcon]::Warning }
}

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
switch ($IconType) {
  'Error' { $notify.Icon = [System.Drawing.SystemIcons]::Error }
  'Warning' { $notify.Icon = [System.Drawing.SystemIcons]::Warning }
  'Info' { $notify.Icon = [System.Drawing.SystemIcons]::Information }
  'None' { $notify.Icon = [System.Drawing.SystemIcons]::Application }
}

$notify.Visible = $true
$notify.ShowBalloonTip(12000, $Title, $Body, $tipIcon)
Start-Sleep -Seconds 2
$notify.Dispose()
