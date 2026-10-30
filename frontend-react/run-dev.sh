#!/bin/bash
# SURAKSHA React Frontend — Quick Start
# Usage: ./frontend-react/run-dev.sh
set -e

echo "🛡️  SURAKSHA — React Frontend Dev Server"
echo "============================================"
echo ""

# Ensure dependencies are installed
if [ ! -d "node_modules/.bin/vite" ] && [ ! -f "node_modules/.bin/vite" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo ""
echo "🚀 Starting dev server at http://localhost:5173"
echo "   Backend proxy → http://localhost:8000 (falls back to offline if unavailable)"
echo "   Data mode: REPLAY (Cyclone Fani 2019 — 100% offline)"
echo ""
npm run dev
