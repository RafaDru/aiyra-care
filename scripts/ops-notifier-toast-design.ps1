# Visual language for ops system-tray balloons (3 notification families).
# See docs/ops/NOTIFIER_TOAST_VISUAL.md

function Get-OpsToastKindProfile {
  param(
    [ValidateSet('environment', 'support', 'farol', 'system')]
    [string]$Kind
  )
  switch ($Kind) {
    'environment' {
      return @{
        kind = 'environment'
        tag = 'Ambiente'
        glyph = '!'
        accent = '#DC2626'
        defaultIcon = 'Error'
        opensBrowser = $true
      }
    }
    'support' {
      return @{
        kind = 'support'
        tag = 'Suporte'
        glyph = '?'
        accent = '#2563EB'
        defaultIcon = 'Info'
        opensBrowser = $true
      }
    }
    'farol' {
      return @{
        kind = 'farol'
        tag = 'Farol'
        glyph = '>'
        accent = '#059669'
        defaultIcon = 'Info'
        opensBrowser = $false
      }
    }
    default {
      return @{
        kind = 'system'
        tag = 'Ops'
        glyph = '.'
        accent = '#64748B'
        defaultIcon = 'Info'
        opensBrowser = $false
      }
    }
  }
}

function Format-OpsToastTitle {
  param(
    [string]$Kind,
    [string]$Headline,
    [string]$Tier = ''
  )
  $profile = Get-OpsToastKindProfile $Kind
  $tierPart = if ($Tier) { "$Tier - " } else { '' }
  $title = "$($profile.tag) | $tierPart$Headline"
  $title = ($title -replace '\s+', ' ').Trim()
  if ($title.Length -gt 63) {
    return $title.Substring(0, 60) + '...'
  }
  return $title
}

function Format-OpsToastBody {
  param(
    [string]$Kind,
    [string]$Body,
    [string]$ContextLine = ''
  )
  $profile = Get-OpsToastKindProfile $Kind
  $lines = @()
  if ($ContextLine) {
    $lines += "[$($profile.glyph)] $ContextLine"
  }
  if ($Body) {
    $lines += ($Body -replace "`r`n", "`n").Trim()
  }
  $text = ($lines -join "`n").Trim()
  if ($text.Length -gt 255) {
    return $text.Substring(0, 252) + '...'
  }
  return $text
}

function Resolve-OpsToastWinFormsIcon {
  param(
    [string]$IconName,
    [string]$Kind,
    [bool]$Ok = $true
  )
  if ($IconName) {
    switch ($IconName.ToLower()) {
      'error' { return 'Error' }
      'warning' { return 'Warning' }
      'info' { return 'Info' }
      'none' { return 'None' }
    }
  }
  $profile = Get-OpsToastKindProfile $Kind
  if ($Kind -eq 'farol' -and -not $Ok) { return 'Warning' }
  if ($Kind -eq 'environment' -and $IconName -eq 'warning') { return 'Warning' }
  return $profile.defaultIcon
}

function Show-OpsTrayBalloon {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('environment', 'support', 'farol', 'system')]
    [string]$Kind,
    [Parameter(Mandatory = $true)]
    [string]$Headline,
    [string]$Body = '',
    [string]$ContextLine = '',
    [string]$Tier = '',
    [string]$IconName = '',
    [bool]$Ok = $true,
    [int]$TimeoutMs = 7000,
    [Parameter(Mandatory = $true)]
    [System.Windows.Forms.NotifyIcon]$NotifyIcon
  )

  $title = Format-OpsToastTitle -Kind $Kind -Headline $Headline -Tier $Tier
  $text = Format-OpsToastBody -Kind $Kind -Body $Body -ContextLine $ContextLine
  $iconType = Resolve-OpsToastWinFormsIcon -IconName $IconName -Kind $Kind -Ok $Ok
  $tipIcon = [System.Windows.Forms.ToolTipIcon]::Info
  switch ($iconType) {
    'Error' { $tipIcon = [System.Windows.Forms.ToolTipIcon]::Error }
    'Warning' { $tipIcon = [System.Windows.Forms.ToolTipIcon]::Warning }
    'Info' { $tipIcon = [System.Windows.Forms.ToolTipIcon]::Info }
    'None' { $tipIcon = [System.Windows.Forms.ToolTipIcon]::None }
  }
  $NotifyIcon.ShowBalloonTip($TimeoutMs, $title, $text, $tipIcon)
}
