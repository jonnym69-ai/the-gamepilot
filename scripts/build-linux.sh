#!/bin/bash
# Build GamePilot Linux AppImage inside WSL2
# Run from inside the WSL project directory, e.g.:
#   cd /mnt/c/Users/User/CascadeProjects/windsurf-project-6/gamepilot
#   ./scripts/build-linux.sh

set -e

echo "Building GamePilot for Linux..."

cd "$(dirname "$0")/.."

npm install
npm run build-electron-linux

APP_IMAGE="dist/GamePilot-1.9.0-x86_64.AppImage"
ROOT_IMAGE="GamePilot-1.9.0-x86_64.AppImage"

if [ -f "$APP_IMAGE" ]; then
  echo "Linux AppImage built: $APP_IMAGE"
  cp "$APP_IMAGE" "$ROOT_IMAGE"
  echo "Copied to: $ROOT_IMAGE"
else
  echo "Warning: AppImage not found at $APP_IMAGE"
  exit 1
fi
