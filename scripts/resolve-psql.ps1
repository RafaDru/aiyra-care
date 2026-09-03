# Returns path to psql.exe (PATH or PostgreSQL install).
$cmd = Get-Command psql -ErrorAction SilentlyContinue
if ($cmd) { return $cmd.Source }
foreach ($ver in @(17, 16, 15, 14)) {
  $p = "C:\Program Files\PostgreSQL\$ver\bin\psql.exe"
  if (Test-Path $p) { return $p }
}
throw 'psql not found — install PostgreSQL or add to PATH'
