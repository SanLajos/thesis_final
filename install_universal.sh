#!/bin/bash

# StructogramAI Universal Installer (Linux & macOS)
# Usage: 
#   Linux: sudo ./install_universal.sh
#   macOS: ./install_universal.sh (Do NOT use sudo)

set -e

# --- Configuration ---
PROJECT_NAME="StructogramAI"
DB_NAME="thesis_project"
DB_PASS="password" # Dev mode password

# --- OS Detection ---
OS="$(uname -s)"
if [ "$OS" = "Linux" ]; then
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    fi
    APP_DIR="/opt/structogram_ai"
    USER_GROUP="structogram_user"
    IS_MAC=false
elif [ "$OS" = "Darwin" ]; then
    DISTRO="macos"
    APP_DIR="$HOME/structogram_ai"
    USER_GROUP="$(whoami)"
    IS_MAC=true
else
    echo "Unsupported OS: $OS"
    exit 1
fi

PYTHON_ENV="$APP_DIR/venv"

# --- Helper Functions ---
log() { echo -e "\033[1;32m[$PROJECT_NAME] $1\033[0m"; }
error() { echo -e "\033[1;31m[ERROR] $1\033[0m"; exit 1; }

check_requirements() {
    log "Checking prerequisites..."
    if $IS_MAC; then
        if [[ $EUID -eq 0 ]]; then
            error "On macOS, please run this script WITHOUT sudo."
        fi
        if ! command -v brew &> /dev/null; then
            error "Homebrew is required. Install it from https://brew.sh/"
        fi
    else
        if [[ $EUID -ne 0 ]]; then
            error "On Linux, this script must be run as root (sudo)."
        fi
    fi
}

install_deps() {
    log "Installing dependencies for $DISTRO..."
    
    if $IS_MAC; then
        # macOS (Homebrew)
        brew update
        # ADDED: openjdk for Java execution engine
        brew install python node postgresql libmagic openjdk
        
        # Link OpenJDK for system availability
        sudo ln -sfn /usr/local/opt/openjdk/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk.jdk || true
        
        # Start Postgres
        brew services start postgresql || true
        sleep 5
    else
        # Linux
        case $DISTRO in
            ubuntu|debian)
                apt-get update
                curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
                # Included: default-jdk and g++
                apt-get install -y python3 python3-venv python3-dev postgresql postgresql-contrib build-essential libmagic1 git curl nodejs default-jdk g++
                service postgresql start
                ;;
            centos|rhel|fedora)
                curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
                # Included: java-1.8.0-openjdk-devel and gcc-c++
                yum install -y python3 python3-devel postgresql-server postgresql-contrib gcc file git curl nodejs java-1.8.0-openjdk-devel gcc-c++
                postgresql-setup --initdb || true
                systemctl start postgresql
                ;;
            *)
                error "Unsupported Linux distribution: $DISTRO"
                ;;
        esac
    fi
}

setup_app_dir() {
    log "Setting up application directory at $APP_DIR..."
    
    if $IS_MAC; then
        mkdir -p "$APP_DIR"
    else
        if ! id "$USER_GROUP" &>/dev/null; then
            useradd -r -s /bin/bash "$USER_GROUP"
        fi
        mkdir -p "$APP_DIR"
        chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"
    fi

    log "Copying files..."
    cp -r * "$APP_DIR/" || true
    
    if ! $IS_MAC; then
        chown -R "$USER_GROUP:$USER_GROUP" "$APP_DIR"
    fi
}

build_frontend() {
    log "Building Frontend..."
    cd "$APP_DIR"
    if [ -f "package.json" ]; then
        npm install
        npm run build
        mkdir -p static
        if [ -d "dist" ]; then cp -r dist/* static/; 
        elif [ -d "build" ]; then cp -r build/* static/; fi
    else
        log "No package.json found, skipping frontend build."
    fi
}

setup_backend() {
    log "Configuring Backend..."
    cd "$APP_DIR"
    
    if $IS_MAC; then
        python3 -m venv "$PYTHON_ENV"
    else
        sudo -u "$USER_GROUP" python3 -m venv "$PYTHON_ENV"
    fi

    "$PYTHON_ENV/bin/pip" install -r requirements.txt

    log "Initializing Database..."
    if $IS_MAC; then
        createdb "$DB_NAME" 2>/dev/null || true
        psql -d "$DB_NAME" -c "CREATE USER postgres WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
        psql -d "$DB_NAME" -c "ALTER USER postgres WITH SUPERUSER;" 2>/dev/null || true
        DB_PASSWORD=$DB_PASS "$PYTHON_ENV/bin/python3" init_db.py
    else
        sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASS';"
        sudo -u postgres createdb "$DB_NAME" 2>/dev/null || true
        sudo -u "$USER_GROUP" DB_PASSWORD=$DB_PASS "$PYTHON_ENV/bin/python3" init_db.py
    fi
}

create_service() {
    log "Creating System Service..."
    
    if $IS_MAC; then
        PLIST_PATH="$HOME/Library/LaunchAgents/com.structogram.ai.plist"
        cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.structogram.ai</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PYTHON_ENV/bin/gunicorn</string>
        <string>--workers</string>
        <string>3</string>
        <string>--bind</string>
        <string>0.0.0.0:5000</string>
        <string>main_server:app</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$APP_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$PYTHON_ENV/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin</string>
        <key>DB_PASSWORD</key>
        <string>$DB_PASS</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        launchctl load "$PLIST_PATH"
        log "Service installed! Managing via launchctl."
    else
        SERVICE_PATH="/etc/systemd/system/structogram.service"
        cat > "$SERVICE_PATH" <<EOF
[Unit]
Description=StructogramAI Backend Server
After=network.target postgresql.service

[Service]
User=$USER_GROUP
Group=$USER_GROUP
WorkingDirectory=$APP_DIR
Environment="PATH=$PYTHON_ENV/bin:/usr/bin"
Environment="DB_PASSWORD=$DB_PASS"
ExecStart=$PYTHON_ENV/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 main_server:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF
        systemctl daemon-reload
        systemctl enable structogram
        systemctl restart structogram
        log "Systemd service installed and started."
    fi
}

check_requirements
install_deps
setup_app_dir
build_frontend
setup_backend
create_service

log "---------------------------------------------------"
log "Installation Complete! 🚀"
log "Access the app at: http://localhost:5000"
log "---------------------------------------------------"