# Runner silencioso para Task Scheduler / cron Windows
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      if ($k -and $v) { Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue }
    }
  }
}

npm run ops:alerts-check *> "$root\ops-alerts-cron.log"
