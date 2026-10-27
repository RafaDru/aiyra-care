# Registra bandeja ops Dev (+ stacks Dev/Staging) na inicializacao do Windows (logon do usuario).
# Bandeja Staging (:3022) e opt-in: -IncludeStagingNotifier (ver docs/ops/NOTIFIER_TOAST_VISUAL.md).
param(
  [switch]$Register,
  [switch]$Unregister,
  [switch]$Status,
  [switch]$IncludeStagingNotifier
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$pwsh = (Get-Command powershell.exe).Source

function Task-Exists([string]$Name) {
  return $null -ne (Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue)
}

function New-LogonTask {
  param(
    [string]$Name,
    [string]$Description,
    [string]$Arguments,
    [int]$DelaySec = 15
  )
  if (Task-Exists $Name) {
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false
  }
  $action = New-ScheduledTaskAction -Execute $pwsh -Argument $Arguments -WorkingDirectory $root
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $trigger.Delay = "PT${DelaySec}S"
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)
  Register-ScheduledTask `
    -TaskName $Name `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description $Description `
    | Out-Null
}

$stagingNotifierTask = @{
  Name = 'AiyraCare-Notifier-Staging'
  Desc = 'Bandeja ops Staging (:3022 / :3023)'
  Args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\ops-notifier-up.ps1`" -Preview"
  Delay = 25
}

$tasks = @(
  @{
    Name = 'AiyraCare-Notifier-Dev'
    Desc = 'Bandeja ops Dev (:3012 / :3013)'
    Args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\ops-notifier-up.ps1`""
    Delay = 20
  },
  @{
    Name = 'AiyraCare-Stacks-Dev-Staging'
    Desc = 'API/Web/Ops Dev + Staging (up-both, sem re-seed preview)'
    Args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\up-both.ps1`" -SkipPreviewSeed"
    Delay = 45
  }
)

function Get-RegisterTasks {
  if ($IncludeStagingNotifier) {
    return @($tasks[0], $stagingNotifierTask, $tasks[1])
  }
  return $tasks
}

function Get-AllKnownTaskNames {
  @(
    'AiyraCare-Notifier-Dev',
    'AiyraCare-Notifier-Staging',
    'AiyraCare-Stacks-Dev-Staging'
  )
}

if ($Status) {
  Write-Host 'Tarefas AiyraCare no Agendador:' -ForegroundColor Cyan
  foreach ($name in (Get-AllKnownTaskNames)) {
    $exists = Task-Exists $name
    $state = if ($exists) {
      (Get-ScheduledTask -TaskName $name).State
    } else { 'ausente' }
    Write-Host "  ${name}: $state"
  }
  exit 0
}

if ($Unregister) {
  foreach ($name in (Get-AllKnownTaskNames)) {
    if (Task-Exists $name) {
      Unregister-ScheduledTask -TaskName $name -Confirm:$false
      Write-Host "Removido: $name" -ForegroundColor Yellow
    }
  }
  Write-Host 'Startup AiyraCare removido.' -ForegroundColor Green
  exit 0
}

if (-not $Register) {
  Write-Host 'Uso:' -ForegroundColor Cyan
  Write-Host '  npm run startup:register              # logon: bandeja Dev + stacks'
  Write-Host '  npm run startup:register:staging-tray # inclui bandeja Staging'
  Write-Host '  npm run startup:unregister'
  Write-Host '  npm run startup:status'
  exit 0
}

$registerTasks = Get-RegisterTasks
foreach ($t in $registerTasks) {
  New-LogonTask -Name $t.Name -Description $t.Desc -Arguments $t.Args -DelaySec $t.Delay
  Write-Host "Registrado: $($t.Name)" -ForegroundColor Green
}

if (-not $IncludeStagingNotifier -and (Task-Exists $stagingNotifierTask.Name)) {
  Unregister-ScheduledTask -TaskName $stagingNotifierTask.Name -Confirm:$false
  Write-Host "Removido (padrao sem bandeja Staging): $($stagingNotifierTask.Name)" -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Na proxima sessao Windows (apos ~45s do logon):' -ForegroundColor Cyan
if ($IncludeStagingNotifier) {
  Write-Host '  - 2 icones na bandeja (Dev + Staging)'
} else {
  Write-Host '  - 1 icone na bandeja (Dev); stacks Dev+Staging sobem via up-both'
}
Write-Host '  - Stacks :3010/:5173 e :3020/:5174'
Write-Host '  npm run startup:status'
