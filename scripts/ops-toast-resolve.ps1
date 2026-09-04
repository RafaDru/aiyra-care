# Resolve titulo, corpo e icone do payload JSON de alertas ops.
function Resolve-OpsToastFromPayload {
  param(
    [Parameter(Mandatory = $true)]
    [psobject]$Json
  )

  if ($Json.type -eq 'support_report') {
    if ($Json.toast -and $Json.toast.title -and $Json.toast.body) {
      $icon = [string]$Json.toast.icon
      $iconType = switch ($icon.ToLower()) {
        'error' { 'Error' }
        'info' { 'Info' }
        'warning' { 'Warning' }
        default { 'Info' }
      }
      return @{
        Title = [string]$Json.toast.title
        Body = [string]$Json.toast.body
        IconType = $iconType
      }
    }
    $body = [string]$Json.category
    if ($Json.route) { $body += "`n$($Json.route)" }
    if ($Json.topFingerprint) { $body += "`nErro: $($Json.topFingerprint)" }
    return @{
      Title = 'AiyraCare | Novo chamado'
      Body = $body
      IconType = 'Info'
    }
  }

  if ($Json.toast -and $Json.toast.title -and $Json.toast.body) {
    $icon = [string]$Json.toast.icon
    $iconType = switch ($icon.ToLower()) {
      'error' { 'Error' }
      'info' { 'Info' }
      'warning' { 'Warning' }
      default { 'Warning' }
    }
    return @{
      Title = [string]$Json.toast.title
      Body = [string]$Json.toast.body
      IconType = $iconType
    }
  }

  $alerts = @($Json.alerts)
  if ($alerts.Count -eq 0) {
    $text = [string]$Json.text
    $body = ($text -split "`n" | Select-Object -First 3) -join "`n"
    return @{
      Title = 'AiyraCare Ops'
      Body = $body
      IconType = 'Warning'
    }
  }

  $hasCritical = $false
  foreach ($a in $alerts) {
    if ([string]$a.severity -eq 'critical') { $hasCritical = $true; break }
  }

  $primary = $alerts | Where-Object { [string]$_.severity -eq 'critical' } | Select-Object -First 1
  if (-not $primary) { $primary = $alerts[0] }

  $category = [string]$primary.category
  $iconType = 'Warning'
  if ($hasCritical) {
    $iconType = 'Error'
  }
  elseif ($category -eq 'product' -or [string]$primary.id -eq 'infra_neo4j_down') {
    $iconType = 'Info'
  }

  $catLabel = switch ($category) {
    'infra' { 'Infra' }
    'sync' { 'Sync' }
    'llm' { 'Ava' }
    'product' { 'Produto' }
    default { $category }
  }

  $severityWord = if ($hasCritical) { 'CRITICO' } else { 'AVISO' }
  $title = "AiyraCare Ops | $severityWord"

  $lines = @()
  $max = [Math]::Min(3, $alerts.Count)
  for ($i = 0; $i -lt $max; $i++) {
    $a = $alerts[$i]
    $c = switch ([string]$a.category) {
      'infra' { 'Infra' }
      'sync' { 'Sync' }
      'llm' { 'Ava' }
      'product' { 'Produto' }
      default { [string]$a.category }
    }
    $msg = [string]$a.message
    $msg = $msg -replace '\u2014', '-'
    $msg = $msg -replace '\u2022', '-'
    $lines += "$c`: $msg"
  }
  if ($alerts.Count -gt 3) {
    $lines += "(+$($alerts.Count - 3) mais)"
  }

  return @{
    Title = $title
    Body = ($lines -join "`n")
    IconType = $iconType
  }
}

function Show-OpsToast {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Body,
    [ValidateSet('Error', 'Warning', 'Info', 'None')]
    [string]$IconType = 'Warning'
  )

  $displayScript = Join-Path $PSScriptRoot 'ops-toast-display.ps1'
  & $displayScript -Title $Title -Body $Body -IconType $IconType
}
