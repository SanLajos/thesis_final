#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

echo "=================================================="
echo "   STRUCTOGRAIM INSTALLER - ONE CLICK SETUP"
echo "=================================================="

# 1. Update System & Install Dependencies
echo "[1/6] Installing System Dependencies (Requires Sudo)..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv nodejs npm postgresql postgresql-contrib libpq-dev

# 2. Setup PostgreSQL Database
echo "[2/6] Configuring Database..."
# Start Postgres Service
sudo service postgresql start

# Create User and Database matching backend/core/database.py
# Using || true to ignore errors if they already exist
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password';" || true
sudo -u postgres psql -c "CREATE DATABASE thesis_project OWNER postgres;" || true

# 3. Setup Python Backend
echo "[3/6] Setting up Python Backend..."
if [ -d "venv" ]; then
    echo "      Virtual environment exists. Skipping creation."
else
    python3 -m venv venv
fi

# Activate venv and install requirements
source venv/bin/activate
pip install --upgrade pip
echo "      Installing Python requirements..."
pip install -r requirements.txt

# 4. Initialize Database Schema
echo "[4/6] Initializing Database Schema..."
# We run the init_db script as a module to handle imports correctly
export PYTHONPATH=$PYTHONPATH:.
python3 -m backend.core.init_db

# 5. Setup Frontend (Build & Fix Paths)
echo "[5/6] Building Frontend..."
cd frontend

# Install Node dependencies
if [ ! -d "node_modules" ]; then
    echo "      Installing npm packages..."
    npm install
fi

echo "      Compiling React App..."
npm run build

# --- FIX PATHING ISSUES ---
echo "      Moving Frontend Build to Backend..."
cd ..
# Clear old static files
rm -rf backend/static/*
mkdir -p backend/static

# Check if build output is in 'dist' (Vite) or 'build' (CRA) and move it
if [ -d "frontend/dist" ]; then
    cp -r frontend/dist/* backend/static/
    echo "      Success: Copied 'dist' to 'backend/static'"
elif [ -d "frontend/build" ]; then
    cp -r frontend/build/* backend/static/
    echo "      Success: Copied 'build' to 'backend/static'"
else
    echo "Error: Could not find frontend build folder (dist/ or build/). Check npm run build output."
    exit 1
fi

echo "=================================================="
echo "   INSTALLATION COMPLETE!"
echo "   Run ./run.sh to start the application."
echo "=================================================="