#!/bin/bash

# ==========================================
# StructogramAI - Fool-Proof Ubuntu Installer
# ==========================================

set -e # Exit immediately if a command exits with a non-zero status

# --- Configuration ---
APP_DIR=$(pwd)
DB_NAME="thesis_project"
DB_USER="postgres"
DB_PASS="password" # Matches your backend/core/init_db.py config
PYTHON_ENV="$APP_DIR/venv"

# Colors for pretty output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[StructogramAI]${NC} $1"; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 1. Root Check
if [ "$EUID" -ne 0 ]; then 
    error "Please run this installer as root: sudo ./install.sh"
fi

log "Starting Installation in $APP_DIR..."

# 2. Install System Dependencies
info "Updating system packages..."
apt-get update -qq
info "Installing Python, Node, Postgres, and build tools..."
apt-get install -y curl git build-essential libmagic1 postgresql postgresql-contrib python3 python3-venv python3-dev python3-pip g++

# 3. Ensure Node.js 18+ (Required for Vite)
NODE_VER=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')
if [ -z "$NODE_VER" ] || [ "$NODE_VER" -lt 18 ]; then
    info "Node.js is old or missing. Installing Node 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# 4. API Key Setup (One-Time Prompt)
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo "--------------------------------------------------------"
    echo " An API Key from Google Gemini is required for AI grading."
    echo "--------------------------------------------------------"
    read -p "Enter your GEMINI_API_KEY (Main/Grading): " INPUT_KEY
    echo "GEMINI_API_KEY=$INPUT_KEY" > "$APP_DIR/.env"

    echo ""
    echo "--------------------------------------------------------"
    echo " (Optional) Enter a separate key for the Chatbot."
    echo " Press ENTER to reuse the Main Key."
    echo "--------------------------------------------------------"
    read -p "Enter your GEMINI_CHAT_KEY: " CHAT_KEY

    # If user hits Enter (empty), use the main key
    if [ -z "$CHAT_KEY" ]; then
        CHAT_KEY="$INPUT_KEY"
    fi
    
    echo "GEMINI_CHAT_KEY=$CHAT_KEY" >> "$APP_DIR/.env"
    log "API Keys saved to .env"
else
    info "Existing .env file found. Skipping API key prompt."
fi

# 5. Frontend Setup
log "Building Frontend..."

# Handle folder naming inconsistency (structogram-frontend vs frontend)
if [ -d "$APP_DIR/structogram-frontend" ] && [ ! -d "$APP_DIR/frontend" ]; then
    mv "$APP_DIR/structogram-frontend" "$APP_DIR/frontend"
    info "Renamed 'structogram-frontend' to 'frontend' folder."
fi

if [ ! -d "$APP_DIR/frontend" ]; then
    error "Frontend folder not found! Please ensure 'frontend' or 'structogram-frontend' exists."
fi

# Build React App
cd "$APP_DIR/frontend"
# Fix permissions so root can build, but revert later
rm -rf node_modules package-lock.json
npm install
npm run build

# Deploy artifacts to Backend Static folder
log "Deploying Frontend artifacts to Backend..."
mkdir -p "$APP_DIR/backend/static"
# Clear existing assets (quotes are intentionally placed to allow globbing)
rm -rf "$APP_DIR/backend/static"/*

# Ensure the build actually produced output before copying
if [ ! -d "dist" ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then
    error "Frontend build failed: 'dist' folder is missing or empty. Check npm output above."
fi

cp -r dist/* "$APP_DIR/backend/static/"

# 6. Backend Setup
cd "$APP_DIR"
log "Setting up Python Virtual Environment..."
if [ -d "$PYTHON_ENV" ]; then rm -rf "$PYTHON_ENV"; fi
python3 -m venv "$PYTHON_ENV"
"$PYTHON_ENV/bin/pip" install --upgrade pip
"$PYTHON_ENV/bin/pip" install -r requirements.txt

# 7. Database Setup
log "Configuring PostgreSQL..."
service postgresql start

# Set postgres user password (matches your DB_CONFIG)
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';" 2>/dev/null || true

# Create Database if not exists
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || sudo -u postgres createdb "$DB_NAME"

# Run Init Script
info "Initializing Database Schema..."
export DB_PASSWORD="$DB_PASS"
export PYTHONPATH="$APP_DIR"
"$PYTHON_ENV/bin/python3" -m backend.core.init_db

# 8. Final Permissions
log "Fixing ownership for user: $SUDO_USER"
chown -R "$SUDO_USER:$SUDO_USER" "$APP_DIR"

echo ""
echo "=========================================="
echo "✅ INSTALLATION COMPLETE!"
echo "=========================================="
echo "To start the app, run:"
echo "   ./run.sh"
echo ""