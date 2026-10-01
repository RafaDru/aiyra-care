# Poll contadores da pilha ops_analysis_queue (ops-console).

function Get-IntOrZero {
  param($Value)
  if ($null -eq $Value) { return 0 }
  return [int]$Value
}

function Get-OpsAttentionCounts {
  param(
    [int]$OpsConsolePort = 3013
  )

  $url = "http://127.0.0.1:$OpsConsolePort/api/analysis-queue/attention-counts"
  try {
    $res = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 4
    return [pscustomobject]@{
      queued = Get-IntOrZero $res.queued
      investigating = Get-IntOrZero $res.investigating
      fixProposed = Get-IntOrZero $res.fixProposed
      failed = Get-IntOrZero $res.failed
      totalAttention = Get-IntOrZero $res.totalAttention
    }
  } catch {
    return $null
  }
}

function Format-OpsAttentionMenuLine {
  param(
    [string]$Label,
    [int]$Count
  )
  if ($Count -le 0) { return "${Label}: 0" }
  return "${Label}: $Count"
}

function Update-OpsTrayAttentionMenu {
  param(
    [System.Windows.Forms.ContextMenuStrip]$Menu,
    [int]$OpsConsolePort
  )

  $counts = Get-OpsAttentionCounts -OpsConsolePort $OpsConsolePort
  $header = $Menu.Items | Where-Object { $_.Name -eq 'issues-header' } | Select-Object -First 1
  if (-not $header) { return }

  if (-not $counts) {
    $header.Text = 'Issues - console indisponivel'
    return
  }

  if ($counts.totalAttention -le 0) {
    $header.Text = 'Issues - nenhuma pendente'
  } else {
    $n = $counts.totalAttention
    $header.Text = "Issues - $n pendente(s)"
  }

  $map = @{
    'issues-queued' = @{ label = 'Na fila'; value = $counts.queued }
    'issues-investigating' = @{ label = 'Investigando'; value = $counts.investigating }
    'issues-fix-proposed' = @{ label = 'Solução proposta'; value = $counts.fixProposed }
    'issues-failed' = @{ label = 'Falhou'; value = $counts.failed }
  }

  foreach ($name in $map.Keys) {
    $item = $Menu.Items | Where-Object { $_.Name -eq $name } | Select-Object -First 1
    if ($item) {
      $entry = $map[$name]
      $item.Text = Format-OpsAttentionMenuLine -Label $entry.label -Count $entry.value
      $item.Enabled = $entry.value -gt 0
    }
  }
}
