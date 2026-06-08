# Setup local .env from template
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
$example = Join-Path $root ".env.example"

if (-not (Test-Path $envFile)) {
  Copy-Item $example $envFile
  Write-Host "Created .env from .env.example"
} else {
  Write-Host ".env already exists"
}

$content = Get-Content $envFile -Raw
if ($content -notmatch 'JWT_SECRET=.{16,}') {
  Write-Host "Warning: set JWT_SECRET (32+ chars recommended)"
}
if ($content -match 'DATABASE_URL=\s*$' -or $content -match 'DATABASE_URL=\s*\r?\n') {
  Write-Host "Warning: DATABASE_URL is empty — set your PostgreSQL connection string"
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Edit .env — set DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
Write-Host "  2. cd backend; npm.cmd run prod:verify"
