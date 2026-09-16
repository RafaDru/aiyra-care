# Resolve titulo, corpo e icone do payload JSON de alertas ops.
. (Join-Path $PSScriptRoot 'ops-notifier-toast-design.ps1')

function Resolve-OpsToastFromPayload {
  param(
    [Parameter(Mandatory = $true)]
    [psobject]$Json
  )

  if ($Json.type -eq 'support_report') {
    if ($Json.toast -and $Json.toast.title -and $Json.toast.body) {
      return @{
        Kind = 'support'
        Headline = ($Json.toast.title -replace '^\[?Suporte\]?\s*\|?\s*', '').Trim()
        Body = [string]$Json.toast.body
        ContextLine = 'Novo chamado de usuario'
        IconName = [string]$Json.toast.icon
        Tier = ''
      }
    }
    $body = [string]$Json.category
    if ($Json.route) { $body += "`n$($Json.route)" }
    if ($Json.topFingerprint) { $body += "`nErro: $($Json.topFingerprint)" }
    return @{
      Kind = 'support'
      Headline = 'Novo chamado'
      Body = $body
      ContextLine = 'Reportar problema'
      IconName = 'info'
      Tier = ''
    }
  }

  if ($Json.toast -and $Json.toast.title -and $Json.toast.body) {
    $headline = ($Json.toast.title -replace '^\[?Ambiente\]?\s*\|?\s*', '').Trim()
    return @{
      Kind = 'environment'
      Headline = $headline
      Body = [string]$Json.toast.body
      ContextLine = 'Alerta automatico'
      IconName = [string]$Json.toast.icon
      Tier = ''
    }
  }

  $alerts = @($Json.alerts)
  if ($alerts.Count -eq 0) {
    $text = [string]$Json.text
    $body = ($text -split "`n" | Select-Object -First 3) -join "`n"
    return @{
      Kind = 'environment'
      Headline = 'Alerta'
      Body = $body
      ContextLine = 'Webhook generico'
      IconName = 'warning'
      Tier = ''
    }
  }

  $hasCritical = $false
  foreach ($a in $alerts) {
    if ([string]$a.severity -eq 'critical') { $hasCritical = $true; break }
  }

  $primary = $alerts | Where-Object { [string]$_.severity -eq 'critical' } | Select-Object -First 1
  if (-not $primary) { $primary = $alerts[0] }

  $category = [string]$primary.category
  $iconName = 'warning'
  if ($hasCritical) {
    $iconName = 'error'
  }
  elseif ($category -eq 'product' -or [string]$primary.id -eq 'infra_neo4j_down') {
    $iconName = 'info'
  }

  $catLabel = switch ($category) {
    'infra' { 'Infra' }
    'sync' { 'Sync' }
    'llm' { 'Ava' }
    'product' { 'Produto' }
    default { $category }
  }

  $severityWord = if ($hasCritical) { 'CRITICO' } else { 'AVISO' }

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
    Kind = 'environment'
    Headline = $severityWord
    Body = ($lines -join "`n")
    ContextLine = "$catLabel - threshold"
    IconName = $iconName
    Tier = ''
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
