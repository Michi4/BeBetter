#!/bin/bash
# Zero-downtime blue-green deploy for BeBetter.
#
# Flow:
#   1. Build the new backend image (tags it `bebetter-backend`).
#   2. Start the "green" instance with the new image and WAIT until healthy.
#      Traefik's load-balancer health check keeps routing traffic to the
#      still-running "blue" instance until green passes /api/health.
#   3. Remove the old blue instance.
#   4. Recreate blue with the new image and wait until healthy
#      (green keeps serving traffic during blue's startup).
#   5. Remove green.
#
# The scheduler uses a PostgreSQL advisory lock, so the brief blue+green
# overlap can never double-run the demo reset or duplicate reminders.
set -euo pipefail

cd "$(dirname "$0")"

log() { echo -e "\033[1;36m[deploy]\033[0m $*"; }

# Rollback aid: tag the currently-live image before overwriting the tag.
# Roll back with: docker tag bebetter-backend:prev bebetter-backend && ./deploy.sh
PREV_TAG="bebetter-backend:prev-$(date +%Y%m%d-%H%M%S)"
if docker image inspect bebetter-backend >/dev/null 2>&1; then
  log "Tagging live image as $PREV_TAG (rollback point)..."
  docker tag bebetter-backend "$PREV_TAG"
fi

# Never leave a half-deployed green attached to the live Traefik service.
cleanup_green() {
  if docker ps --format '{{.Names}}' | grep -qx 'bebetter-api-green'; then
    log "Cleaning up orphan green instance..."
    docker compose rm -sf backend-green || true
  fi
}
trap cleanup_green EXIT

# Pre-deploy snapshot: fast pg_dump so a bad release (or bad db push) is
# recoverable without waiting for the nightly backup.
SNAP="backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql"
if docker ps --format '{{.Names}}' | grep -qx 'bebetter-db'; then
  log "Snapshotting live DB to $SNAP..."
  mkdir -p backups
  if docker exec bebetter-db pg_dump -U "${POSTGRES_USER:-bebetter}" -d "${POSTGRES_DB:-bebetter_db}" --clean --if-exists > "$SNAP" 2>/dev/null; then
    ls -1t backups/pre-deploy-*.sql 2>/dev/null | tail -n +6 | xargs -r rm -f
  else
    log "WARNING: snapshot failed, continuing without it."
    rm -f "$SNAP"
  fi
fi

log "Building image..."
docker compose build backend

log "Starting green instance (new image)..."
docker compose up -d backend-green --wait

log "Removing old blue instance..."
docker compose rm -sf backend

log "Recreating blue instance (green keeps serving)..."
docker compose up -d backend --wait

log "Removing green instance..."
docker compose rm -sf backend-green

sleep 3
log "Verifying health endpoint..."
if curl -fsS -o /dev/null --max-time 10 https://bebetter.websters.at/api/health; then
  log "Deploy complete — service is healthy."
else
  log "WARNING: health endpoint not reachable, inspect containers:"
  docker compose ps
  exit 1
fi
