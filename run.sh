#!/bin/bash

echo "=================================================="
echo "   STARTING STRUCTOGRAIM"
echo "=================================================="

# 1. Check for Virtual Environment
if [ ! -d "venv" ]; then
    echo "Error: venv not found. Please run ./install.sh first."
    exit 1
fi

# 2. Activate Virtual Environment
source venv/bin/activate

# 3. Set Environment Variables
# Essential for module imports to work from root
export PYTHONPATH=$PYTHONPATH:.

# Ask for Gemini API Key if not set (Optional but recommended for AI features)
if [ -z "$GEMINI_API_KEY" ]; then
    echo "--------------------------------------------------"
    echo "Enter your Gemini API Key (for Chatbot/Grading)."
    echo "Press ENTER to skip (AI features will fail):"
    read -r input_key
    if [ ! -z "$input_key" ]; then
        export GEMINI_API_KEY=$input_key
    fi
    echo "--------------------------------------------------"
fi

# 4. Start the Application
echo "Starting Backend Server on http://localhost:5000 ..."
echo "Press Ctrl+C to stop."

# Using gunicorn for production-like stability, or fallback to python
if command -v gunicorn &> /dev/null; then
    # 1 Worker, bind to 0.0.0.0 to allow external access if needed
    gunicorn -w 1 -b 0.0.0.0:5000 backend.main:app
else
    python3 -m backend.main
fi