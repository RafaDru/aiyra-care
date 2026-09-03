# Migra sessoes Cursor para workspace\aiyra-care (rename aiyra-cara -> aiyra-care).
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'

$CanonicalRepo = "$env:USERPROFILE\workspace\aiyra-care"
$OldProject = "$env:USERPROFILE\.cursor\projects\c-Users-rafae-workspace-aiyra-cara"
$NewProject = "$env:USERPROFILE\.cursor\projects\c-Users-rafae-workspace-aiyra-care"
$CursorUser = "$env:APPDATA\Cursor\User"
$WorkspaceStorageId = '5af3928c0488a92cfa101f41c1cc400f'
$NewFolderUri = 'file:///c%3A/Users/rafae/workspace/aiyra-care'

$Replacements = @(
  @{ Old = 'C:\Users\rafae\workspace\aiyra-cara'; New = 'C:\Users\rafae\workspace\aiyra-care' },
  @{ Old = 'c:\Users\rafae\workspace\aiyra-cara'; New = 'c:\Users\rafae\workspace\aiyra-care' },
  @{ Old = 'C:/Users/rafae/workspace/aiyra-cara'; New = 'C:/Users/rafae/workspace/aiyra-care' },
  @{ Old = 'c-Users-rafae-workspace-aiyra-cara'; New = 'c-Users-rafae-workspace-aiyra-care' },
  @{ Old = 'c%3A/Users/rafae/workspace/aiyra-cara'; New = 'c%3A/Users/rafae/workspace/aiyra-care' },
  @{ Old = 'c%3A%5CUsers%5Crafae%5Cworkspace%5Caiyra-cara'; New = 'c%3A%5CUsers%5Crafae%5Cworkspace%5Caiyra-care' },
  @{ Old = 'C:\\Users\\rafae\\workspace\\aiyra-cara'; New = 'C:\\Users\\rafae\\workspace\\aiyra-care' },
  @{ Old = 'workspace\aiyra-cara'; New = 'workspace\aiyra-care' },
  @{ Old = 'workspace/aiyra-cara'; New = 'workspace/aiyra-care' },
  @{ Old = 'C:\Users\rafae\Documents\Filhos'; New = 'C:\Users\rafae\workspace\aiyra-care' },
  @{ Old = 'c-Users-rafae-Documents-Filhos'; New = 'c-Users-rafae-workspace-aiyra-care' }
)

function Apply-Replacements([string]$text) {
  foreach ($r in $Replacements) { $text = $text.Replace($r.Old, $r.New) }
  return $text
}

function Update-TextFile([string]$path) {
  if (-not (Test-Path $path)) { return $false }
  $raw = Get-Content -LiteralPath $path -Raw -Encoding utf8
  $new = Apply-Replacements $raw
  if ($new -eq $raw) { return $false }
  if ($DryRun) { Write-Host "[dry-run] $path"; return $true }
  Set-Content -LiteralPath $path -Value $new -NoNewline -Encoding utf8
  return $true
}

function Update-Tree([string]$root, [string[]]$extensions, [bool]$allFiles = $false) {
  if (-not (Test-Path $root)) { return 0 }
  $count = 0
  Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
      if ($_.FullName -match 'node_modules') { return $false }
      if ($allFiles) { return $true }
      ($extensions -contains $_.Extension.ToLowerInvariant())
    } |
    ForEach-Object { if (Update-TextFile $_.FullName) { $count++ } }
  return $count
}

Write-Host '=== Cursor -> workspace\aiyra-care ===' -ForegroundColor Cyan

if (Test-Path $OldProject) {
  if (Test-Path $NewProject) {
    robocopy $OldProject $NewProject /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    if (-not $DryRun) { Remove-Item -LiteralPath $OldProject -Recurse -Force -ErrorAction SilentlyContinue }
  } elseif (-not $DryRun) {
    Move-Item -LiteralPath $OldProject -Destination $NewProject
  }
}

if (Test-Path $NewProject) {
  $n = Update-Tree $NewProject @('.jsonl', '.json', '.txt', '.md', '.tsx', '.ts', '.log')
  Write-Host "Updated $n files in $NewProject"
}

$wsJson = Join-Path $CursorUser "workspaceStorage\$WorkspaceStorageId\workspace.json"
if ((Test-Path $wsJson) -and (-not $DryRun)) {
  Set-Content -LiteralPath $wsJson -Value (@{ folder = $NewFolderUri } | ConvertTo-Json) -Encoding utf8
  Update-Tree (Join-Path $CursorUser "workspaceStorage\$WorkspaceStorageId") @('.json', '.txt', '.md')
}

$n = Update-Tree (Join-Path $CursorUser 'globalStorage\anysphere.cursor-retrieval') @('.json') $true
Write-Host "Updated $n retrieval files"
$n = Update-Tree (Join-Path $CursorUser "History") @('.json')
Write-Host "Updated $n history files"

Write-Host "OK - reabra: $CanonicalRepo" -ForegroundColor Green
