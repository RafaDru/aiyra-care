# Reinicia Metro LAN (--clear) sem interação. API :3010 deve estar UP.
$ErrorActionPreference = 'Stop'
$conn = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conn) {
  if ($c.OwningProcess -gt 0) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 2
$script = Join-Path $PSScriptRoot 'mobile-street-up.ps1'
Start-Process powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $script, '-Mode', 'lan' -WindowStyle Hidden
Write-Host 'Metro LAN reiniciando (packages/mobile/.expo-lan-log.txt)' -ForegroundColor Green
