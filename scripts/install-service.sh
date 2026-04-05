#!/usr/bin/env bash
# Sets up the kegelnetzwerk-web app as a PM2 service with systemd autostart.
# Run as the app user (not root). Assumes the app has already been built.
# Usage: bash scripts/install-service.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="kegelnetzwerk-web"

echo "==> Checking PM2..."
if ! command -v pm2 &>/dev/null; then
  echo "==> Installing PM2 globally..."
  sudo npm install -g pm2
fi

echo "==> Stopping existing PM2 process (if any)..."
pm2 delete "$APP_NAME" 2>/dev/null || true

echo "==> Starting app with PM2..."
pm2 start "$APP_DIR/ecosystem.config.js"

echo "==> Saving PM2 process list..."
pm2 save

echo "==> Registering PM2 autostart with systemd..."
STARTUP_CMD=$(pm2 startup 2>&1 | grep "sudo env PATH" || true)
if [ -n "$STARTUP_CMD" ]; then
  echo "==> Running: $STARTUP_CMD"
  eval "$STARTUP_CMD"
else
  echo "WARNING: Could not extract pm2 startup command."
  echo "         Run 'pm2 startup' manually and execute the printed command as root."
fi

echo ""
echo "Done. '$APP_NAME' is running and will autostart on reboot."
echo "  pm2 status                    — check process status"
echo "  pm2 logs $APP_NAME            — view logs"
echo "  pm2 restart $APP_NAME         — restart after a new build"
