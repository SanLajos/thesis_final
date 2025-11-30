# StructogramAI Restructuring Script for Windows PowerShell

$ErrorActionPreference = "Stop"

Write-Host "[INFO] Creating directory structure..." -ForegroundColor Cyan

# Define directories
$dirs = @(
    "backend/core",
    "backend/services/parsers",
    "backend/services/grading",
    "backend/services/analysis",
    "backend/services/execution",
    "backend/schemas",
    "backend/static",
    "scripts"
)

# Create directories if they don't exist
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

Write-Host "[INFO] Moving files..." -ForegroundColor Cyan

# Helper function to move and rename safely
function Move-File ($src, $dest) {
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "Moved $src -> $dest" -ForegroundColor Green
    } else {
        Write-Host "Skipped $src (Not found)" -ForegroundColor Yellow
    }
}

# Core
Move-File "auth.py" "backend/core/auth.py"
Move-File "db_utils.py" "backend/core/database.py"
Move-File "logger_config.py" "backend/core/logger.py"
Move-File "api_utils.py" "backend/core/api_utils.py"
Move-File "init_db.py" "backend/core/init_db.py"

# Parsers
Move-File "flowchart_diagram_parser.py" "backend/services/parsers/flowchart.py"
Move-File "nassi_shneiderman_parser.py" "backend/services/parsers/nassi.py"
Move-File "image_diagram_parser.py" "backend/services/parsers/image.py"

# Grading
Move-File "ai_grader.py" "backend/services/grading/ai_grader.py"
Move-File "keyword_grader.py" "backend/services/grading/keyword.py"
Move-File "static_analysis_grader.py" "backend/services/grading/static_analysis.py"

# Analysis
Move-File "cfg_analyzer.py" "backend/services/analysis/cfg.py"
Move-File "complexity_analyzer.py" "backend/services/analysis/complexity.py"
Move-File "plagiarism_detector.py" "backend/services/analysis/plagiarism.py"

# Execution
Move-File "execution_engine.py" "backend/services/execution/engine.py"
Move-File "code_generators.py" "backend/services/execution/generators.py"

# Chatbot
Move-File "chatbot_engine.py" "backend/services/chatbot.py"

# Schemas & Main
Move-File "validation.py" "backend/schemas/validation.py"
Move-File "main_server.py" "backend/main.py"

# Scripts
Move-File "install.sh" "scripts/install.sh"
Move-File "run.sh" "scripts/run.sh"
Move-File "run_tests.sh" "scripts/run_tests.sh"
Move-File "install_universal.sh" "scripts/install_universal.sh"

# Frontend (Rename Folder)
if (Test-Path "structogram-frontend") {
    Rename-Item -Path "structogram-frontend" -NewName "frontend"
    Move-Item -Path "frontend" -Destination "frontend_temp"
    Move-Item -Path "frontend_temp" -Destination "."
    Write-Host "Renamed structogram-frontend -> frontend" -ForegroundColor Green
}

Write-Host "[INFO] Creating __init__.py files..." -ForegroundColor Cyan

$inits = @(
    "backend/__init__.py",
    "backend/core/__init__.py",
    "backend/services/__init__.py",
    "backend/services/parsers/__init__.py",
    "backend/services/grading/__init__.py",
    "backend/services/analysis/__init__.py",
    "backend/services/execution/__init__.py",
    "backend/schemas/__init__.py"
)

foreach ($init in $inits) {
    if (-not (Test-Path $init)) {
        New-Item -ItemType File -Path $init | Out-Null
    }
}

Write-Host "[OK] Restructuring complete!" -ForegroundColor Green