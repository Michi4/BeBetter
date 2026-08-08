#!/bin/bash
# Dev environment on betterdev.home.websters.at (behind Authelia).
# Live reload: backend nodemon (backend/src mounted) + frontend vite --watch.
set -euo pipefail

cd "$(dirname "$0")"

log() { echo -e "\033[1;36m[dev]\033[0m $*"; }

log "Pulling latest..."
git pull --ff-only || true

log "Building dev image..."
docker compose -f docker-compose.dev.yml build dev-api

log "Starting dev stack (api + postgres + vite watch)..."
docker compose -f docker-compose.dev.yml up -d --wait

log "Verifying health endpoint..."
for i in $(seq 1 12); do
  if curl -fsS -o /dev/null --max-time 10 "https://betterdev.home.websters.at/api/health"; then
    log "Dev healthy at https://betterdev.home.websters.at (Authelia login required)"
    exit 0
  fi
  sleep 5
done

log "WARN: health check via public URL failed (may just need Authelia login). Checking container health instead..."
docker compose -f docker-compose.dev.yml ps