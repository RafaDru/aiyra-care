param([switch]$Cloud)

$root = Split-Path $PSScriptRoot -Parent
$apiDir = Join-Path $root "packages\api"
$webDir = Join-Path $root "packages\web"

Write-Host "Starting API..." -NoNewline
$apiPort = 3010
$logApi = Join-Path $root "api.log"
$cmdApi = "set PORT=$apiPort&&set DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/openhealth&&cd /d $apiDir&&npx tsx watch src/index.ts >`"$logApi`" 2>&1"
cmd /c "start /B cmd /c `"$cmdApi`""

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -ErrorAction Stop
    if ($h.service -eq 'aiyracare-api' -or $h.service -eq 'open-health-api') { Write-Host " OK ($($h.status))" -ForegroundColor Green; break }
    Write-Host "." -NoNewline
  }
  catch { Write-Host "." -NoNewline; if ($i -eq 11) { Write-Host " FAIL" -ForegroundColor Red } }
}

Write-Host "Starting Web..." -NoNewline
$logWeb = Join-Path $root "web.log"
$cmdWeb = "cd /d $webDir&&npx vite --host 0.0.0.0 >`"$logWeb`" 2>&1"
cmd /c "start /B cmd /c `"$cmdWeb`""

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep 1
  try { $code = (Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2).StatusCode; Write-Host " OK ($code)" -ForegroundColor Green; break }
  catch { Write-Host "." -NoNewline; if ($i -eq 11) { Write-Host " FAIL" -ForegroundColor Red } }
}

Write-Host @"
`nAiyraCare running:
  API  http://127.0.0.1:$apiPort/health
  Web  http://localhost:5173
  Logs api.log / web.log
"@

Start-Process "http://localhost:5173/login"
