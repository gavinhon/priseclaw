#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_FILE="/etc/systemd/system/priseclaw.service"

cat > "$SERVICE_FILE" <<SERVICE
[Unit]
Description=PriseClaw personal secretary bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/src/main.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
User=$SUDO_USER

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable priseclaw
systemctl restart priseclaw

echo "priseclaw service installed and started."
