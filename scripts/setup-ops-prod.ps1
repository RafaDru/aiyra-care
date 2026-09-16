param(
  [string]$WebhookUrl = '',
  [string]$DashboardUrl = '',
  [string]$NtfyTopic = 'aiyracare-ops'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$envFile = Join-Path $root '.env'

function Read-EnvValue([string]$name) {
  if (-not (Test-Path $envFile)) { return $null }
  foreach ($line in Get-Content $envFile) {
    if ($line -match "^\s*$name=(.*)$") {
      return $matches[1].Trim()
    }
  }
  return $null
}

function Set-EnvValue([string]$name, [string]$value) {
  if (-not (Test-Path $envFile)) {
    New-Item -ItemType File -Path $envFile -Force | Out-Null
  }
  $lines = @()
  $found = $false
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match "^\s*$name=") {
        $lines += "$name=$value"
        $found = $true
      } else {
        $lines += $line
      }
    }
  }
  if (-not $found) {
    $lines += "$name=$value"
  }
  Set-Content -Path $envFile -Value $lines -Encoding utf8
}

Write-Host 'AiyraCare — setup ops PRODUÇÃO (live)' -ForegroundColor Cyan
Write-Host 'NÃO usar para Integração ou Preview — ver setup:ops-preview e setup:ops-alerts' -ForegroundColor Yellow

& (Join-Path $PSScriptRoot 'setup-ops-alerts.ps1') -SkipKeyGeneration

if (-not $WebhookUrl) {
  $WebhookUrl = "https://ntfy.sh/$NtfyTopic"
  Write-Host "Webhook padrão ntfy: $WebhookUrl" -ForegroundColor Yellow
}

if (-not $DashboardUrl) {
  $DashboardUrl = Read-EnvValue 'OPS_ALERT_DASHBOARD_URL'
  if (-not $DashboardUrl -or $DashboardUrl -match ':5173') {
    $DashboardUrl = 'https://ops.example.com'
    Write-Host "Defina OPS_ALERT_DASHBOARD_URL real (ex.: https://ops.seudominio.com)" -ForegroundColor Yellow
  }
}

Set-EnvValue 'OPS_ALERT_WEBHOOK_URL' $WebhookUrl
Set-EnvValue 'OPS_ALERT_DASHBOARD_URL' $DashboardUrl
Set-EnvValue 'OPS_ALERTS_DISPATCH_MODE' 'human_required'
Set-EnvValue 'OPS_ALERTS_MIN_SEVERITY' 'critical'
Set-EnvValue 'OPS_ALERT_COOLDOWN_MS' '1800000'
Set-EnvValue 'CONNECT_WORKER_EXTERNAL' '1'
Set-EnvValue 'OPS_ALERTS_INTERVAL_MS' '900000'
Set-EnvValue 'OPS_WORKER_MONITOR' '1'
Set-EnvValue 'OPS_WORKER_STALE_MINUTES' '45'

Write-Host ''
Write-Host 'Variáveis de produção aplicadas no .env:' -ForegroundColor Green
Write-Host '  OPS_ALERT_WEBHOOK_URL'
Write-Host '  OPS_ALERT_DASHBOARD_URL'
Write-Host '  CONNECT_WORKER_EXTERNAL=1'
Write-Host '  OPS_ALERTS_INTERVAL_MS=900000 (15 min no worker)'
Write-Host '  OPS_WORKER_MONITOR=1'
Write-Host ''
Write-Host 'Na VM de produção:' -ForegroundColor Cyan
Write-Host '  1. API: CONNECT_WORKER_EXTERNAL=1 (sem loop de alertas na API)'
Write-Host '  2. Worker: cd packages/connect-worker && npm start'
Write-Host '  3. Smoke: npm run ops:smoke (com API up + OPS_METRICS_KEY)'
Write-Host '  4. Doc: docs/infra/OPS_ALERTS_PRODUCTION.md'
Write-Host '  5. Runbook: docs/ops/RUNBOOK_ALERTS.md'
