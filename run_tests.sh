#!/bin/bash

# 1. Install Dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# 2. Run All Unit Tests
echo "Running Unit Tests..."
pytest tests/ -v
