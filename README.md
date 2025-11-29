````markdown
# StructogramAI 🎓

**StructogramAI** is an intelligent tutoring and automated assessment system designed to bridge the gap between algorithmic logic (visual diagrams) and implementation (source code).

Developed as a Computer Science Thesis project, it allows students to submit **Flowcharts** or **Nassi-Shneiderman** diagrams (via XML or Image). The system translates these diagrams into executable code (Python, C++, or Java), analyzes their logic, detects plagiarism, and provides AI-driven grading feedback.

## 🚀 Key Features

### 🧠 Core Logic Analysis
* **Visual-to-Code Translation**: Converts `.xml` (Draw.io) and Image files into working Python, C++, or Java code.
* **Hybrid Parsing**:
    * *Deterministic*: XML parsing for strict logic validation.
    * *Probabilistic*: Computer Vision & AI (Gemini Vision) for image-based submissions.
* **Control Flow Graph (CFG) Engine**: Analyzes code structure to detect **Dead Code**, **Infinite Loops**, and **Uninitialized Variables**.

### 📊 Automated Grading & Metrics
* **Cyclomatic Complexity**: Calculates McCabe's complexity score to assess algorithmic efficiency.
* **Static Analysis**: Checks for code smells, nesting depth, and naming conventions.
* **Security Sandbox**: Safely executes student code in a restricted environment to run input/output test cases.
* **AI Feedback**: Uses LLMs to provide qualitative feedback, debugging hints, and "Reasoning Traces" for students.

### 🛡️ Academic Integrity
* **Graph Signature Plagiarism Detection**: Instead of text comparison, it compares the *topological signature* (nodes, edges, degrees) of the logic graph. This catches students who simply rename variables.

### 💻 Full-Stack Experience
* **Interactive Frontend**: React-based dashboard with Toast notifications and real-time status.
* **AI Tutor Chatbot**: Built-in context-aware chatbot to answer programming questions.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.10+, Flask, Gunicorn
* **Frontend**: React 18, Tailwind CSS, Lucide Icons
* **Database**: PostgreSQL 15+
* **AI/ML**: Google Gemini API (1.5 Flash), OpenCV (Computer Vision)
* **Analysis Tools**: `libmagic`, Custom CFG Parsers

---

## 📥 Installation

### Prerequisites
* **OS**: Linux (Ubuntu/Debian/RHEL) or macOS.
* **Python**: 3.10 or higher.
* **Node.js**: 18+ (for frontend building).
* **PostgreSQL**: Installed and running.

### Option 1: One-Click Universal Installer (Recommended)
This script auto-detects your OS, installs system dependencies (compilers, libraries), sets up the database, and builds the frontend.

```bash
# 1. Make scripts executable
chmod +x install_universal.sh run.sh

# 2. Run Installer
# Linux:
sudo ./install_universal.sh

# macOS:
./install_universal.sh
````

### Option 2: Manual Installation

**1. Backend Setup**

```bash
# Create Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Initialize Database (Ensure Postgres is running first)
export DB_PASSWORD="your_db_password"
python init_db.py
```

**2. Frontend Setup**

```bash
cd frontend
npm install
npm run build
# The build artifacts will be moved to the backend 'static' folder automatically
```

-----

## 🚦 Usage

### Starting the Application

Use the provided run script to start the server with the correct environment variables.

```bash
# You will be prompted for your Gemini API Key if not set
./run.sh
```

  * **Frontend**: Access via `http://localhost:5000`
  * **API Docs**: Access via `http://localhost:5000/api/status`

### Environment Variables

You can manually set these in your shell or a `.env` file:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Required.** Google AI Studio Key. | None |
| `DB_PASSWORD` | PostgreSQL password for `postgres` user. | `password` |
| `SECRET_KEY` | Flask session security key. | *(Hardcoded dev key)* |

-----

## 🧪 Testing

The project includes a comprehensive test suite covering Core Logic, Parsers, Security, and API endpoints.

```bash
# Run the full test suite
./run_tests.sh
```

**Test Coverage:**

  * `tests/test_core_logic.py`: Code generation & complexity math.
  * `tests/test_parsers.py`: XML & Image parsing logic.
  * `tests/test_security.py`: Auth & Password hashing.
  * `tests/test_api.py`: Integration tests for API endpoints.

-----

## 📂 Project Structure

```text
.
├── main_server.py            # Entry point (Flask App)
├── structogram-frontend/     # React Frontend Source
├── tests/                    # Unit & Integration Tests
├── uploads/                  # Storage for submitted diagrams
├── auth.py                   # JWT Authentication & Security
├── ai_grader.py              # LLM Grading Interface
├── cfg_analyzer.py           # Graph Theory & Control Flow Analysis
├── plagiarism_detector.py    # Graph Signature Comparison Logic
├── execution_engine.py       # Code Sandbox (Python/C++/Java)
├── *_parser.py               # Parsers for XML/Images
└── install_universal.sh      # Setup Script
```

## 📄 License

This project is licensed under the **Apache License 2.0**. See the `LICENSE` file for details.

```
```