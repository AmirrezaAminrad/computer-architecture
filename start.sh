#!/usr/bin/env bash
# ArchLab easy start - installs webapp deps on first run, then opens the browser.
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install it from https://nodejs.org and run this again."
  exit 1
fi

if [ ! -d webapp/node_modules ]; then
  echo "Installing dependencies - first run only, this takes a minute..."
  npm install --prefix webapp
fi

echo "Starting ArchLab - your browser will open in a moment. Ctrl+C here to stop."
npm run dev
