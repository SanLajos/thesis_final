#!/bin/bash

# StructogramAI Manual Runner
# Usage: ./run.sh

# --- Configuration ---
APP_DIR="/opt/structogram_ai"
PYTHON_ENV="$APP_DIR/venv"
GUNICORN="$PYTHON_ENV/bin/gunicorn"

# --- 1. Sanity Checks ---
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Application not installed at $APP_DIR."
    echo "   Please run 'sudo ./install.sh' first."
    exit 1
fi

# --- 2. THE USER ISSUE FIX (Permission Check) ---
# This block auto-fixes the "Permission denied" error for app.log
if [ ! -w "$APP_DIR" ]; then
    echo "⚠️  Permission Warning: You do not own the app directory."
    echo "   Fixing permissions so you can run the app..."
    # Takes ownership of the folder to the current user
    sudo chown -R "$USER" "$APP_DIR"
    echo "✅ Permissions fixed."
fi

# --- 3. Environment Setup ---
export DB_PASSWORD="${DB_PASSWORD:-password}"
# IMPORTANT: Add the app dir to PYTHONPATH so python can find 'backend'
export PYTHONPATH="$APP_DIR"

# --- 4. API Key Check ---
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY is missing."
    read -sp "   Enter your Google AI API Key: " INPUT_KEY
    echo ""
    if [ -z "$INPUT_KEY" ]; then
        echo "❌ Error: API Key is required."
        exit 1
    fi
    export GEMINI_API_KEY="$INPUT_KEY"
fi

# --- 5. Launch ---
echo "🚀 Starting StructogramAI on http://localhost:5000..."
cd "$APP_DIR"

# Run Gunicorn pointing to the new module location: backend.main
exec "$GUNICORN" --workers 1 --bind 0.0.0.0:5000 --access-logfile - --error-logfile - backend.main:app