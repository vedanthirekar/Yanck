"""
Flask application for RAG Chatbot Platform.

This application provides a web interface for creating custom chatbots
trained on user documents using RAG (Retrieval-Augmented Generation).
"""

import os
import logging
from flask import Flask, jsonify
from dotenv import load_dotenv

from models.embedding_manager import EmbeddingManager
from models.vector_store_manager import VectorStoreManager
from services.chatbot_service import ChatbotService
from services.document_service import DocumentService
from services.query_service import QueryService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def create_app():
    """
    Create and configure the Flask application.

    Returns:
        Configured Flask application instance
    """
    flask_app = Flask(__name__)

    # Flask configuration
    flask_app.config["SECRET_KEY"] = os.getenv(
        "FLASK_SECRET_KEY", "dev-secret-key-change-in-production"
    )
    flask_app.config["ENV"] = os.getenv("FLASK_ENV", "development")

    # File upload configuration
    max_file_size = os.getenv("MAX_FILE_SIZE_MB", "50")
    flask_app.config["MAX_CONTENT_LENGTH"] = (
        int(max_file_size) * 1024 * 1024
    )  # 50MB default
    flask_app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "./data/uploads")
    flask_app.config["ALLOWED_EXTENSIONS"] = {"pdf", "txt", "docx"}

    # Model configuration
    flask_app.config["EMBEDDING_MODEL"] = os.getenv(
        "EMBEDDING_MODEL", "all-MiniLM-L6-v2"
    )
    chunk_size = os.getenv("CHUNK_SIZE", "500")
    chunk_overlap = os.getenv("CHUNK_OVERLAP", "50")
    flask_app.config["CHUNK_SIZE"] = int(chunk_size)
    flask_app.config["CHUNK_OVERLAP"] = int(chunk_overlap)

    # Vector store configuration
    flask_app.config["VECTOR_STORE_PATH"] = os.getenv(
        "VECTOR_STORE_PATH", "./data/vector_stores"
    )

    # Database configuration
    flask_app.config["DATABASE_PATH"] = os.getenv("DATABASE_PATH", "./data/chatbots.db")

    # Gemini API configuration
    flask_app.config["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY")

    # Session configuration for conversation history
    flask_app.config["SESSION_TYPE"] = "filesystem"
    flask_app.config["SESSION_PERMANENT"] = False
    flask_app.config["PERMANENT_SESSION_LIFETIME"] = 3600  # 1 hour

    # Validate required configuration
    if not flask_app.config["GEMINI_API_KEY"]:
        logger.warning("GEMINI_API_KEY not set. Query functionality will not work.")

    # Create necessary directories
    os.makedirs(flask_app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(flask_app.config["VECTOR_STORE_PATH"], exist_ok=True)
    os.makedirs("./data", exist_ok=True)

    # Initialize services on startup
    try:
        logger.info("Initializing embedding manager...")
        embedding_manager = EmbeddingManager(
            model_name=flask_app.config["EMBEDDING_MODEL"]
        )
        flask_app.embedding_manager = embedding_manager

        logger.info("Initializing vector store manager...")
        vector_store_manager = VectorStoreManager(
            base_path=flask_app.config["VECTOR_STORE_PATH"]
        )
        flask_app.vector_store_manager = vector_store_manager

        logger.info("Initializing chatbot service...")
        chatbot_service = ChatbotService(vector_store_manager=vector_store_manager)
        flask_app.chatbot_service = chatbot_service

        logger.info("Initializing document service...")
        document_service = DocumentService(
            embedding_manager=embedding_manager,
            vector_store_manager=vector_store_manager,
            upload_folder=flask_app.config["UPLOAD_FOLDER"],
        )
        flask_app.document_service = document_service

        logger.info("Initializing query service...")
        if flask_app.config["GEMINI_API_KEY"]:
            query_service = QueryService(
                embedding_manager=embedding_manager,
                vector_store_manager=vector_store_manager,
                gemini_api_key=flask_app.config["GEMINI_API_KEY"],
            )
            flask_app.query_service = query_service
        else:
            logger.warning(
                "Skipping query service initialization - GEMINI_API_KEY not set"
            )
            flask_app.query_service = None

        logger.info("All services initialized successfully")

    except Exception as e:
        logger.error("Failed to initialize services: %s", str(e))
        raise

    # Register error handlers
    register_error_handlers(flask_app)

    # Register blueprints
    from routes.api_routes import api_bp
    from routes.web_routes import web_bp
    flask_app.register_blueprint(api_bp, url_prefix='/api')
    flask_app.register_blueprint(web_bp)

    logger.info("Flask application created successfully")
    return flask_app


def register_error_handlers(flask_app):
    """
    Register error handlers for common HTTP errors.

    Args:
        flask_app: Flask application instance
    """

    @flask_app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors."""
        logger.warning("Bad request: %s", str(error))
        return (
            jsonify(
                {
                    "error": {
                        "code": "BAD_REQUEST",
                        "message": "Invalid request. Please check your input.",
                        "details": (
                            str(error.description)
                            if hasattr(error, "description")
                            else str(error)
                        ),
                    }
                }
            ),
            400,
        )

    @flask_app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors."""
        logger.warning("Resource not found: %s", str(error))
        return (
            jsonify(
                {
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "The requested resource was not found.",
                        "details": (
                            str(error.description)
                            if hasattr(error, "description")
                            else str(error)
                        ),
                    }
                }
            ),
            404,
        )

    @flask_app.errorhandler(500)
    def internal_server_error(error):
        """Handle 500 Internal Server Error."""
        logger.error("Internal server error: %s", str(error))
        return (
            jsonify(
                {
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An internal server error occurred. Please try again later.",
                        "details": (
                            str(error)
                            if flask_app.config["ENV"] == "development"
                            else None
                        ),
                    }
                }
            ),
            500,
        )

    @flask_app.errorhandler(503)
    def service_unavailable(error):
        """Handle 503 Service Unavailable errors."""
        logger.error("Service unavailable: %s", str(error))
        return (
            jsonify(
                {
                    "error": {
                        "code": "SERVICE_UNAVAILABLE",
                        "message": "The service is temporarily unavailable. Please try again later.",
                        "details": (
                            str(error.description)
                            if hasattr(error, "description")
                            else str(error)
                        ),
                    }
                }
            ),
            503,
        )

    @flask_app.errorhandler(413)
    def request_entity_too_large(error):
        """Handle 413 Request Entity Too Large errors (file size exceeded)."""
        logger.warning("File size exceeded: %s", str(error))
        max_size_mb = flask_app.config["MAX_CONTENT_LENGTH"] / (1024 * 1024)
        return (
            jsonify(
                {
                    "error": {
                        "code": "FILE_TOO_LARGE",
                        "message": f"File size exceeds maximum allowed size of {max_size_mb}MB.",
                        "details": (
                            str(error.description)
                            if hasattr(error, "description")
                            else str(error)
                        ),
                    }
                }
            ),
            413,
        )


# Create the application instance
app = create_app()


if __name__ == "__main__":
    # Run the Flask development server
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port_str = os.getenv("FLASK_PORT", "5000")
    port = int(port_str)
    debug = os.getenv("FLASK_ENV", "development") == "development"

    logger.info("Starting Flask application on %s:%d (debug=%s)", host, port, debug)
    app.run(host=host, port=port, debug=debug)
