#!/bin/bash

# StructogramAI Manual Runner
APP_DIR="/opt/structogram_ai"
PYTHON_ENV="$APP_DIR/venv"

# 1. Permissions Fix (The "User Issue" Solver)
if [ ! -w "$APP_DIR" ]; then
    echo "🔧 Fixing permissions for current user..."
    sudo chown -R "$USER" "$APP_DIR"
fi

# 2. Env Setup
export DB_PASSWORD="password"
export PYTHONPATH="$APP_DIR" # <--- CRITICAL for imports to work

# 3. Key Prompt
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY is missing."
    read -sp "Enter API Key: " INPUT_KEY
    echo ""
    export GEMINI_API_KEY="$INPUT_KEY"
fi

# 4. Start
echo "🚀 Starting App on http://localhost:5000"
cd "$APP_DIR"
exec "$PYTHON_ENV/bin/gunicorn" --workers 1 --bind 0.0.0.0:5000 --access-logfile - --error-logfile - backend.main:app