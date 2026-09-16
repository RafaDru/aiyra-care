# Registra bandeja ops + stacks Dev/Staging na inicializacao do Windows (logon do usuario).
param(
  [switch]$Register,
  [switch]$Unregister,
  [switch]$Status
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

$tasks = @(
  @{
    Name = 'AiyraCare-Notifier-Dev'
    Desc = 'Bandeja ops Dev (:3012 / :3013)'
    Args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\ops-notifier-up.ps1`""
    Delay = 20
  },
  @{
    Name = 'AiyraCare-Notifier-Staging'
    Desc = 'Bandeja ops Staging (:3022 / :3023)'
    Args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\ops-notifier-up.ps1`" -Preview"
    Delay = 25
  },
  @{
    Name = 'AiyraCare-Stacks-Dev-Staging'
    Desc = 'API/Web/Ops Dev + Staging (up-both, sem re-seed preview)'
    Args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\scripts\up-both.ps1`" -SkipPreviewSeed"
    Delay = 45
  }
)

if ($Status) {
  Write-Host 'Tarefas AiyraCare no Agendador:' -ForegroundColor Cyan
  foreach ($t in $tasks) {
    $exists = Task-Exists $t.Name
    $state = if ($exists) {
      (Get-ScheduledTask -TaskName $t.Name).State
    } else { 'ausente' }
    Write-Host "  $($t.Name): $state"
  }
  exit 0
}

if ($Unregister) {
  foreach ($t in $tasks) {
    if (Task-Exists $t.Name) {
      Unregister-ScheduledTask -TaskName $t.Name -Confirm:$false
      Write-Host "Removido: $($t.Name)" -ForegroundColor Yellow
    }
  }
  Write-Host 'Startup AiyraCare removido.' -ForegroundColor Green
  exit 0
}

if (-not $Register) {
  Write-Host 'Uso:' -ForegroundColor Cyan
  Write-Host '  npm run startup:register    # logon: bandejas + stacks'
  Write-Host '  npm run startup:unregister'
  Write-Host '  npm run startup:status'
  exit 0
}

foreach ($t in $tasks) {
  New-LogonTask -Name $t.Name -Description $t.Desc -Arguments $t.Args -DelaySec $t.Delay
  Write-Host "Registrado: $($t.Name)" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Na proxima sessao Windows (apos ~45s do logon):' -ForegroundColor Cyan
Write-Host '  - 2 icones na bandeja (Dev + Staging)'
Write-Host '  - Stacks :3010/:5173 e :3020/:5174'
Write-Host '  npm run startup:status'
