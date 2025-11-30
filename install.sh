#!/bin/bash

# StructogramAI - Fool-Proof Ubuntu Installer
# Usage: sudo ./install.sh

set -e

# --- Configuration ---
APP_DIR="/opt/structogram_ai"
USER_GROUP="structogram_user"
DB_NAME="thesis_project"
DB_PASS="password"
PYTHON_ENV="$APP_DIR/venv"

log() { echo -e "\033[1;32m[StructogramAI] $1\033[0m"; }
error() { echo -e "\033[1;31m[ERROR] $1\033[0m"; exit 1; }

# 1. Root Check
if [ "$EUID" -ne 0 ]; then error "Run as root: sudo ./install.sh"; fi

# 2. Dependencies
log "Installing System Dependencies..."
apt-get update -qq
apt-get install -y curl git build-essential libmagic1 postgresql postgresql-contrib python3 python3-venv python3-dev nodejs npm default-jdk g++

# Node.js Upgrade (ensure 18+)
if [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 18 ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# 3. Setup Directory & User
log "Setting up Application Directory..."
if ! id "$USER_GROUP" &>/dev/null; then useradd -r -s /bin/bash "$USER_GROUP"; fi

# Wipe old install to be safe
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"
cp -r . "$APP_DIR/"

# 4. AUTO-CORRECT FRONTEND FOLDER
cd "$APP_DIR"
if [ -d "structogram-frontend" ]; then
    log "Renaming 'structogram-frontend' to 'frontend'..."
    mv structogram-frontend frontend
elif [ -d "frontend_temp" ]; then
    mv frontend_temp frontend
fi

if [ ! -f "frontend/package.json" ]; then
    error "Could not find frontend/package.json. Please check your upload."
fi

chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"

# 5. Build Frontend
log "Building Frontend (this takes a minute)..."
sudo -u "$USER_GROUP" bash <<EOF
    cd "$APP_DIR/frontend"
    npm install --silent
    npm run build
EOF

# Move artifacts to Backend
log "Deploying Frontend..."
mkdir -p "$APP_DIR/backend/static"
# Copy from dist or build, whichever exists
if [ -d "$APP_DIR/frontend/dist" ]; then
    cp -r "$APP_DIR/frontend/dist/"* "$APP_DIR/backend/static/"
elif [ -d "$APP_DIR/frontend/build" ]; then
    cp -r "$APP_DIR/frontend/build/"* "$APP_DIR/backend/static/"
fi

# 6. Backend Setup
log "Setting up Python Environment..."
sudo -u "$USER_GROUP" python3 -m venv "$PYTHON_ENV"
sudo -u "$USER_GROUP" "$PYTHON_ENV/bin/pip" install --upgrade pip
sudo -u "$USER_GROUP" "$PYTHON_ENV/bin/pip" install -r "$APP_DIR/requirements.txt"

# 7. Database
log "Initializing Database..."
service postgresql start
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || sudo -u postgres createdb "$DB_NAME"

# Init Schema (Run as module to fix imports)
export DB_PASSWORD="$DB_PASS"
cd "$APP_DIR"
sudo -u "$USER_GROUP" DB_PASSWORD="$DB_PASS" PYTHONPATH="$APP_DIR" "$PYTHON_ENV/bin/python3" -m backend.core.init_db

# 8. Service
log "Registering System Service..."
cat > /etc/systemd/system/structogram.service <<EOF
[Unit]
Description=StructogramAI
After=network.target postgresql.service

[Service]
User=$USER_GROUP
Group=$USER_GROUP
WorkingDirectory=$APP_DIR
Environment="PATH=$PYTHON_ENV/bin:/usr/bin"
Environment="DB_PASSWORD=$DB_PASS"
Environment="PYTHONPATH=$APP_DIR"
# Environment="GEMINI_API_KEY=..." # Uncomment and add key for auto-start
ExecStart=$PYTHON_ENV/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 backend.main:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable structogram

# Final Permission Fix
chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"

log "✅ Installation Complete! Run './run.sh' to start."