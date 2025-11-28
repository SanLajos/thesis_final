#!/bin/bash

# StructogramAI Universal Linux Installer
# Supports: Ubuntu/Debian, CentOS/RHEL, Fedora
# Usage: sudo ./install.sh

set -e

# --- Configuration ---
APP_DIR="/opt/structogram_ai"
USER="structogram_user"
DB_NAME="thesis_project"
DB_USER="postgres" # Default postgres superuser
DB_PASS="password" # CHANGE THIS IN PRODUCTION
PYTHON_ENV="$APP_DIR/venv"
FRONTEND_DIR="frontend" # Expecting frontend source code here relative to script

# --- Helper Functions ---
log() {
    echo -e "\033[1;32m[StructogramAI] $1\033[0m"
}

error() {
    echo -e "\033[1;31m[ERROR] $1\033[0m"
    exit 1
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        error "Cannot detect OS. /etc/os-release missing."
    fi
}

install_deps() {
    log "Installing system dependencies for $OS..."
    case $OS in
        ubuntu|debian)
            apt-get update
            # Install Node.js (using curl setup for LTS)
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            # Added: default-jdk (Java) and g++ (C++)
            apt-get install -y python3 python3-venv python3-dev postgresql postgresql-contrib build-essential libmagic1 git curl nodejs default-jdk g++
            ;;
        centos|rhel)
            # Install Node.js
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            # Added: java-1.8.0-openjdk-devel (Java) and gcc-c++ (C++)
            yum install -y python3 python3-devel postgresql-server postgresql-contrib gcc file git curl nodejs java-1.8.0-openjdk-devel gcc-c++
            postgresql-setup --initdb || true
            systemctl enable --now postgresql
            ;;
        fedora)
            # Install Node.js
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            # Added: java-1.8.0-openjdk-devel (Java) and gcc-c++ (C++)
            dnf install -y python3 python3-devel postgresql-server postgresql-contrib gcc file git curl nodejs java-1.8.0-openjdk-devel gcc-c++
            postgresql-setup --initdb || true
            systemctl enable --now postgresql
            ;;
        *)
            error "Unsupported OS: $OS"
            ;;
    esac
}

setup_user() {
    if id "$USER" &>/dev/null; then
        log "User $USER already exists."
    else
        log "Creating system user $USER..."
        useradd -r -s /bin/bash $USER
    fi
    
    # Create App Directory
    mkdir -p $APP_DIR
    chown -R $USER:$USER $APP_DIR
}

setup_database() {
    log "Configuring PostgreSQL..."
    
    # Check if DB exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        log "Database $DB_NAME already exists."
    else
        log "Creating Database $DB_NAME..."
        # Set password for postgres user (Thesis Dev Mode)
        sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASS';"
        sudo -u postgres createdb $DB_NAME
    fi
}

build_frontend() {
    log "Building Frontend..."
    
    # Check if we have package.json in the current directory or a subdir
    if [ -f "package.json" ]; then
        log "Found package.json in root. Installing dependencies..."
        npm install
        npm run build
        # Move build artifacts to a standardized location Flask can find
        mkdir -p $APP_DIR/static
        # Typically React builds to 'dist' or 'build'
        if [ -d "dist" ]; then
            cp -r dist/* $APP_DIR/static/
        elif [ -d "build" ]; then
            cp -r build/* $APP_DIR/static/
        else
            error "Frontend build failed: Could not find 'dist' or 'build' directory."
        fi
    else
        log "WARNING: No frontend (package.json) found. Skipping build."
    fi
}

deploy_app() {
    log "Deploying Backend Application..."
    
    # Copy backend files (Assume script is run from project root)
    # We copy everything, but the frontend build artifacts are already moved to $APP_DIR/static
    cp -r *.py $APP_DIR/
    if [ -d "uploads" ]; then cp -r uploads $APP_DIR/; fi
    
    chown -R $USER:$USER $APP_DIR

    # Setup Python Venv
    log "Setting up Python Virtual Environment..."
    sudo -u $USER python3 -m venv $PYTHON_ENV
    sudo -u $USER $PYTHON_ENV/bin/pip install -r requirements.txt
    
    # Initialize DB Tables
    log "Initializing Database Schema..."
    export PGPASSWORD=$DB_PASS 
    sudo -u $USER DB_PASSWORD=$DB_PASS $PYTHON_ENV/bin/python3 $APP_DIR/init_db.py
}

create_service() {
    log "Creating Systemd Service..."
    
    cat > /etc/systemd/system/structogram.service <<EOF
[Unit]
Description=StructogramAI Backend Server
After=network.target postgresql.service

[Service]
User=$USER
Group=$USER
WorkingDirectory=$APP_DIR
Environment="PATH=$PYTHON_ENV/bin:/usr/bin"
Environment="DB_PASSWORD=$DB_PASS"
Environment="GEMINI_API_KEY=YOUR_API_KEY_HERE"
# Serve static files logic is handled inside Flask now
ExecStart=$PYTHON_ENV/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 main_server:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable structogram
    log "Service created. Start with: sudo systemctl start structogram"
}

# --- Main Execution ---
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root."
fi

detect_os
install_deps
setup_user
setup_database
build_frontend  # <-- Added Step
deploy_app
create_service

log "Installation Complete! 🚀"
log "1. Edit /etc/systemd/system/structogram.service to add your GEMINI_API_KEY."
log "2. Run: sudo systemctl start structogram"
log "3. Access the app at http://localhost:5000"