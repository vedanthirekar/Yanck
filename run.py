#!/usr/bin/env python3
"""
Application entry point for RAG Chatbot Platform.

This script checks for required environment variables and starts the Flask application.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def check_environment():
    """
    Check for required environment variables.
    
    Returns:
        bool: True if all required variables are set, False otherwise
    """
    required_vars = {
        "GEMINI_API_KEY": "Google Gemini API key for LLM responses"
    }
    
    optional_vars = {
        "FLASK_SECRET_KEY": "Flask secret key (will use default in development)",
        "EMBEDDING_MODEL": "Sentence Transformer model name (default: all-MiniLM-L6-v2)",
        "DATABASE_PATH": "SQLite database path (default: ./data/chatbots.db)",
        "VECTOR_STORE_PATH": "Vector store path (default: ./data/vector_stores)",
        "UPLOAD_FOLDER": "Upload folder path (default: ./data/uploads)"
    }
    
    missing_required = []
    missing_optional = []
    
    # Check required variables
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing_required.append(f"  - {var}: {description}")
    
    # Check optional variables
    for var, description in optional_vars.items():
        if not os.getenv(var):
            missing_optional.append(f"  - {var}: {description}")
    
    # Report missing variables
    if missing_required:
        logger.error("Missing required environment variables:")
        for msg in missing_required:
            logger.error(msg)
        logger.error("\nPlease set these variables in your .env file or environment.")
        logger.error("See .env.example for reference.")
        return False
    
    if missing_optional:
        logger.warning("Missing optional environment variables (using defaults):")
        for msg in missing_optional:
            logger.warning(msg)
    
    logger.info("Environment check passed")
    return True


def main():
    """
    Main entry point for the application.
    """
    logger.info("=" * 60)
    logger.info("RAG Chatbot Platform - Starting")
    logger.info("=" * 60)
    
    # Check environment variables
    if not check_environment():
        logger.error("Environment check failed. Exiting.")
        sys.exit(1)
    
    # Import app after environment check
    try:
        from app import app
    except Exception as e:
        logger.error("Failed to import Flask application: %s", str(e))
        logger.error("Make sure all dependencies are installed: pip install -r requirements.txt")
        sys.exit(1)
    
    # Get server configuration
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5001"))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    
    # Start the server
    logger.info("Starting Flask development server...")
    logger.info("Host: %s", host)
    logger.info("Port: %d", port)
    logger.info("Debug mode: %s", debug)
    logger.info("=" * 60)
    logger.info("Application will be available at: http://localhost:%d", port)
    logger.info("Press CTRL+C to stop the server")
    logger.info("=" * 60)
    
    try:
        app.run(host=host, port=port, debug=debug)
    except KeyboardInterrupt:
        logger.info("\nShutting down gracefully...")
    except Exception as e:
        logger.error("Server error: %s", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
