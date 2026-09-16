# Sobe Ambiente 1 (dev) + Ambiente 2 (staging local) em paralelo.
param([switch]$SkipPreviewSeed)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')

Write-Host 'AiyraCare — Dev + Staging (paralelo)' -ForegroundColor Cyan

& (Join-Path $PSScriptRoot 'up.ps1')

if ($SkipPreviewSeed) {
  & (Join-Path $PSScriptRoot 'up.ps1') -Preview
} else {
  & (Join-Path $PSScriptRoot 'up-preview.ps1')
}

Write-Host ''
Write-Host 'Stacks:' -ForegroundColor Cyan
Write-Host '  Dev      API :3010  Web :5173  Ops :3013  Notifier :3012'
Write-Host '  Staging  API :3020  Web :5174  Ops :3023  Notifier :3022'
Write-Host '  Status:  npm run env:status'
