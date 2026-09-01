param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$Body
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Warning
$notify.Visible = $true
$notify.ShowBalloonTip(12000, $Title, $Body, [System.Windows.Forms.TooltipIcon]::Warning)
Start-Sleep -Seconds 2
$notify.Dispose()
