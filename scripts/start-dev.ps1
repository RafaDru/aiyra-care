param(
  [switch]$Cloud,
  [switch]$NoWeb
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

# ─── Load .env ────────────────────────────────────────────
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.+)$') {
      $k, $v = $matches[1], $matches[2]
      if ($v) { Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue }
    }
  }
  Write-Host ".env loaded" -ForegroundColor Cyan
} else {
  Write-Host "WARN: .env not found - run .\scripts\setup-env.ps1" -ForegroundColor Yellow
}

# ─── Dependency check ────────────────────────────────────
function Ensure-Deps {
  param($Dir, $Label)
  $lock = Join-Path $Dir "package-lock.json"
  $nodeModules = Join-Path $Dir "node_modules"
  if (-not (Test-Path $lock) -or -not (Test-Path $nodeModules)) {
    Write-Host "Installing $Label..." -ForegroundColor Yellow
    Push-Location $Dir
    npm install 2>&1 | Out-Null
    Pop-Location
  }
}

# ─── Port config ──────────────────────────────────────────
$apiPort = 3000
$webPort = 5173
$env:PORT = "$apiPort"
if (-not $Cloud) {
  $env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare"
  $env:NEO4J_URI = "bolt://localhost:7687"
  $env:NEO4J_USER = "neo4j"
}

# ─── Start API ────────────────────────────────────────────
$apiDir = Join-Path $root "packages\api"
Ensure-Deps $apiDir "API"

Write-Host "Starting API on port $apiPort ..." -NoNewline
$apiJob = Start-ThreadJob -ScriptBlock {
  param($Dir, $Port)
  $env:PORT = $Port
  Set-Location $Dir
  npx tsx watch src/index.ts 2>&1 | Out-Null
} -ArgumentList $apiDir, $apiPort

Start-Sleep 4
try {
  $h = Invoke-RestMethod -Uri "http://localhost:$apiPort/health" -ErrorAction Stop
  Write-Host " OK ($($h.status))" -ForegroundColor Green
} catch {
  Write-Host " FAIL" -ForegroundColor Red
  Receive-Job $apiJob | Write-Host
}

# ─── Start Web ────────────────────────────────────────────
if (-not $NoWeb) {
  $webDir = Join-Path $root "packages\web"
  Ensure-Deps $webDir "Web"

  Write-Host "Starting Web on port $webPort ..." -NoNewline
  $webJob = Start-ThreadJob -ScriptBlock {
    param($Dir)
    Set-Location $Dir
    npx vite --host 0.0.0.0 2>&1 | Out-Null
  } -ArgumentList $webDir

  Start-Sleep 3
  Write-Host " OK" -ForegroundColor Green
}

# ─── Summary ──────────────────────────────────────────────
Write-Host @"

╔══════════════════════════════════════════════╗
║            AiyraCare - Dev Mode            ║
╠══════════════════════════════════════════════╣
║  Frontend  http://localhost:$webPort         ║
║  API       http://localhost:$apiPort/health  ║
║  Health DB http://localhost:$apiPort/health/db  ║
╚══════════════════════════════════════════════╝

Press Ctrl+C to stop all services.
"@ -ForegroundColor Cyan

# ─── Keep running ─────────────────────────────────────────
try {
  while ($true) { Start-Sleep 10 }
} finally {
  Write-Host "Shutting down..." -ForegroundColor Yellow
  if ($apiJob) { Remove-Job $apiJob -Force -ErrorAction SilentlyContinue }
  if ($webJob) { Remove-Job $webJob -Force -ErrorAction SilentlyContinue }
  Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "tsx|vite" } | Stop-Process -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped." -ForegroundColor Green
}
