param([switch]$Cloud)

$root = Split-Path $PSScriptRoot -Parent
$apiDir = Join-Path $root "packages\api"
$webDir = Join-Path $root "packages\web"

Write-Host "Starting API..." -NoNewline
$logApi = Join-Path $root "api.log"
$cmdApi = "set PORT=3000&&set DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/openhealth&&cd /d $apiDir&&npx tsx watch src/index.ts >`"$logApi`" 2>&1"
cmd /c "start /B cmd /c `"$cmdApi`""

Start-Sleep 4
try {
  $h = Invoke-RestMethod -Uri "http://localhost:3000/health" -ErrorAction Stop
  Write-Host " OK ($($h.status))" -ForegroundColor Green
} catch {
  Write-Host " FAIL" -ForegroundColor Red
}

Write-Host "Starting Web..." -NoNewline
$logWeb = Join-Path $root "web.log"
$cmdWeb = "cd /d $webDir&&npx vite --host 0.0.0.0 >`"$logWeb`" 2>&1"
cmd /c "start /B cmd /c `"$cmdWeb`""

Start-Sleep 4
try {
  $code = (Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3).StatusCode
  Write-Host " OK ($code)" -ForegroundColor Green
} catch {
  Write-Host " FAIL" -ForegroundColor Red
}

Write-Host @"
`nOpen Health running:
  API  http://localhost:3000/health
  Web  http://localhost:5173
  Logs api.log / web.log
"@
