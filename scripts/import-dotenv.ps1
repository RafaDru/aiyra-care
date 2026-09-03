param(
  [Parameter(Mandatory = $true)]
  [string]$Path,
  [switch]$Override
)

if (-not (Test-Path $Path)) { return }

Get-Content $Path | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    $k = $matches[1].Trim()
    $v = $matches[2].Trim()
    if (-not $k -or -not $v) { return }
    $existing = [Environment]::GetEnvironmentVariable($k, 'Process')
    if ($Override -or -not $existing) {
      Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue
    }
  }
}
