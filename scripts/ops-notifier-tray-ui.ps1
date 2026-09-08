# WinForms UI helpers — farol dots + menu action glyphs for ops tray.

$script:OpsTrayStatusBitmaps = @{}

function Get-OpsTrayStatusColor {
  param([string]$State)
  switch ($State) {
    'ok' { return [System.Drawing.Color]::FromArgb(34, 197, 94) }
    'warn' { return [System.Drawing.Color]::FromArgb(245, 158, 11) }
    'down' { return [System.Drawing.Color]::FromArgb(239, 68, 68) }
    default { return [System.Drawing.Color]::FromArgb(148, 163, 184) }
  }
}

function Get-OpsTrayFarolTextColor {
  param([string]$State)
  switch ($State) {
    'ok' { return [System.Drawing.Color]::FromArgb(22, 163, 74) }
    'warn' { return [System.Drawing.Color]::FromArgb(180, 83, 9) }
    'down' { return [System.Drawing.Color]::FromArgb(185, 28, 28) }
    default { return [System.Drawing.Color]::FromArgb(100, 116, 139) }
  }
}

function Format-OpsTrayFarolLine {
  param(
    [string]$Label,
    [int]$Port,
    [string]$State,
    [string]$Detail
  )
  $line = "$Label  :$Port"
  if ($State -eq 'warn' -or $State -eq 'down') {
    $chip = switch ($State) {
      'down' { 'off' }
      default {
        if ($Detail -match 'lento') { $Detail }
        elseif ($Detail -match 'degraded') { 'degraded' }
        elseif ($Detail) { ($Detail -split '\|')[0].Trim() }
        else { '!' }
      }
    }
    if ($chip.Length -gt 18) { $chip = $chip.Substring(0, 18) }
    $line += "  $chip"
  }
  return $line
}

function Set-OpsTrayFarolMenuItem {
  param(
    [System.Windows.Forms.ToolStripMenuItem]$Item,
    [string]$Label,
    [int]$Port,
    [string]$State,
    [string]$Detail,
    [int]$LatencyMs = 0
  )
  $Item.Text = Format-OpsTrayFarolLine -Label $Label -Port $Port -State $State -Detail $Detail
  $Item.Image = New-OpsTrayStatusDotBitmap $State
  $Item.ForeColor = Get-OpsTrayFarolTextColor $State
  $tip = "$Label :$Port"
  if ($Detail) { $tip += " - $Detail" }
  if ($LatencyMs -gt 0) { $tip += " (${LatencyMs}ms)" }
  $Item.ToolTipText = $tip
}

function New-OpsTrayStatusDotBitmap {
  param([string]$State)
  if ($script:OpsTrayStatusBitmaps.ContainsKey($State)) {
    return $script:OpsTrayStatusBitmaps[$State]
  }

  $size = 16
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $fill = New-Object System.Drawing.SolidBrush (Get-OpsTrayStatusColor $State)
  $rect = New-Object System.Drawing.Rectangle 1, 1, ($size - 2), ($size - 2)
  $g.FillEllipse($fill, $rect)

  $border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 15, 23, 42)), 1
  $g.DrawEllipse($border, $rect)

  $fill.Dispose()
  $border.Dispose()
  $g.Dispose()

  $script:OpsTrayStatusBitmaps[$State] = $bmp
  return $bmp
}

function New-OpsTrayGlyphBitmap {
  param(
    [string]$Glyph,
    [string]$BackColor = '#EEF2FF',
    [string]$ForeColor = '#1E293B'
  )

  $size = 16
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

  $bg = [System.Drawing.ColorTranslator]::FromHtml($BackColor)
  $g.Clear($bg)

  $family = New-Object System.Drawing.FontFamily('Segoe UI')
  try {
    $emojiFamily = New-Object System.Drawing.FontFamily('Segoe UI Emoji')
    if ($emojiFamily.IsStyleAvailable([System.Drawing.FontStyle]::Regular)) {
      $family = $emojiFamily
    }
  } catch { }

  $font = New-Object System.Drawing.Font($family, 8.25, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($ForeColor))
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
  $g.DrawString($Glyph, $font, $brush, $rect, $format)

  $font.Dispose()
  $brush.Dispose()
  $format.Dispose()
  $g.Dispose()
  return $bmp
}

function Get-OpsTrayPowerShellExe {
  $cmd = Get-Command powershell.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
}

function ConvertFrom-OpsTrayJson {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) {
    throw 'Resposta vazia do controle de camada'
  }
  foreach ($line in ($Text -split "`n")) {
    $trim = $line.Trim()
    if ($trim.StartsWith('{') -and $trim.EndsWith('}')) {
      return $trim | ConvertFrom-Json
    }
  }
  throw "JSON invalido: $Text"
}

function Normalize-OpsTrayUrl {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) { return $null }
  $u = $Url.Trim()
  if (-not ($u -match '^https?://')) {
    $u = "http://$u"
  }
  return $u
}

function Normalize-OpsLocalServiceUrl {
  param(
    [string]$Url,
    [int]$FallbackPort
  )
  $u = Normalize-OpsTrayUrl $Url
  if (-not $u) { return "http://127.0.0.1:$FallbackPort" }
  if ($u -match ':5173/ops$') { return "http://127.0.0.1:$FallbackPort" }
  try {
    $parsed = [Uri]$u
    $port = if ($parsed.Port -gt 0) { $parsed.Port } else { $FallbackPort }
    if ($parsed.Host -eq 'localhost' -or $parsed.Host -eq '127.0.0.1' -or $parsed.Host -like '*.aiyracare.test') {
      return "http://127.0.0.1:$port$($parsed.PathAndQuery)"
    }
    return $u
  } catch {
    return "http://127.0.0.1:$FallbackPort"
  }
}

function Start-OpsTrayUrl {
  param([string]$Url)
  $u = Normalize-OpsTrayUrl $Url
  if (-not $u) { throw 'URL vazia' }
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $u
  $psi.UseShellExecute = $true
  [void][System.Diagnostics.Process]::Start($psi)
}

function Start-OpsTrayHiddenScript {
  param(
    [string]$ScriptPath,
    [string[]]$ScriptArgs = @()
  )
  if (-not (Test-Path -LiteralPath $ScriptPath)) {
    throw "Script nao encontrado: $ScriptPath"
  }
  $exe = Get-OpsTrayPowerShellExe
  if (-not (Test-Path -LiteralPath $exe)) {
    throw "PowerShell nao encontrado: $exe"
  }
  $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $ScriptPath) + $ScriptArgs
  Start-Process -FilePath $exe -ArgumentList $argList -WindowStyle Hidden -ErrorAction Stop | Out-Null
}

function New-OpsTrayMenuItem {
  param(
    [string]$Text,
    [scriptblock]$OnClick,
    [System.Drawing.Image]$Image = $null,
    [bool]$Enabled = $true
  )
  $item = New-Object System.Windows.Forms.ToolStripMenuItem
  $item.Text = $Text
  if ($Image) { $item.Image = $Image }
  if ($OnClick) {
    $item.Add_Click($OnClick)
  }
  $item.Enabled = $Enabled
  return $item
}

function Invoke-OpsTrayLayerAction {
  param(
    [string]$Layer,
    [string]$Action
  )
  throw 'Invoke-OpsTrayLayerAction deve ser definido em ops-local-notifier-tray.ps1'
}

function New-OpsTrayFarolLayerMenuItem {
  param(
    [string]$Name,
    [string]$Label,
    [int]$Port
  )

  $parent = New-Object System.Windows.Forms.ToolStripMenuItem
  $parent.Name = $Name
  $parent.Text = $Label
  Set-OpsTrayFarolMenuItem -Item $parent -Label $Label -Port $Port -State 'unknown' -Detail '...'

  $layerKey = $Name -replace '^farol-', ''
  $actions = @(
    @{ key = 'start'; text = 'Iniciar' },
    @{ key = 'restart'; text = 'Reiniciar' },
    @{ key = 'stop'; text = 'Parar' },
    @{ key = 'log'; text = 'Ver log' }
  )

  foreach ($act in $actions) {
    $sub = New-Object System.Windows.Forms.ToolStripMenuItem
    $sub.Text = "> $($act.text)"
    $sub.Tag = @{ layer = $layerKey; action = $act.key }
    if ($layerKey -eq 'database' -and $act.key -eq 'stop') {
      $sub.Enabled = $false
      $sub.ToolTipText = 'Postgres: use Servicos do Windows'
    }
    $sub.Add_Click({
      param($sender, $e)
      $tag = $sender.Tag
      if (-not $tag) { return }
      Invoke-OpsTrayLayerAction -Layer ([string]$tag.layer) -Action ([string]$tag.action)
    })
    $parent.DropDownItems.Add($sub) | Out-Null
  }

  return $parent
}

function New-OpsTrayFarolHeaderItem {
  param(
    [string]$Label,
    [string]$State,
    [string]$Detail,
    [int]$Port
  )
  $item = New-OpsTrayMenuItem -Text $Label -Enabled $true
  Set-OpsTrayFarolMenuItem -Item $item -Label $Label -Port $Port -State $State -Detail $Detail
  return $item
}

function Get-OpsTrayMenuItemByName {
  param(
    [System.Windows.Forms.ToolStrip]$Menu,
    [string]$Name
  )
  $found = $Menu.Items.Find($Name, $true)
  if ($found -and @($found).Count -gt 0) {
    return $found[0]
  }
  return $null
}

function Update-OpsTrayFarolMenu {
  param(
    [System.Windows.Forms.ContextMenuStrip]$Menu,
    $Health
  )

  foreach ($layer in $Health.layers) {
    $item = Get-OpsTrayMenuItemByName -Menu $Menu -Name "farol-$($layer.key)"
    if (-not $item) { continue }
    Set-OpsTrayFarolMenuItem -Item $item -Label $layer.label -Port $layer.port -State $layer.state -Detail $layer.detail -LatencyMs $layer.latencyMs
  }

  $header = Get-OpsTrayMenuItemByName -Menu $Menu -Name 'farol-header'
  if ($header) {
    $overallLabel = switch ($Health.overall) {
      'ok' { 'OK' }
      'warn' { 'atencao' }
      'down' { 'degradado' }
      default { '?' }
    }
    $header.Text = "$($Health.tierLabel) - $overallLabel $($Health.okCount)/$($Health.layers.Count)"
    $header.Image = New-OpsTrayStatusDotBitmap $Health.overall
    $header.ForeColor = Get-OpsTrayFarolTextColor $Health.overall
    $header.ToolTipText = "Farol $($Health.tierLabel) - $($Health.checkedAt.ToString('HH:mm:ss'))"
  }
}

function Get-OpsTrayCompositeIcon {
  param(
    [System.Drawing.Icon]$BaseIcon,
    [string]$OverallState
  )

  $size = 32
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.DrawIcon($BaseIcon, (New-Object System.Drawing.Rectangle 0, 0, $size, $size))

  $dotColor = Get-OpsTrayStatusColor $OverallState
  $brush = New-Object System.Drawing.SolidBrush $dotColor
  $g.FillEllipse($brush, 22, 22, 9, 9)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 1.5
  $g.DrawEllipse($pen, 22, 22, 9, 9)

  $brush.Dispose()
  $pen.Dispose()
  $g.Dispose()

  $hIcon = $bmp.GetHicon()
  return [System.Drawing.Icon]::FromHandle($hIcon)
}
