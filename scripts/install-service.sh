#!/usr/bin/env bash
# Sets up the kegelnetzwerk-web app as a PM2 service with systemd autostart.
# Assumes the app has already been built. Run as any user with sudo access.
# Usage: bash scripts/install-service.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="kegelnetzwerk-web"

# ─── Ask for target user ──────────────────────────────────────────────────────

DEFAULT_USER="${SUDO_USER:-$USER}"
read -rp "Run PM2 service as user [${DEFAULT_USER}]: " INPUT_USER
APP_USER="${INPUT_USER:-$DEFAULT_USER}"
APP_HOME=$(getent passwd "$APP_USER" | cut -d: -f6)

if [ -z "$APP_HOME" ]; then
  echo "ERROR: User '$APP_USER' not found."
  exit 1
fi

echo "==> Using user: $APP_USER (home: $APP_HOME)"

# ─── Install PM2 ─────────────────────────────────────────────────────────────

echo "==> Checking PM2..."
if ! command -v pm2 &>/dev/null; then
  echo "==> Installing PM2 globally..."
  sudo npm install -g pm2
fi

# ─── Remove existing startup hook ────────────────────────────────────────────

echo "==> Removing existing PM2 startup hook (if any)..."
sudo -u "$APP_USER" pm2 unstartup systemd 2>/dev/null || true

# ─── Stop existing process ───────────────────────────────────────────────────

echo "==> Stopping existing PM2 process (if any)..."
sudo -u "$APP_USER" pm2 delete "$APP_NAME" 2>/dev/null || true

# ─── Start app and register autostart ────────────────────────────────────────

echo "==> Starting app with PM2 as '$APP_USER'..."
sudo -u "$APP_USER" pm2 start "$APP_DIR/ecosystem.config.js"

echo "==> Saving PM2 process list..."
sudo -u "$APP_USER" pm2 save

echo "==> Registering PM2 autostart with systemd..."
STARTUP_CMD=$(sudo -u "$APP_USER" pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME" 2>&1 | grep "sudo env PATH" || true)
if [ -n "$STARTUP_CMD" ]; then
  echo "==> Running: $STARTUP_CMD"
  eval "$STARTUP_CMD"
else
  echo "WARNING: Could not extract pm2 startup command."
  echo "         Run the following manually and execute the printed command as root:"
  echo "         sudo -u $APP_USER pm2 startup systemd -u $APP_USER --hp $APP_HOME"
fi

echo ""
echo "Done. '$APP_NAME' is running as '$APP_USER' and will autostart on reboot."
echo "  pm2 status                    — check process status"
echo "  pm2 logs $APP_NAME            — view logs"
echo "  pm2 restart $APP_NAME         — restart after a new build"
