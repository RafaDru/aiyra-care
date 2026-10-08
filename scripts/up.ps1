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
$cmdApi = "set PORT=$apiPort&&set DEPLOYMENT_TIER=$deploymentTier&&set DATABASE_URL=$env:DATABASE_URL&&set LLM_QUOTA_UNLIMITED=$llmQuotaUnlimited&&set OPENCODE_GO_API_KEY=$env:OPENCODE_GO_API_KEY&&set OPENCODE_ZEN_API_KEY=$env:OPENCODE_ZEN_API_KEY&&set GEMINI_API_KEY=$env:GEMINI_API_KEY&&set GROQ_API_KEY=$env:GROQ_API_KEY&&cd /d $apiDir&&npx tsx watch src/index.ts >`"$logApi`" 2>&1"
cmd /c "start /B cmd /c `"$cmdApi`""

for ($i = 0; $i -lt 12; $i++) {
  Start-Sleep 1
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -ErrorAction Stop
    if ($h.service -eq 'aiyracare-api' -or $h.service -eq 'aiyra-care-api') { Write-Host " OK ($($h.status))" -ForegroundColor Green; break }
    Write-Host "." -NoNewline
  }
  catch { Write-Host "." -NoNewline; if ($i -eq 11) { Write-Host " FAIL" -ForegroundColor Red } }
}

Write-Host "Starting Ops console..." -NoNewline
if ($Preview -and -not $env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT = $defaultOpsConsole }
$opsConsolePort = if ($env:OPS_CONSOLE_PORT) { $env:OPS_CONSOLE_PORT } else { $defaultOpsConsole }
$chShellRoot = if ($env:AIYRA_CH_SHELL_ROOT) {
  $env:AIYRA_CH_SHELL_ROOT.Trim()
} else {
  Join-Path (Split-Path $root -Parent) "aiyra-care-ch-shell"
}
$rootOpsUp = Join-Path $PSScriptRoot 'ops-console-up.ps1'
if (-not $Preview) {
  $chResolve = Resolve-ChShellOpsConsoleUp -MainRoot $root -ChShellRoot $chShellRoot -RootOpsUp $rootOpsUp
  if ($chResolve.UseChShell) {
    Write-Host " (CH via ch-shell @ $($chResolve.ShellSha.Substring(0, 12)))" -ForegroundColor DarkCyan
    & $chResolve.Script | Out-Null
  } else {
    if ($chResolve.Reason -eq 'AIYRA_OPS_CONSOLE_FROM_MAIN=1') {
      Write-Host " (ops-console checkout principal — AIYRA_OPS_CONSOLE_FROM_MAIN)" -ForegroundColor DarkCyan
    } elseif ($chResolve.Reason -and $chResolve.Reason -ne 'missing') {
      Write-Host " (ops-console checkout principal)" -ForegroundColor DarkCyan
    }
    & $chResolve.Script | Out-Null
  }
} else {
  & $rootOpsUp | Out-Null
}
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:$opsConsolePort/health" -ErrorAction Stop
  if ($h.service -eq 'aiyracare-ops-console') { Write-Host " OK" -ForegroundColor Green }
  else { Write-Host " skip" -ForegroundColor Yellow }
} catch { Write-Host " FAIL" -ForegroundColor Red }

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
$viteApiUrl = "http://127.0.0.1:$apiPort"
$viteOpsConsoleUrl = "http://127.0.0.1:$opsConsolePort"
$webOpenUrl = "http://localhost:$webPort"
$apiDisplayUrl = "http://127.0.0.1:$apiPort"
$opsDisplayUrl = "http://127.0.0.1:$opsConsolePort"
$cmdWeb = "set VITE_API_URL=$viteApiUrl&&set VITE_OPS_CONSOLE_URL=$viteOpsConsoleUrl&&cd /d $webDir&&npx vite --host 0.0.0.0 --port $webPort >`"$logWeb`" 2>&1"
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
