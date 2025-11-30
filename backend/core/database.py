import os
import psycopg2
from psycopg2 import pool
from backend.core.logger import logger

DB_CONFIG = {
    "dbname": "thesis_project",
    "user": "postgres",
    "password": "password",
    "host": "localhost",
    "port": "5432"
}

# Initialize Pool
pg_pool = None
try:
    pg_pool = psycopg2.pool.ThreadedConnectionPool(1, 20, **DB_CONFIG)
    if pg_pool:
        logger.info("PostgreSQL Connection Pool created successfully")
except Exception as e:
    logger.critical(f"Failed to create DB pool: {e}")

def get_db_connection():
    try:
        if pg_pool:
            return pg_pool.getconn()
        else:
            # Fallback if pool failed
            return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"Error getting connection: {e}")
        return None

def release_db_connection(conn):
    try:
        if pg_pool and conn:
            pg_pool.putconn(conn)
        elif conn:
            conn.close()
    except Exception as e:
        logger.error(f"Error releasing connection: {e}")