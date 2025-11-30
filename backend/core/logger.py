import logging
from logging.handlers import RotatingFileHandler
import os

def setup_logger(name="structogram_logger", log_file="app.log", level=logging.INFO):
    """
    Sets up a logger that writes to console and a rotating file.
    """
    # Create a custom logger
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Create handlers
    c_handler = logging.StreamHandler() # Console
    f_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=5) # File (5MB max)

    c_handler.setLevel(level)
    f_handler.setLevel(level)

    # Create formatters and add it to handlers
    log_format = logging.Formatter('%(asctime)s - %(levelname)s - %(module)s - %(message)s')
    c_handler.setFormatter(log_format)
    f_handler.setFormatter(log_format)

    # Add handlers to the logger
    if not logger.hasHandlers(): # Prevent duplicate logs if imported multiple times
        logger.addHandler(c_handler)
        logger.addHandler(f_handler)

    return logger

# Create a global logger instance
logger = setup_logger()