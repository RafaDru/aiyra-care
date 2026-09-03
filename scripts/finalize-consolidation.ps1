# Remove pastas legadas apos reabrir Cursor em workspace\aiyra-care.
$ErrorActionPreference = 'Stop'
$legacy = @(
  'C:\Users\rafae\workspace\aiyra-cara',
  'C:\Users\rafae\Documents\Filhos'
)
foreach ($p in $legacy) {
  if (-not (Test-Path $p)) { Write-Host "skip (missing): $p"; continue }
  $count = (Get-ChildItem -LiteralPath $p -Recurse -File -EA SilentlyContinue | Measure-Object).Count
  if ($count -gt 0 -and $p -like '*Filhos*') {
    Write-Warning "Filhos not empty ($count files) - skipped"
    continue
  }
  try {
    Remove-Item -LiteralPath $p -Recurse -Force
    Write-Host "removed: $p" -ForegroundColor Green
  } catch {
    Write-Warning "could not remove $p (close Cursor and retry): $($_.Exception.Message)"
  }
}
