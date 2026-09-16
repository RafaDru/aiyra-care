param(
  [string]$WebhookUrl = '',
  [string]$DashboardUrl = '',
  [string]$NtfyTopic = 'aiyracare-preview'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$envPreview = Join-Path $root '.env.preview'
$envExample = Join-Path $root '.env.preview.example'

if (-not (Test-Path $envPreview)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envPreview
    Write-Host 'Criado .env.preview a partir de .env.preview.example' -ForegroundColor Green
  } else {
    New-Item -ItemType File -Path $envPreview -Force | Out-Null
    Add-Content $envPreview '# Preview — gerado por setup:ops-preview'
  }
}

Write-Host 'AiyraCare — setup ops PREVIEW (Ambiente 2)' -ForegroundColor Cyan
Write-Host 'Escreve em .env.preview — integração permanece em .env' -ForegroundColor Yellow

& (Join-Path $PSScriptRoot 'setup-ops-alerts.ps1') -EnvFile '.env.preview'

function Set-PreviewEnvValue([string]$name, [string]$value) {
  $lines = @()
  $found = $false
  foreach ($line in Get-Content $envPreview) {
    if ($line -match "^\s*$name=") {
      $lines += "$name=$value"
      $found = $true
    } else {
      $lines += $line
    }
  }
  if (-not $found) { $lines += "$name=$value" }
  Set-Content -Path $envPreview -Value $lines -Encoding utf8
}

if (-not $WebhookUrl) {
  $WebhookUrl = "https://ntfy.sh/$NtfyTopic"
}

if (-not $DashboardUrl) {
  $DashboardUrl = 'http://127.0.0.1:3023'
  Write-Host 'Local preview: :3023 — host cloud: edite OPS_ALERT_DASHBOARD_URL em .env.preview' -ForegroundColor Yellow
}

Set-PreviewEnvValue 'OPS_ALERT_WEBHOOK_URL' $WebhookUrl
Set-PreviewEnvValue 'OPS_ALERT_DASHBOARD_URL' $DashboardUrl
Set-PreviewEnvValue 'OPS_ALERTS_DISPATCH_MODE' 'human_required'
Set-PreviewEnvValue 'OPS_ALERTS_MIN_SEVERITY' 'critical'
Set-PreviewEnvValue 'CONNECT_WORKER_EXTERNAL' '1'
Set-PreviewEnvValue 'OPS_ALERTS_INTERVAL_MS' '900000'
Set-PreviewEnvValue 'OPS_WORKER_MONITOR' '1'
Set-PreviewEnvValue 'OPS_WORKER_STALE_MINUTES' '45'
Set-PreviewEnvValue 'DEPLOYMENT_TIER' 'preview'
Set-PreviewEnvValue 'API_PUBLIC_URL' 'http://127.0.0.1:3020'
Set-PreviewEnvValue 'DATABASE_URL' 'postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview'
Set-PreviewEnvValue 'OPS_CONSOLE_PORT' '3023'
Set-PreviewEnvValue 'OPS_LOCAL_NOTIFIER_PORT' '3022'

Write-Host ''
Write-Host 'Preview ops em .env.preview. Validar isolamento:' -ForegroundColor Green
Write-Host '  npm run validate:ops-dual-keys'
Write-Host '  npm run up:preview'
Write-Host '  npm run preview:post-deploy'
Write-Host 'Doc: docs/infra/ENV_PREVIEW.md'
