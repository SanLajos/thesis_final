# StructogramAI 🎓

**StructogramAI** is an advanced educational platform designed to bridge the gap between visual algorithmic logic and executable code. Developed as a Computer Science Thesis project, it serves as an intelligent tutoring system that allows students to design logic using **Flowcharts** or **Nassi-Shneiderman** diagrams and automatically converts, analyzes, and grades them.

The system features a **Hybrid Parsing Engine** (Deterministic XML + Probabilistic AI Vision), a secure **Code Execution Sandbox**, and a sophisticated **Plagiarism Detector** based on graph topology.

## 🚀 Key Features

### 🧠 Core Logic & Translation

  * **Multi-Modal Input**: Supports **Draw.io XML** files (Flowcharts/Nassi-Shneiderman) and **Image uploads** (PNG/JPG).
  * **Polglot Code Generation**: Automatically transpiles diagrams into syntactically correct **Python**, **C++**, or **Java** source code.
  * **AI Vision Integration**: Uses **Google Gemini 1.5 Flash** to interpret hand-drawn or rasterized diagrams when XML metadata is unavailable.

### 📊 Deep Static Analysis & Metrics

  * **Control Flow Graph (CFG) Engine**: detailed analysis of the logic graph to detect:
      * Dead Code / Unreachable Nodes.
      * Uninitialized Variables.
      * Infinite Loops.
  * **Complexity Metrics**: Calculates **McCabe’s Cyclomatic Complexity** and **Halstead Complexity Measures** (Vocabulary, Difficulty, Effort).
  * **Code Style & Smells**: Automated detection of "Code Smells" (e.g., deep nesting, long methods, magic numbers).

### 🛡️ Academic Integrity

  * **Hybrid Plagiarism Detection**: Combines two distinct methods for high accuracy:
    1.  **Graph Topology Signature**: Compares the structural fingerprint of the logic (Node/Edge counts, Degree sequences) to catch students who just rename variables.
    2.  **Text Similarity**: Uses Jaccard Similarity on normalized token sets.

### 💻 Interactive Learning Environment

  * **Secure Sandbox**: Safely executes student code in a constrained `subprocess` environment to verify logic against input/output test cases.
  * **AI Tutor Chatbot**: A context-aware chatbot (Gemini-powered) that acts as a Teaching Assistant, answering questions about algorithms while refusing non-academic queries.
  * **Real-time Dashboard**: React-based UI with live toast notifications, grading reports, and syntax-highlighted code views.

-----

## 🛠️ Tech Stack

  * **Backend**: Python 3.10+, Flask, `psycopg2` (PostgreSQL).
  * **Frontend**: React 18, Tailwind CSS, Lucide Icons.
  * **AI & ML**: Google Gemini API (Vision & Chat), OpenCV (Computer Vision/Contours).
  * **Data & Storage**: PostgreSQL 15+ (Relational Data + JSONB for reports).
  * **Testing**: `pytest` for unit and integration testing.

-----

## 📂 Project Structure

The project follows a modern, service-oriented architecture:

```text
.
├── backend/
│   ├── core/                 # Core configs (DB, Auth, Logging)
│   ├── schemas/              # Pydantic validation models
│   ├── services/
│   │   ├── analysis/         # CFG, Complexity, Plagiarism logic
│   │   ├── execution/        # Sandbox & Code Generators
│   │   ├── grading/          # AI & Static Analysis Grading
│   │   ├── parsers/          # XML & Image Parsers
│   │   └── chatbot.py        # AI Tutor Logic
│   └── main.py               # API Entry Point & Routes
├── frontend/                 # React Source Code (Vite/CRA)
├── scripts/                  # Automation Scripts (Install, Run, Test)
├── tests/                    # Pytest Suite
└── requirements.txt          # Python Dependencies
```

-----

## 📥 Installation & Setup

### Prerequisites

  * **Python**: 3.10+
  * **Node.js**: 16+
  * **PostgreSQL**: Running locally or via Docker.

### 1\. Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/structogram-ai.git
cd structogram-ai

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment Variables
# (Create a .env file or export these)
export GEMINI_API_KEY="your_google_api_key"
export DB_PASSWORD="your_postgres_password"

# Initialize Database
python -m backend.core.init_db
```

### 2\. Frontend Setup

```bash
cd frontend
npm install
npm run build
# The build artifacts are served by the Flask backend automatically
```

### 3\. Running the Application

Use the provided helper script to start the server:

```bash
# Make executable if needed
chmod +x scripts/run.sh

# Run Server
./scripts/run.sh
```

Access the application at `http://localhost:5000`.

-----

## 🧪 Testing

The project includes a comprehensive test suite covering parsers, security, and logic analysis.

```bash
# Run all tests
./scripts/run_tests.sh
```

**Key Test Modules:**

  * `tests/test_core_logic.py`: Verifies code generation and complexity math.
  * `tests/test_parsers.py`: Checks XML geometry parsing and fuzzy nesting logic.
  * `tests/test_security.py`: Ensures password hashing and JWT token validity.

-----

## 📄 License

This project is licensed under the **Apache License 2.0**. See the `LICENSE` file for details.