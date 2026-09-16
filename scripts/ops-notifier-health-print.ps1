. (Join-Path $PSScriptRoot 'ops-notifier-health.ps1')
$port = if ($args[0]) { [int]$args[0] } else { 3012 }
$h = Get-OpsNotifierLayerHealth -NotifierPort $port
foreach ($layer in $h.layers) {
  Write-Host ("{0,-14} {1,-5} :{2,-5} {3}" -f $layer.label, $layer.state, $layer.port, $layer.detail)
}
Write-Host ""
Write-Host ("Overall: {0} ({1}/{2})" -f $h.overall, $h.okCount, $h.layers.Count)
