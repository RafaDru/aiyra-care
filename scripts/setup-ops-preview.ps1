param(
  [string]$WebhookUrl = '',
  [string]$DashboardUrl = '',
  [string]$NtfyTopic = 'aiyracare-preview'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$envFile = Join-Path $root '.env'

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
  if (-not $found) { $lines += "$name=$value" }
  Set-Content -Path $envFile -Value $lines -Encoding utf8
}

Write-Host 'AiyraCare — setup ops PREVIEW (Ambiente 2)' -ForegroundColor Cyan
Write-Host 'Use no host preview — NÃO no .env de integração local sem querer.' -ForegroundColor Yellow

& (Join-Path $PSScriptRoot 'setup-ops-alerts.ps1') -SkipKeyGeneration

if (-not $WebhookUrl) {
  $WebhookUrl = "https://ntfy.sh/$NtfyTopic"
}

if (-not $DashboardUrl) {
  $DashboardUrl = 'http://127.0.0.1:3023'
  Write-Host 'Local preview: :3023 — host cloud: edite OPS_ALERT_DASHBOARD_URL' -ForegroundColor Yellow
}

Set-EnvValue 'OPS_ALERT_WEBHOOK_URL' $WebhookUrl
Set-EnvValue 'OPS_ALERT_DASHBOARD_URL' $DashboardUrl
Set-EnvValue 'OPS_ALERTS_DISPATCH_MODE' 'human_required'
Set-EnvValue 'OPS_ALERTS_MIN_SEVERITY' 'critical'
Set-EnvValue 'CONNECT_WORKER_EXTERNAL' '1'
Set-EnvValue 'OPS_ALERTS_INTERVAL_MS' '900000'
Set-EnvValue 'OPS_WORKER_MONITOR' '1'
Set-EnvValue 'OPS_WORKER_STALE_MINUTES' '45'
Set-EnvValue 'DEPLOYMENT_TIER' 'preview'
Set-EnvValue 'API_PUBLIC_URL' 'http://127.0.0.1:3020'

Write-Host ''
Write-Host 'Preview ops configurado. Post-deploy:' -ForegroundColor Green
Write-Host '  npm run preview:post-deploy'
Write-Host 'Doc: docs/infra/ENV_PREVIEW.md'
