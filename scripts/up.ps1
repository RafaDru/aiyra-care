param([switch]$Cloud, [switch]$Preview)

$root = Split-Path $PSScriptRoot -Parent
$apiDir = Join-Path $root "packages\api"
$webDir = Join-Path $root "packages\web"
$importDotenv = Join-Path $PSScriptRoot 'import-dotenv.ps1'
$envFile = Join-Path $root '.env'
$envPreviewFile = Join-Path $root '.env.preview'
& $importDotenv -Path $envFile
if ($Preview -and (Test-Path $envPreviewFile)) {
  & $importDotenv -Path $envPreviewFile -Override
}

function Import-MachineEnvIfMissing {
  param([string]$Canonical, [string[]]$Aliases)
  if ([Environment]::GetEnvironmentVariable($Canonical, 'Process')) { return }
  foreach ($alias in $Aliases) {
    $v = [Environment]::GetEnvironmentVariable($alias, 'User')
    if (-not $v) { $v = [Environment]::GetEnvironmentVariable($alias, 'Machine') }
    if ($v) {
      Set-Item -Path "Env:$Canonical" -Value $v
      return
    }
  }
}

# LLM keys often live in Windows user env (not .env)
Import-MachineEnvIfMissing 'OPENCODE_GO_API_KEY' @('OPENCODEGO_API_KEY', 'OPENCODE_GO_API_KEY')
Import-MachineEnvIfMissing 'OPENCODE_ZEN_API_KEY' @('OPENCODE_ZEN_API_KEY', 'OPENCODEGO_API_KEY')
Import-MachineEnvIfMissing 'GEMINI_API_KEY' @('GEMINI_API_KEY')
Import-MachineEnvIfMissing 'GROQ_API_KEY' @('GROQ_API_KEY')

function Stop-ListenerOnPort {
  param([int]$Port)
  try {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      if ($c.OwningProcess -gt 0) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {
    # Get-NetTCPConnection pode falhar sem privilégios — ignorar
  }
}

function Get-GitHeadSha {
  param([string]$RepoPath)
  if (-not (Test-Path (Join-Path $RepoPath '.git'))) { return $null }
  $sha = (& git -C $RepoPath rev-parse HEAD 2>$null | Out-String).Trim()
  if (-not $sha -or $LASTEXITCODE -ne 0) { return $null }
  return $sha
}

function Test-GitIsAncestor {
  param([string]$RepoPath, [string]$AncestorSha, [string]$DescendantSha)
  if (-not $AncestorSha -or -not $DescendantSha) { return $false }
  if ($AncestorSha -eq $DescendantSha) { return $true }
  & git -C $RepoPath merge-base --is-ancestor $AncestorSha $DescendantSha 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

function Escape-CmdEnvSegment {
  param([string]$Value)
  if ($null -eq $Value) { return '' }
  return ($Value -replace '%', '%%' -replace '&', '^&')
}

function Get-ViteWebCmdEnvPrefix {
  param(
    [int]$ApiPort,
    [string]$OpsConsoleUrl
  )
  # Celular na LAN: VITE_API_URL=127.0.0.1 faz o browser chamar o localhost do aparelho.
  # Dev padrão: proxy Vite (BASE_URL vazio). Opt-in notebook-only: AIYRA_VITE_DIRECT_API=1 ou VITE_API_URL no ambiente.
  $viteApiSegment = ''
  if ($env:AIYRA_VITE_DIRECT_API -eq '1' -or $env:VITE_API_URL) {
    $apiUrl = if ($env:VITE_API_URL) { $env:VITE_API_URL } else { "http://127.0.0.1:$ApiPort" }
    $viteApiSegment = "set VITE_API_URL=$(Escape-CmdEnvSegment $apiUrl)&&"
  }
  $opsUrl = Escape-CmdEnvSegment $OpsConsoleUrl
  return "${viteApiSegment}set VITE_OPS_CONSOLE_URL=$opsUrl&&"
}

# Ops console script can block up.ps1 (CH worktree / tsx cold start). Boot async + cap wait so Web still starts.
function Start-OpsConsoleUpWithTimeout {
  param(
    [string]$ScriptPath,
    [int]$Port,
    [int]$TimeoutSec
  )
  if (-not (Test-Path $ScriptPath)) {
    Write-Host " skip (missing script)" -ForegroundColor Yellow
    return $false
  }
  $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
  Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WindowStyle Hidden | Out-Null
  for ($i = 0; $i -lt $TimeoutSec; $i++) {
    Start-Sleep 1
    try {
      $h = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -ErrorAction Stop
      if ($h.service -eq 'aiyracare-ops-console') {
        Write-Host " OK" -ForegroundColor Green
        return $true
      }
    } catch { }
  }
  Write-Host " skip (timeout ${TimeoutSec}s; stack continua)" -ForegroundColor Yellow
  return $false
}

# ch-shell só quando alinhado com main (mesmo SHA ou à frente). Atrás/divergente → checkout principal.
function Resolve-ChShellOpsConsoleUp {
  param(
    [string]$MainRoot,
    [string]$ChShellRoot,
    [string]$RootOpsUp
  )
  $forceMain = $env:AIYRA_OPS_CONSOLE_FROM_MAIN -eq '1'
  if ($forceMain) {
    return @{ Script = $RootOpsUp; UseChShell = $false; Reason = 'AIYRA_OPS_CONSOLE_FROM_MAIN=1' }
  }
  $chShellOpsUp = Join-Path $ChShellRoot 'scripts\ops-console-up.ps1'
  if (-not (Test-Path $chShellOpsUp)) {
    return @{ Script = $RootOpsUp; UseChShell = $false; Reason = 'missing' }
  }
  $mainSha = Get-GitHeadSha -RepoPath $MainRoot
  $shellSha = Get-GitHeadSha -RepoPath $ChShellRoot
  if (-not $mainSha -or -not $shellSha) {
    Write-Host "`n[CH] worktree sem HEAD git válido — ops-console do checkout principal." -ForegroundColor Yellow
    if ($mainSha) { Write-Host "  main=$mainSha" -ForegroundColor Yellow }
    if ($shellSha) { Write-Host "  ch-shell=$shellSha" -ForegroundColor Yellow }
    return @{ Script = $RootOpsUp; UseChShell = $false; Reason = 'invalid-git' }
  }
  if ($mainSha -eq $shellSha) {
    return @{ Script = $chShellOpsUp; UseChShell = $true; MainSha = $mainSha; ShellSha = $shellSha }
  }
  $shellBehind = Test-GitIsAncestor -RepoPath $MainRoot -AncestorSha $shellSha -DescendantSha $mainSha
  $shellAhead = Test-GitIsAncestor -RepoPath $MainRoot -AncestorSha $mainSha -DescendantSha $shellSha
  if ($shellBehind) {
    Write-Host "`n[CH] ch-shell ATRÁS do repo principal — ops-console do checkout principal (evita UI antiga)." -ForegroundColor Yellow
    Write-Host "  main=$mainSha  ch-shell=$shellSha" -ForegroundColor Yellow
    Write-Host "  Ritual: docs/ops/CH_ACCESS.md (alinhar SHA ou AIYRA_OPS_CONSOLE_FROM_MAIN=1)" -ForegroundColor Yellow
    return @{ Script = $RootOpsUp; UseChShell = $false; Reason = 'behind'; MainSha = $mainSha; ShellSha = $shellSha }
  }
  if (-not $shellAhead) {
    Write-Host "`n[CH] ch-shell DIVERGENTE do repo principal — ops-console do checkout principal." -ForegroundColor Yellow
    Write-Host "  main=$mainSha  ch-shell=$shellSha" -ForegroundColor Yellow
    Write-Host "  Ritual: docs/ops/CH_ACCESS.md (alinhar SHA ou AIYRA_OPS_CONSOLE_FROM_MAIN=1)" -ForegroundColor Yellow
    return @{ Script = $RootOpsUp; UseChShell = $false; Reason = 'diverged'; MainSha = $mainSha; ShellSha = $shellSha }
  }
  return @{ Script = $chShellOpsUp; UseChShell = $true; MainSha = $mainSha; ShellSha = $shellSha }
}

Write-Host "Starting API..." -NoNewline
$apiPort = if ($Preview) { 3020 } else { 3010 }
$webPort = if ($Preview) { 5174 } else { 5173 }
$defaultOpsConsole = if ($Preview) { "3023" } else { "3013" }
$defaultNotifier = if ($Preview) { "3022" } else { "3012" }
$logSuffix = if ($Preview) { "-preview" } else { "" }
Stop-ListenerOnPort $apiPort
$logApi = Join-Path $root "api$logSuffix.log"
$env:PORT = "$apiPort"
if (-not $Cloud) {
  $env:DATABASE_URL = if ($Preview) {
    "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
  } else {
    "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare"
  }
}
$llmQuotaUnlimited = $env:LLM_QUOTA_UNLIMITED
$deploymentTier = if ($Preview) { 'preview' } else { 'integration' }
$env:DEPLOYMENT_TIER = $deploymentTier
$dbUrlCmd = Escape-CmdEnvSegment $env:DATABASE_URL
$llmQuotaCmd = Escape-CmdEnvSegment $llmQuotaUnlimited
$cmdApi = (
  'set PORT={0}&&set DEPLOYMENT_TIER={1}&&set DATABASE_URL={2}&&set LLM_QUOTA_UNLIMITED={3}&&set OPENCODE_GO_API_KEY={4}&&set OPENCODE_ZEN_API_KEY={5}&&set GEMINI_API_KEY={6}&&set GROQ_API_KEY={7}&&cd /d {8}&&npx tsx watch src/index.ts >"{9}" 2>&1' -f `
    $apiPort, `
    $deploymentTier, `
    $dbUrlCmd, `
    $llmQuotaCmd, `
    (Escape-CmdEnvSegment $env:OPENCODE_GO_API_KEY), `
    (Escape-CmdEnvSegment $env:OPENCODE_ZEN_API_KEY), `
    (Escape-CmdEnvSegment $env:GEMINI_API_KEY), `
    (Escape-CmdEnvSegment $env:GROQ_API_KEY), `
    $apiDir, `
    $logApi
)
cmd /c "start /B cmd /c `"$cmdApi`""

$apiHealthWaitSec = 45
if ($env:AIYRA_API_HEALTH_WAIT_SEC) {
  $parsedWait = 0
  if ([int]::TryParse($env:AIYRA_API_HEALTH_WAIT_SEC, [ref]$parsedWait) -and $parsedWait -gt 0) {
    $apiHealthWaitSec = $parsedWait
  }
}
$apiHealthOk = $false
for ($i = 0; $i -lt $apiHealthWaitSec; $i++) {
  Start-Sleep 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -ErrorAction Stop
    if ($h.service -eq 'aiyracare-api' -or $h.service -eq 'aiyra-care-api') {
      Write-Host " OK ($($h.status))" -ForegroundColor Green
      $apiHealthOk = $true
      break
    }
    Write-Host "." -NoNewline
  }
  catch {
    Write-Host "." -NoNewline
  }
}
if (-not $apiHealthOk) {
  Write-Host " FAIL (sem /health em ${apiHealthWaitSec}s — API pode ainda subir; veja api$logSuffix.log)" -ForegroundColor Red
}

Write-Host "Starting Ops console..." -NoNewline
if ($Preview -and -not $env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT = $defaultOpsConsole }
$opsConsolePort = if ($env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT } else { $defaultOpsConsole }
$opsConsoleTimeoutSec = 15
if ($env:AIYRA_OPS_CONSOLE_BOOT_TIMEOUT_SEC) {
  $parsedOpsWait = 0
  if ([int]::TryParse($env:AIYRA_OPS_CONSOLE_BOOT_TIMEOUT_SEC, [ref]$parsedOpsWait) -and $parsedOpsWait -gt 0) {
    $opsConsoleTimeoutSec = $parsedOpsWait
  }
}
if ($env:AIYRA_SKIP_OPS_CONSOLE -eq '1') {
  Write-Host " skip (AIYRA_SKIP_OPS_CONSOLE=1)" -ForegroundColor Yellow
} else {
  $chParent = Split-Path $root -Parent
  if ($env:AIYRA_CH_SHELL_ROOT -and $env:AIYRA_CH_SHELL_ROOT.Trim()) {
    $chShellRoot = $env:AIYRA_CH_SHELL_ROOT.Trim()
  } else {
    $chAnaneri = Join-Path $chParent "ananeri-ch-shell"
    $chLegacy = Join-Path $chParent "aiyra-care-ch-shell"
    if (Test-Path $chAnaneri) { $chShellRoot = $chAnaneri }
    elseif (Test-Path $chLegacy) { $chShellRoot = $chLegacy }
    else { $chShellRoot = $chAnaneri }
  }
  $rootOpsUp = Join-Path $PSScriptRoot 'ops-console-up.ps1'
  $opsScript = $rootOpsUp
  if (-not $Preview) {
    $chResolve = Resolve-ChShellOpsConsoleUp -MainRoot $root -ChShellRoot $chShellRoot -RootOpsUp $rootOpsUp
  } else {
    $chResolve = @{ Script = $rootOpsUp; UseChShell = $false; Reason = 'preview' }
  }
  if ($chResolve.UseChShell) {
    Write-Host " (CH via ch-shell @ $($chResolve.ShellSha.Substring(0, 12)))" -ForegroundColor DarkCyan -NoNewline
  } elseif ($chResolve.Reason -eq 'AIYRA_OPS_CONSOLE_FROM_MAIN=1') {
    Write-Host " (checkout principal — AIYRA_OPS_CONSOLE_FROM_MAIN)" -ForegroundColor DarkCyan -NoNewline
  } elseif ($chResolve.Reason -and $chResolve.Reason -ne 'missing' -and $chResolve.Reason -ne 'preview') {
    Write-Host " (checkout principal)" -ForegroundColor DarkCyan -NoNewline
  }
  $opsScript = $chResolve.Script
  [void](Start-OpsConsoleUpWithTimeout -ScriptPath $opsScript -Port $opsConsolePort -TimeoutSec $opsConsoleTimeoutSec)
}

Write-Host "Starting Ops notifier..." -NoNewline
if ($Preview -and -not $env:OPS_LOCAL_NOTIFIER_PORT) { $env:OPS_LOCAL_NOTIFIER_PORT = $defaultNotifier }
$notifierPort = if ($env:OPS_LOCAL_NOTIFIER_PORT) { $env:OPS_LOCAL_NOTIFIER_PORT } else { $defaultNotifier }
$notifierUpArgs = @()
if ($Preview) { $notifierUpArgs += '-Preview' }
& (Join-Path $PSScriptRoot "ops-notifier-up.ps1") @notifierUpArgs | Out-Null
try {
  $code = (Invoke-WebRequest -Uri "http://127.0.0.1:$notifierPort/health" -UseBasicParsing -TimeoutSec 2).StatusCode
  if ($code -eq 200) { Write-Host " OK" -ForegroundColor Green }
  else { Write-Host " skip" -ForegroundColor Yellow }
} catch { Write-Host " FAIL" -ForegroundColor Red }


Write-Host "Starting Web..." -NoNewline
$logWeb = Join-Path $root "web$logSuffix.log"
Stop-ListenerOnPort $webPort
$viteOpsConsoleUrl = "http://127.0.0.1:$opsConsolePort"
$webOpenUrl = "http://localhost:$webPort"
$apiDisplayUrl = "http://127.0.0.1:$apiPort"
$opsDisplayUrl = "http://127.0.0.1:$opsConsolePort"
$viteEnvPrefix = Get-ViteWebCmdEnvPrefix -ApiPort $apiPort -OpsConsoleUrl $viteOpsConsoleUrl
$cmdWeb = "${viteEnvPrefix}cd /d $webDir&&npx vite --host 0.0.0.0 --port $webPort >`"$logWeb`" 2>&1"
cmd /c "start /B cmd /c `"$cmdWeb`""

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep 1
  try { $code = (Invoke-WebRequest -Uri "http://localhost:$webPort" -UseBasicParsing -TimeoutSec 2).StatusCode; Write-Host " OK ($code)" -ForegroundColor Green; break }
  catch { Write-Host "." -NoNewline; if ($i -eq 11) { Write-Host " FAIL" -ForegroundColor Red } }
}

$envLabel = if ($Preview) { "Preview (Ambiente 2)" } else { "Integração (Ambiente 1)" }
Write-Host @"
`nAiyraCare $envLabel running :
  Web  $webOpenUrl
  API  $apiDisplayUrl/health
  Ops  $opsDisplayUrl/?group=operacao&tab=defeitos
  Notifier http://127.0.0.1:$notifierPort/ops-alert
  PG   $env:DATABASE_URL
  Logs api$logSuffix.log / web$logSuffix.log / ops-console.log / ops-notifier.log
"@

Start-Process "$webOpenUrl/login"
