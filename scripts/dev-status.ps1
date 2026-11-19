param(
  [int]$ApiPort = 3010,
  [int]$WebPort = 5173,
  [int]$OpsConsolePort = 3013,
  [int]$NotifierPort = 3012
)

function Test-HttpOk([string]$Url) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode
  } catch {
    return "DOWN"
  }
}

Write-Host "AiyraCare dev status"
Write-Host "  API ($ApiPort):     $(Test-HttpOk "http://127.0.0.1:$ApiPort/health")"
Write-Host "  Web ($WebPort):     $(Test-HttpOk "http://localhost:$WebPort")"
try {
  $lanIp = (
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceAlias -match 'Wi-?Fi' -and $_.IPAddress -notmatch '^169\.' } |
    Select-Object -First 1
  ).IPAddress
  if ($lanIp) {
    Write-Host "  Web LAN ($lanIp): $(Test-HttpOk "http://${lanIp}:$WebPort")  (celular: http://${lanIp}:$WebPort)"
  }
} catch { }
Write-Host "  Ops console ($OpsConsolePort): $(Test-HttpOk "http://127.0.0.1:$OpsConsolePort/health")"
Write-Host "  Notifier ($NotifierPort): $(Test-HttpOk "http://127.0.0.1:$NotifierPort/health")"
Write-Host "  Node processes:   $((Get-Process node -ErrorAction SilentlyContinue).Count)"
