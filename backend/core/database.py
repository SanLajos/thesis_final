import os
import psycopg2
from psycopg2 import pool
from backend.core.logger import logger

# Use Environment Variables for secrets
DB_CONFIG = {
    "dbname": "thesis_project",
    "user": "postgres",
    "password": os.environ.get("DB_PASSWORD", "password"),
    "host": "localhost",
    "port": "5432"
}

# Create a Threaded Connection Pool (Min 1, Max 20 connections)
pg_pool = None
try:
    pg_pool = psycopg2.pool.ThreadedConnectionPool(1, 20, **DB_CONFIG)
    if pg_pool:
        logger.info("PostgreSQL Connection Pool created successfully")
except Exception as e:
    logger.critical(f"Failed to create DB pool: {e}")

def get_db_connection():
    """Gets a connection from the pool."""
    try:
        if pg_pool:
            return pg_pool.getconn()
        else:
            # Fallback (useful if pool failed to init)
            return psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        logger.error(f"Error getting connection from pool: {e}")
        return None

def release_db_connection(conn):
    """Returns the connection to the pool instead of closing it."""
    try:
        if pg_pool and conn:
            pg_pool.putconn(conn)
        elif conn:
            conn.close() # Fallback for non-pooled connections
    except Exception as e:
        logger.error(f"Error releasing connection: {e}")