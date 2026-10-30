# SURAKSHA one-command setup - Windows PowerShell
# Run:  .\setup.ps1
# Creates .env, starts the stack, migrates, seeds, and runs the full test
# suite INSIDE the container (no pip, no host Python deps needed).
Set-Location $PSScriptRoot

Write-Host "== SURAKSHA setup =="

if (-not (Test-Path .env)) {
    $jwt = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    @"
POSTGRES_PASSWORD=postgres
JWT_SECRET_KEY=$jwt
FIRMS_MAP_KEY=placeholder_firms_map_key
"@ | Set-Content -Encoding ascii .env
    Write-Host "[OK] .env created (local-demo values)"
} else {
    Write-Host "[OK] .env exists"
}

# Fresh Docker installs are not on the running shell's PATH
$env:Path = 'C:\Program Files\Docker\Docker\resources\bin;' + $env:Path
docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Docker is not running. Start Docker Desktop (whale icon steady) and rerun .\setup.ps1"
    exit 1
}

Write-Host "[..] building + starting stack (first run pulls images, takes a few minutes)..."
docker compose up -d --build --wait --wait-timeout 600
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] stack did not start. Copy the lines above into the team chat."
    exit 1
}

Write-Host "[..] applying migrations..."
docker compose exec -T backend alembic upgrade head | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] migrations failed. Copy the output above into the team chat."; exit 1 }

Write-Host "[..] seeding demo data (idempotent)..."
docker compose exec -T backend python seed_demo.py --scenario all | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] seed failed. Copy the output above into the team chat."; exit 1 }

Write-Host "[..] running full test suite in-container..."
$log = (docker compose exec -T backend python -m pytest -q 2>&1 | Out-String)
($log -split "`n" | Select-Object -Last 3) | ForEach-Object { Write-Host $_.TrimEnd() }

if ($log -match '194 passed') {
    Write-Host "== GREEN: 194 passed. You are ready -- read docs/KICKOFF.md section 2 and start your task card. =="
    exit 0
} else {
    Write-Host "== RED: suite did not report 194 passed. Copy this window's output into the team chat. =="
    exit 1
}
