import time
import random
import psycopg2
from psycopg2.extras import RealDictCursor
from logger_config import logger # <--- Import Logger

DB_CONFIG = {
    "dbname": "thesis_project",
    "user": "postgres",
    "password": "password", 
    "host": "localhost",
    "port": "5432"
}

def get_db_connection(max_retries=5, base_delay=1.0):
    retries = 0
    while retries < max_retries:
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            return conn
        except psycopg2.OperationalError as e:
            retries += 1
            if retries >= max_retries:
                logger.critical(f"Database connection failed after {max_retries} attempts. Error: {e}")
                return None
            
            sleep_time = (base_delay * (2 ** (retries - 1))) + random.uniform(0, 0.5)
            logger.warning(f"Database unreachable. Retrying in {sleep_time:.2f}s (Attempt {retries}/{max_retries})...")
            time.sleep(sleep_time)
            
        except Exception as e:
            logger.error(f"Database Configuration Error: {e}")
            return None
            
    return None