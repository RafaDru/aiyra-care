param(
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$Body,
  [ValidateSet('Error', 'Warning', 'Info', 'None')]
  [string]$IconType = 'Warning',
  [string]$BodyFile = ''
)

$displayScript = Join-Path $PSScriptRoot 'ops-toast-display.ps1'
& $displayScript -Title $Title -Body $Body -BodyFile $BodyFile -IconType $IconType
