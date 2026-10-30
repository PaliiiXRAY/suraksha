#!/usr/bin/env bash
# SURAKSHA one-command setup — macOS / Linux
# Creates .env, handles Apple Silicon PostGIS, starts the stack, migrates,
# seeds, and runs the full test suite INSIDE the container (no pip needed).
set -euo pipefail
cd "$(dirname "$0")"

echo "== SURAKSHA setup =="

if [ ! -f .env ]; then
  JWT="$(python3 -c 'import secrets; print(secrets.token_hex(32))' 2>/dev/null || openssl rand -hex 32)"
  cat > .env <<EOF
POSTGRES_PASSWORD=postgres
JWT_SECRET_KEY=$JWT
FIRMS_MAP_KEY=placeholder_firms_map_key
EOF
  echo "[OK] .env created (local-demo values)"
else
  echo "[OK] .env exists"
fi

if [ "$(uname -m)" = "arm64" ]; then
  cat > docker-compose.override.yml <<'EOF'
services:
  db:
    platform: linux/amd64
EOF
  echo "[OK] Apple Silicon detected -> db pinned to linux/amd64 (PostGIS ships amd64-only)"
fi

if ! docker info >/dev/null 2>&1; then
  echo "[FAIL] Docker is not running. Start Docker Desktop (or dockerd) and rerun."
  exit 1
fi

echo "[..] building + starting stack (first run pulls images, takes a few minutes)..."
docker compose up -d --build --wait --wait-timeout 600

echo "[..] applying migrations..."
docker compose exec -T backend alembic upgrade head >/dev/null
echo "[OK] migrations applied"

echo "[..] seeding demo data (idempotent)..."
docker compose exec -T backend python seed_demo.py --scenario all >/dev/null
echo "[OK] seeded"

echo "[..] running full test suite in-container..."
LOG="$(mktemp)"
docker compose exec -T backend python -m pytest -q 2>&1 | tee "$LOG" | tail -n 1

if grep -q "194 passed" "$LOG"; then
  echo "== GREEN: 194 passed. You are ready -- read docs/KICKOFF.md section 2 and start your task card. =="
else
  echo "== RED: suite did not report 194 passed. Screenshot/copy this output into the team chat. =="
  rm -f "$LOG"
  exit 1
fi
rm -f "$LOG"
