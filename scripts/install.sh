#!/bin/bash

# StructogramAI - Production Installer for Ubuntu
# Usage: sudo ./install.sh

set -e # Exit immediately if a command fails

# --- Configuration ---
APP_DIR="/opt/structogram_ai"
USER_GROUP="structogram_user"
DB_NAME="thesis_project"
DB_PASS="password" # Default dev password
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

log "Installing dependencies (Python, Node.js, PostgreSQL, Compilers)..."
# Install curl to fetch Node setup
apt-get install -y curl

# Setup Node.js 18.x (LTS) repository
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Install all required packages
apt-get install -y \
    python3 \
    python3-venv \
    python3-dev \
    postgresql \
    postgresql-contrib \
    build-essential \
    libmagic1 \
    git \
    nodejs \
    default-jdk \
    g++

# --- 3. Create System User ---
log "Creating system user '$USER_GROUP'..."
if ! id "$USER_GROUP" &>/dev/null; then
    useradd -r -s /bin/bash "$USER_GROUP"
fi

# --- 4. Setup Application Directory ---
log "Setting up application directory at $APP_DIR..."
mkdir -p "$APP_DIR"

# Copy current folder contents to /opt/structogram_ai
# We use rsync or cp. Assuming we are in the root of the repo.
cp -r . "$APP_DIR/"

# Fix permissions immediately
chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"

# --- 5. Frontend Build ---
log "Building Frontend..."
# We run this as the system user to avoid root ownership issues in node_modules
sudo -u "$USER_GROUP" bash <<EOF
    cd "$APP_DIR/frontend"
    if [ -f "package.json" ]; then
        echo "Installing npm packages..."
        npm install
        echo "Building React application..."
        npm run build
    else
        echo "WARNING: package.json not found in frontend/ directory."
    fi
EOF

# Move artifacts to Backend Static folder
log "Deploying Frontend to Backend..."
mkdir -p "$APP_DIR/backend/static"
# Clear old files
rm -rf "$APP_DIR/backend/static/*"

if [ -d "$APP_DIR/frontend/dist" ]; then
    cp -r "$APP_DIR/frontend/dist/"* "$APP_DIR/backend/static/"
elif [ -d "$APP_DIR/frontend/build" ]; then
    cp -r "$APP_DIR/frontend/build/"* "$APP_DIR/backend/static/"
else
    log "⚠️  Warning: Frontend build folder not found. Application will run without UI."
fi

# --- 6. Backend Setup ---
log "Setting up Python Virtual Environment..."
# Clean slate
rm -rf "$PYTHON_ENV"
sudo -u "$USER_GROUP" python3 -m venv "$PYTHON_ENV"

log "Installing Python Requirements..."
sudo -u "$USER_GROUP" "$PYTHON_ENV/bin/pip" install --upgrade pip
sudo -u "$USER_GROUP" "$PYTHON_ENV/bin/pip" install -r "$APP_DIR/requirements.txt"

# --- 7. Database Configuration ---
log "Configuring Database..."
service postgresql start

# Ensure postgres user exists (default on Ubuntu) and set password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';"

# Create DB if not exists
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log "Creating database '$DB_NAME'..."
    sudo -u postgres createdb "$DB_NAME"
fi

log "Initializing Database Schema..."
# Run the init_db module. We set PYTHONPATH so it finds 'backend'
export DB_PASSWORD="$DB_PASS"
cd "$APP_DIR"
sudo -u "$USER_GROUP" DB_PASSWORD="$DB_PASS" PYTHONPATH="$APP_DIR" "$PYTHON_ENV/bin/python3" -m backend.core.init_db

# --- 8. System Service ---
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
# Note: GEMINI_API_KEY must be added here for the service to work fully
# Environment="GEMINI_API_KEY=your_key_here"

# Gunicorn Entry Point -> backend.main:app
ExecStart=$PYTHON_ENV/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 backend.main:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable structogram
# We don't start it automatically yet to let you add the API Key first if needed.

# Fix final permissions one last time
chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"

log "---------------------------------------------------"
log "✅ Installation Complete!"
log "1. App installed to: $APP_DIR"
log "2. To run manually: ./run.sh"
log "3. To run as background service: sudo systemctl start structogram"
log "---------------------------------------------------"