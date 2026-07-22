param(
  [switch]$Vault,
  [string]$VaultPath = "$env:USERPROFILE\.config\opencode\vault\openhealth.json",
  [switch]$Cloud
)

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot "..\.env"

if ($Cloud) {
  $vars = @{
    SUPABASE_URL = "https://lyljosprzmtapkocmxxa.supabase.co"
    SUPABASE_ANON_KEY = $env:SUPABASE_OPENHEALTH_FRONTEND_KEY
    SUPABASE_SERVICE_ROLE = $env:SUPABASE_OPENHEALTH_SERVICE_ROLE_KEY
    SUPABASE_DATABASE_URL = "postgresql://postgres:${env:SUPABASE_OPENHEALTH_DB_PASSWORD}@db.lyljosprzmtapkocmxxa.supabase.co:5432/postgres"
    SUPABASE_POOL_URL = "postgresql://postgres:${env:SUPABASE_OPENHEALTH_DB_PASSWORD}@db.lyljosprzmtapkocmxxa.supabase.co:6543/postgres?pgbouncer=true"
    NEO4J_URI = "neo4j+s://7cbe171c.databases.neo4j.io"
    NEO4J_USER = $env:NEO4J_USERNAME_INSTANCE
    NEO4J_PASSWORD = $env:NEO4J_INSTANCE_PASSWORD
    GROQ_API_KEY = $env:GROQ_API_KEY
    GITHUB_TOKEN = $env:GITHUB_TOKEN
    GCP_PROJECT_ID = "openhealth-503119"
    GCP_SERVICE_ACCOUNT_KEY = "gcp-key.json"
    GCP_BUCKET = "openhealth-documents-503119"
  }
} else {
  $vars = @{
    DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/openhealth"
    NEO4J_URI = "bolt://localhost:7687"
    NEO4J_USER = "neo4j"
    GROQ_API_KEY = $env:GROQ_API_KEY
    GITHUB_TOKEN = $env:GITHUB_TOKEN
    GCP_PROJECT_ID = "openhealth-503119"
    GCP_SERVICE_ACCOUNT_KEY = "gcp-key.json"
    GCP_BUCKET = "openhealth-documents-503119"
  }
  $vars += @{
    SUPABASE_URL = "https://lyljosprzmtapkocmxxa.supabase.co"
    SUPABASE_ANON_KEY = $env:SUPABASE_OPENHEALTH_FRONTEND_KEY
    SUPABASE_SERVICE_ROLE = $env:SUPABASE_OPENHEALTH_SERVICE_ROLE_KEY
  }
}

if ($Vault) {
  $dir = Split-Path $VaultPath -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $vars | ConvertTo-Json | Set-Content -Path $VaultPath -Encoding utf8
  Write-Host "Vault saved to: $VaultPath" -ForegroundColor Green
} else {
  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add("# Open Health - Environment Variables")
  $lines.Add("# Generated $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
  $lines.Add("")
  foreach ($key in ($vars.Keys | Sort-Object)) {
    $val = $vars[$key]
    if ($val) {
      $lines.Add("${key}=${val}")
    } else {
      $lines.Add("# ${key}=<NOT_SET>")
    }
  }
  $lines.Add("")
  $lines.Add("# === OPTIONAL ===")
  $lines.Add("#OPENAI_API_KEY=<your-key>")

  $content = $lines -join "`r`n"
  Set-Content -Path $envFile -Value $content -Encoding utf8 -NoNewline
  Write-Host ".env created: $envFile" -ForegroundColor Green
  if (-not $Cloud) { Write-Host "Mode: LOCAL (use -Cloud for cloud endpoints)" -ForegroundColor Cyan }
}
