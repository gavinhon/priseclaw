#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Installing Node.js 20 from NodeSource."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

node --version

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env. Edit it with your Telegram token and allowlist before running."
fi

mkdir -p data/audio
npm run check

echo "Install complete."
