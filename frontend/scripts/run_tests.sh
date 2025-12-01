#!/bin/bash

# ==========================================
# StructogramAI - Test Runner
# ==========================================

# 1. Ensure we are in the project root directory
# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Project root is one level up from scripts/
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "📂 Project Root: $PROJECT_ROOT"

# 2. Add the Project Root to PYTHONPATH
# This fixes "ModuleNotFoundError: No module named 'backend'"
export PYTHONPATH=$PYTHONPATH:"$PROJECT_ROOT"

# 3. Install Dependencies (Optional, uncomment if needed often)
# echo "📦 Installing dependencies..."
# pip install -r requirements.txt --quiet

# 4. Run All Unit Tests
echo "🚀 Running Unit Tests..."
# -v : Verbose
# -p no:cacheprovider : Prevents pycache issues
python3 -m pytest tests/ -v -p no:cacheprovider