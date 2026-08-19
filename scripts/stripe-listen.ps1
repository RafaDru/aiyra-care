# Stripe CLI — encaminha webhooks de teste à API local.
# Uso: powershell -File scripts/stripe-listen.ps1
# Requer: Stripe CLI (winget install Stripe.StripeCli) + STRIPE_SECRET_KEY no .env

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env"
$forwardUrl = "127.0.0.1:3010/billing/webhook"

if (-not (Test-Path $envFile)) {
  Write-Host "ERROR: .env not found at $envFile" -ForegroundColor Red
  exit 1
}

$stripeKey = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^STRIPE_SECRET_KEY=(.+)$') { $stripeKey = $matches[1].Trim() }
}

if (-not $stripeKey) {
  Write-Host "ERROR: STRIPE_SECRET_KEY missing in .env" -ForegroundColor Red
  exit 1
}

$stripe = (Get-Command stripe -ErrorAction SilentlyContinue).Source
if (-not $stripe) {
  $stripe = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\stripe.exe"
}
if (-not (Test-Path $stripe)) {
  Write-Host "ERROR: stripe CLI not found. Run: winget install Stripe.StripeCli" -ForegroundColor Red
  exit 1
}

Write-Host "Stripe listen -> http://$forwardUrl" -ForegroundColor Cyan
Write-Host "Signing secret is in .env (STRIPE_WEBHOOK_SECRET). Re-run --print-secret if you restart listen." -ForegroundColor DarkGray

& $stripe listen `
  --api-key $stripeKey `
  --forward-to "http://$forwardUrl" `
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted
