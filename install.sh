#!/bin/bash

# StructogramAI - Production Installer for Ubuntu
# Usage: sudo ./install.sh

set -e # Exit immediately if a command fails

# --- Configuration ---
APP_DIR="/opt/structogram_ai"
USER_GROUP="structogram_user"
DB_NAME="thesis_project"
DB_PASS="password"
PYTHON_ENV="$APP_DIR/venv"

# --- Helper Functions ---
log() { echo -e "\033[1;32m[StructogramAI] $1\033[0m"; }
error() { echo -e "\033[1;31m[ERROR] $1\033[0m"; exit 1; }

# --- 1. Pre-flight Checks ---
if [ "$EUID" -ne 0 ]; then
  error "This script must be run as root. Please use 'sudo ./install.sh'."
fi

# --- 2. System Updates & Dependencies ---
log "Updating system packages..."
apt-get update

log "Installing dependencies..."
apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y python3 python3-venv python3-dev postgresql postgresql-contrib build-essential libmagic1 git nodejs default-jdk g++

# --- 3. Create System User ---
log "Creating system user '$USER_GROUP'..."
if ! id "$USER_GROUP" &>/dev/null; then
    useradd -r -s /bin/bash "$USER_GROUP"
fi

# --- 4. Setup Application Directory ---
log "Setting up application directory at $APP_DIR..."
mkdir -p "$APP_DIR"
cp -r . "$APP_DIR/"
chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"

# --- 5. AUTO-FIX FRONTEND FOLDER ---
cd "$APP_DIR"
if [ -d "frontend_temp" ]; then
    log "Renaming 'frontend_temp' to 'frontend'..."
    mv frontend_temp frontend
elif [ -d "structogram-frontend" ]; then
    log "Renaming 'structogram-frontend' to 'frontend'..."
    mv structogram-frontend frontend
fi
chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"

# --- 6. Frontend Build ---
log "Building Frontend..."
sudo -u "$USER_GROUP" bash <<EOF
    cd "$APP_DIR/frontend"
    if [ -f "package.json" ]; then
        npm install
        npm run build
    else
        echo "⚠️  WARNING: package.json not found. Skipping build."
    fi
EOF

# Deploy Static Files
mkdir -p "$APP_DIR/backend/static"
rm -rf "$APP_DIR/backend/static/*"

if [ -d "$APP_DIR/frontend/dist" ]; then
    cp -r "$APP_DIR/frontend/dist/"* "$APP_DIR/backend/static/"
elif [ -d "$APP_DIR/frontend/build" ]; then
    cp -r "$APP_DIR/frontend/build/"* "$APP_DIR/backend/static/"
fi

# --- 7. Backend Setup ---
log "Setting up Python Virtual Environment..."
rm -rf "$PYTHON_ENV"
sudo -u "$USER_GROUP" python3 -m venv "$PYTHON_ENV"

log "Installing Python Requirements..."
sudo -u "$USER_GROUP" "$PYTHON_ENV/bin/pip" install --upgrade pip
sudo -u "$USER_GROUP" "$PYTHON_ENV/bin/pip" install -r "$APP_DIR/requirements.txt"

# --- 8. Database Configuration ---
log "Configuring Database..."
service postgresql start
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';"
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    sudo -u postgres createdb "$DB_NAME"
fi

log "Initializing Database Schema..."
export DB_PASSWORD="$DB_PASS"
sudo -u "$USER_GROUP" DB_PASSWORD="$DB_PASS" PYTHONPATH="$APP_DIR" "$PYTHON_ENV/bin/python3" -m backend.core.init_db

# --- 9. System Service ---
log "Installing Systemd Service..."
SERVICE_FILE="/etc/systemd/system/structogram.service"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=StructogramAI Backend Server
After=network.target postgresql.service

[Service]
User=$USER_GROUP
Group=$USER_GROUP
WorkingDirectory=$APP_DIR
Environment="PATH=$PYTHON_ENV/bin:/usr/bin"
Environment="DB_PASSWORD=$DB_PASS"
# Environment="GEMINI_API_KEY=YOUR_KEY_HERE"

ExecStart=$PYTHON_ENV/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 backend.main:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable structogram

# Final Permission Fix
chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"

log "---------------------------------------------------"
log "✅ Installation Complete!"
log "---------------------------------------------------"