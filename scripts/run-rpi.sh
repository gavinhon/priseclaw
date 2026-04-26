#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo ".env is missing. Copy .env.example to .env and configure it first."
  exit 1
fi

exec node src/main.js
