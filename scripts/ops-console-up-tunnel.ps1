$root = Split-Path $PSScriptRoot -Parent
& (Join-Path $PSScriptRoot 'import-dotenv.ps1') -Path (Join-Path $root '.env')
Remove-Item Env:OPS_ALERT_DASHBOARD_URL -ErrorAction SilentlyContinue
if (-not $env:OPS_CONSOLE_PUBLIC_URL) {
  Write-Error 'OPS_CONSOLE_PUBLIC_URL must be set in .env'
  exit 1
}
$opsConsoleDir = Join-Path $root 'packages\ops-console'
$port = if ($env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT } else { 3013 }
Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }
Start-Sleep -Milliseconds 800
$log = Join-Path $root 'ops-console.log'
$cmd = "cd /d `"$opsConsoleDir`"&&npx tsx src/server.ts >`"$log`" 2>&1"
cmd /c "start /B cmd /c `"$cmd`""
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health" -ErrorAction Stop
    if ($h.service -eq 'aiyracare-ops-console') {
      Write-Host "Ops console OK (callback base: $($env:OPS_CONSOLE_PUBLIC_URL))"
      exit 0
    }
  } catch { }
}
exit 1
