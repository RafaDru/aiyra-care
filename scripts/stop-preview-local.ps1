# Encerra listeners do preview local (Ambiente 2): API 3020, web 5174, ops-console 3023.
$ErrorActionPreference = 'SilentlyContinue'
$ports = @(3020, 5174, 3023)
foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    if ($c.OwningProcess -gt 0) {
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}
Start-Sleep -Seconds 1
Write-Host "Preview ports stopped: $($ports -join ', ')" -ForegroundColor Cyan
