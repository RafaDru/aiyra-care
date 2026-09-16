function Test-PortListen([int]$Port) {
  try {
    return (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop).Count -gt 0
  } catch { return $false }
}

function Test-UrlGet([string]$Url) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
    return @{ ok = $true; msg = "OK $($r.StatusCode) $Url" }
  } catch {
    return @{ ok = $false; msg = "FAIL $Url" }
  }
}

Write-Host '=== AiyraCare - status dos ambientes ===' -ForegroundColor Cyan
Write-Host ''

$services = @(
  @{ name = 'Dev API'; port = 3010; url = 'http://127.0.0.1:3010/health' },
  @{ name = 'Preview API'; port = 3020; url = 'http://127.0.0.1:3020/health' },
  @{ name = 'Dev Web'; port = 5173; url = 'http://localhost:5173' },
  @{ name = 'Preview Web'; port = 5174; url = 'http://localhost:5174' },
  @{ name = 'Dev Ops'; port = 3013; url = 'http://127.0.0.1:3013/health' },
  @{ name = 'Preview Ops'; port = 3023; url = 'http://127.0.0.1:3023/health' }
)

foreach ($s in $services) {
  $http = Test-UrlGet $s.url
  $color = if ($http.ok) { 'Green' } else { 'Red' }
  Write-Host "  $($s.name): $($http.msg)" -ForegroundColor $color
}

Write-Host ''
Write-Host '=== URLs (localhost) ===' -ForegroundColor Cyan
Write-Host '  Dev web:      http://localhost:5173' -ForegroundColor DarkGray
Write-Host '  Staging web:  http://localhost:5174' -ForegroundColor DarkGray
Write-Host '  Dev ops:      http://127.0.0.1:3013' -ForegroundColor DarkGray
Write-Host '  Staging ops:  http://127.0.0.1:3023' -ForegroundColor DarkGray
