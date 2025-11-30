#!/bin/bash

# ==========================================
# StructogramAI - One-Click Launcher
# ==========================================

APP_DIR=$(dirname "$(realpath "$0")")
PYTHON_ENV="$APP_DIR/venv"
ENV_FILE="$APP_DIR/.env"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[Launcher]${NC} $1"; }
warn() { echo -e "${RED}[Error]${NC} $1"; }

ensure_frontend_assets() {
    # If assets already exist, nothing to do
    if [ -d "$ASSETS_DIR" ] && ls -A "$ASSETS_DIR" >/dev/null 2>&1; then
        return
    fi

    log "Frontend assets missing; attempting rebuild..."

    if [ ! -d "$FRONTEND_DIR" ]; then
        warn "Frontend source not found at $FRONTEND_DIR. Please run: sudo ./install.sh"
        exit 1
    fi

    build_frontend() {
        cd "$FRONTEND_DIR"

        if [ -d node_modules ]; then
            npm run build
        else
            npm install && npm run build
        fi
    }

    if ! build_frontend; then
        warn "Frontend rebuild failed. Run sudo ./install.sh and check npm output."
        exit 1
    fi

    if [ ! -d "$FRONTEND_DIR/dist" ] || [ -z "$(ls -A "$FRONTEND_DIR/dist" 2>/dev/null)" ]; then
        warn "Frontend rebuild produced no assets. Check npm output for errors."
        exit 1
    fi

    mkdir -p "$ASSETS_DIR"
    rm -rf "$ASSETS_DIR"/*
    cp -r "$FRONTEND_DIR/dist/"* "$ASSETS_DIR"/

    log "Frontend assets rebuilt and copied to backend/static."
}

# 1. Environment Check
if [ ! -d "$PYTHON_ENV" ]; then
    warn "Virtual environment not found. Please run: sudo ./install.sh"
    exit 1
fi

# Load API Key
if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | xargs)
else
    warn ".env file missing. Please run: sudo ./install.sh"
    read -p "Or enter API Key now: " GEMINI_API_KEY
    export GEMINI_API_KEY
fi

export DB_PASSWORD="password"
export PYTHONPATH="$APP_DIR"
export FLASK_APP=backend.main:app

# 2. Ensure frontend assets are available (helps fresh runs after a clean install)
ensure_frontend_assets

# 3. Start Database Service (if not running)
if ! pgrep -x "postgres" > /dev/null; then
    log "Starting PostgreSQL..."
    sudo service postgresql start
fi

# 4. Start Backend Server
log "Starting StructogramAI Server..."

# Kill anything currently running on port 5000
fuser -k 5000/tcp > /dev/null 2>&1

# Run Gunicorn in background
"$PYTHON_ENV/bin/gunicorn" --workers 1 --bind 0.0.0.0:5000 backend.main:app > "$APP_DIR/app.log" 2>&1 &
SERVER_PID=$!

log "Server PID: $SERVER_PID. Logs writing to app.log"

# 5. Wait for Server & Open Browser
log "Waiting for server to launch..."

# Function to clean up on exit
cleanup() {
    echo ""
    log "Shutting down..."
    kill $SERVER_PID
    exit
}
trap cleanup SIGINT

# Loop until port 5000 is active
MAX_RETRIES=30
count=0
while ! nc -z localhost 5000; do   
  sleep 1
  count=$((count+1))
  if [ $count -ge $MAX_RETRIES ]; then
      warn "Server failed to start. Check app.log for details."
      cat "$APP_DIR/app.log"
      kill $SERVER_PID
      exit 1
  fi
done

log "Server is UP! Opening Browser..."
sleep 1

# Detect OS and Open Browser
if which xdg-open > /dev/null; then
    xdg-open "http://localhost:5000"
elif which gnome-open > /dev/null; then
    gnome-open "http://localhost:5000"
else
    log "Could not detect browser. Open http://localhost:5000 manually."
fi

# Keep script running to trap Ctrl+C
wait $SERVER_PID