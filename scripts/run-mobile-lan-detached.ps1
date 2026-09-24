# Metro LAN em janela oculta; log em packages/mobile/.expo-lan-log.txt
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$log = Join-Path $root 'packages\mobile\.expo-lan-log.txt'
if (Test-Path $log) { Remove-Item $log -Force }
$runner = Join-Path $PSScriptRoot 'mobile-street-up.ps1'
$errLog = "$log.err"
Start-Process cmd.exe -ArgumentList @(
  '/c',
  "powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`" -Mode lan > `"$log`" 2> `"$errLog`""
) -WindowStyle Hidden
Write-Host "Metro LAN: $log"
