import psycopg2

DB_CONFIG = {
    "dbname": "thesis_project",
    "user": "postgres",
    "password": "password",
    "host": "localhost",
    "port": "5432"
}

def init_database():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        print("Connected. Re-initializing tables...")

        # Drop tables (Order matters due to Foreign Keys)
        cur.execute("DROP TABLE IF EXISTS submissions CASCADE;")
        cur.execute("DROP TABLE IF EXISTS assignments CASCADE;")
        cur.execute("DROP TABLE IF EXISTS seminar_members CASCADE;")
        cur.execute("DROP TABLE IF EXISTS seminars CASCADE;")
        cur.execute("DROP TABLE IF EXISTS users CASCADE;")

        # 1. Users Table
        cur.execute("""
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(10) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Seminars Table
        cur.execute("""
            CREATE TABLE seminars (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                invite_code VARCHAR(20) UNIQUE NOT NULL,
                creator_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 3. Seminar Members (Many-to-Many)
        cur.execute("""
            CREATE TABLE seminar_members (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                seminar_id INTEGER REFERENCES seminars(id) ON DELETE CASCADE,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, seminar_id)
            );
        """)

        # 4. Assignments Table
        cur.execute("""
            CREATE TABLE assignments (
                id SERIAL PRIMARY KEY,
                seminar_id INTEGER REFERENCES seminars(id) ON DELETE CASCADE,
                creator_id INTEGER REFERENCES users(id),
                title TEXT NOT NULL,
                description TEXT,
                grading_prompt TEXT,
                language VARCHAR(20) DEFAULT 'python', 
                template_path TEXT NOT NULL,
                plagiarism_check_enabled BOOLEAN DEFAULT FALSE,
                grading_type VARCHAR(20) DEFAULT 'ai',
                static_analysis_enabled BOOLEAN DEFAULT FALSE,
                test_cases JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 5. Submissions Table
        cur.execute("""
            CREATE TABLE submissions (
                id SERIAL PRIMARY KEY,
                assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
                student_id INTEGER REFERENCES users(id),
                file_path TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                submission_mode TEXT,
                diagram_type TEXT,
                generated_code TEXT,
                grading_result JSONB, 
                complexity INTEGER DEFAULT 1,
                plagiarism_score INTEGER DEFAULT 0,
                static_analysis_report JSONB,
                test_results JSONB,
                halstead_metrics JSONB,
                code_smells JSONB,
                cfg_visualization TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        conn.commit()
        cur.close()
        conn.close()
        print("Success! Database initialized with all features.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    init_database()