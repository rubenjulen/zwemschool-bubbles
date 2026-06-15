#!/usr/bin/env bash
# ============================================================
# Zwemschool Bubbles - deploy naar Hetzner (WSL / macOS / Linux)
# ------------------------------------------------------------
# Bubbles is een Next.js-app (SSR), dus we BOUWEN OP DE SERVER en herstarten
# de systemd-service - anders dan de statische MensSana-build.
#
# Eenmalige voorbereiding op de server (zie docs/8-deploy-hetzner.md):
#   - repo gekloond in /var/www/bubbles
#   - /var/www/bubbles/.env.production.local ingevuld
#   - systemd-service 'bubbles' actief, Caddy als reverse proxy
#
# Pas SERVER aan en draai vanuit de projectmap:  ./scripts/deploy.sh
# ============================================================
set -euo pipefail

SERVER="root@<SERVER_IP>"        # Hetzner server
APP_DIR="/var/www/bubbles"
SERVICE="bubbles"
DOMAIN="https://bubbles.koniq.app"

echo "Deployen naar $SERVER ..."
ssh "$SERVER" "set -e
  cd '$APP_DIR'
  git pull --ff-only
  npm ci
  npm run build
  systemctl restart '$SERVICE'
  sleep 2
  systemctl --no-pager status '$SERVICE' | head -n 5"

echo "Klaar. Controleer $DOMAIN"
