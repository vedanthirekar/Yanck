"""
API Routes for RAG Chatbot Platform.

Provides REST API endpoints for chatbot management, document upload,
status checking, querying, and deletion.
"""

import logging
from flask import Blueprint, request, jsonify, current_app, session

logger = logging.getLogger(__name__)

# Create API blueprint
api_bp = Blueprint('api', __name__)


@api_bp.route('/chatbot', methods=['POST'])
def create_chatbot():
    """
    Create a new chatbot.

    Request Body (JSON):
        - name: Chatbot name (required, non-empty string)
        - system_prompt: System prompt for chatbot behavior (required, non-empty string)
        - model: LLM model to use (optional, defaults to 'gemini-2.5-flash')

    Returns:
        JSON response with chatbot metadata (201 Created)
        or error message (400 Bad Request, 500 Internal Server Error)

    Example:
        POST /api/chatbot
        {
            "name": "Customer Support Bot",
            "system_prompt": "You are a helpful customer support assistant.",
            "model": "gemini-2.5-flash"
        }
    """
    try:
        # Validate request has JSON content
        if not request.is_json:
            return jsonify({
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request must be JSON"
                }
            }), 400

        data = request.get_json()

        # Validate required fields
        name = data.get('name')
        system_prompt = data.get('system_prompt')
        model = data.get('model', 'gemini-2.5-flash')  # Default to gemini-2.5-flash

        if not name or not isinstance(name, str) or not name.strip():
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Chatbot name is required and cannot be empty"
                }
            }), 400

        if not system_prompt or not isinstance(system_prompt, str) or not system_prompt.strip():
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "System prompt is required and cannot be empty"
                }
            }), 400

        # Create chatbot using service
        chatbot_service = current_app.chatbot_service
        chatbot = chatbot_service.create_chatbot(name.strip(), system_prompt.strip(), model.strip())

        logger.info("Created chatbot via API: %s", chatbot['id'])

        return jsonify(chatbot), 201

    except ValueError as e:
        logger.warning("Validation error in create_chatbot: %s", str(e))
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        }), 400
    except Exception as e:
        logger.error("Error creating chatbot: %s", str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to create chatbot",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500



@api_bp.route('/chatbot/<chatbot_id>/documents', methods=['POST'])
def upload_documents(chatbot_id):
    """
    Upload documents for a chatbot.

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot

    Request:
        - Content-Type: multipart/form-data
        - files: One or more files (PDF, TXT, DOCX)
        - Max 10 files per chatbot
        - Max 50MB per file

    Returns:
        JSON response with upload results (200 OK)
        or error message (400 Bad Request, 404 Not Found, 413 Payload Too Large, 500 Internal Server Error)

    Example:
        POST /api/chatbot/{chatbot_id}/documents
        Content-Type: multipart/form-data
        files: [file1.pdf, file2.txt]
    """
    try:
        # Validate chatbot exists
        chatbot_service = current_app.chatbot_service
        chatbot = chatbot_service.get_chatbot(chatbot_id)

        if chatbot is None:
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Chatbot '{chatbot_id}' not found"
                }
            }), 404

        # Check if files are present in request
        if 'files' not in request.files:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "No files provided. Use 'files' field for file uploads"
                }
            }), 400

        # Get all files from request
        files = request.files.getlist('files')

        if not files or len(files) == 0:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "No files provided"
                }
            }), 400

        # Upload documents using service
        document_service = current_app.document_service
        result = document_service.upload_documents(chatbot_id, files)

        # If no files were successfully uploaded, return error
        if not result['success']:
            return jsonify({
                "error": {
                    "code": "UPLOAD_FAILED",
                    "message": "Failed to upload any files",
                    "details": result['errors']
                }
            }), 400

        logger.info(
            "Uploaded %d documents for chatbot '%s'",
            len(result['uploaded_files']),
            chatbot_id
        )

        # Start embedding generation in background (for now, call synchronously)
        # In production, this should be done asynchronously using a task queue
        try:
            document_service.generate_embeddings(chatbot_id)
        except Exception as e:
            logger.error("Failed to generate embeddings: %s", str(e))
            # Return success for upload but note embedding failure
            result['embedding_status'] = 'failed'
            result['embedding_error'] = str(e)

        return jsonify(result), 200

    except ValueError as e:
        logger.warning("Validation error in upload_documents: %s", str(e))
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        }), 400
    except Exception as e:
        logger.error("Error uploading documents for chatbot '%s': %s", chatbot_id, str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to upload documents",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500



@api_bp.route('/chatbots', methods=['GET'])
def get_all_chatbots():
    """
    Get all chatbots with metadata and document counts.

    Returns:
        JSON response with list of chatbots (200 OK)
        or error message (500 Internal Server Error)

    Response includes:
        - chatbots: List of chatbot objects with metadata and document_count

    Example:
        GET /api/chatbots
    """
    try:
        chatbot_service = current_app.chatbot_service
        chatbots = chatbot_service.get_all_chatbots()

        logger.info("Retrieved %d chatbots via API", len(chatbots))

        return jsonify({
            "success": True,
            "chatbots": chatbots,
            "count": len(chatbots)
        }), 200

    except Exception as e:
        logger.error("Error retrieving all chatbots: %s", str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to retrieve chatbots",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500


@api_bp.route('/chatbot/<chatbot_id>', methods=['GET'])
def get_chatbot(chatbot_id):
    """
    Get a single chatbot's details by ID.

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot

    Returns:
        JSON response with chatbot details (200 OK)
        or error message (404 Not Found, 500 Internal Server Error)

    Example:
        GET /api/chatbot/{chatbot_id}
    """
    try:
        chatbot_service = current_app.chatbot_service
        chatbot = chatbot_service.get_chatbot(chatbot_id)

        if chatbot is None:
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Chatbot '{chatbot_id}' not found"
                }
            }), 404

        logger.info("Retrieved chatbot '%s' via API", chatbot_id)

        return jsonify({
            "success": True,
            "chatbot": chatbot
        }), 200

    except ValueError as e:
        logger.warning("Validation error in get_chatbot: %s", str(e))
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        }), 400
    except Exception as e:
        logger.error("Error retrieving chatbot '%s': %s", chatbot_id, str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to retrieve chatbot",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500


@api_bp.route('/chatbot/<chatbot_id>/status', methods=['GET'])
def get_chatbot_status(chatbot_id):
    """
    Get processing status of a chatbot and its documents.

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot

    Returns:
        JSON response with status information (200 OK)
        or error message (404 Not Found, 500 Internal Server Error)

    Response includes:
        - chatbot_id: ID of the chatbot
        - chatbot_status: Overall status (creating, processing, ready, error)
        - total_documents: Number of documents
        - documents: List of document details with status

    Example:
        GET /api/chatbot/{chatbot_id}/status
    """
    try:
        # Get document status using service
        document_service = current_app.document_service
        status_info = document_service.get_document_status(chatbot_id)

        logger.info("Retrieved status for chatbot '%s'", chatbot_id)

        return jsonify(status_info), 200

    except ValueError as e:
        logger.warning("Chatbot not found: %s", str(e))
        return jsonify({
            "error": {
                "code": "NOT_FOUND",
                "message": str(e)
            }
        }), 404
    except Exception as e:
        logger.error("Error getting status for chatbot '%s': %s", chatbot_id, str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to retrieve status",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500



@api_bp.route('/chatbot/<chatbot_id>/query', methods=['POST'])
def query_chatbot(chatbot_id):
    """
    Submit a query to a chatbot and get a response.

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot

    Request Body (JSON):
        - question: User's question (required, non-empty string)
        - chat_history: Optional conversation history (list of role/content dicts)

    Returns:
        JSON response with answer and sources (200 OK)
        or error message (400 Bad Request, 404 Not Found, 503 Service Unavailable, 500 Internal Server Error)

    Response includes:
        - response: Generated answer text
        - sources: List of source documents used
        - chatbot_id: ID of the chatbot

    Example:
        POST /api/chatbot/{chatbot_id}/query
        {
            "question": "What is the refund policy?",
            "chat_history": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi! How can I help?"}
            ]
        }
    """
    try:
        # Check if query service is available
        query_service = current_app.query_service
        if query_service is None:
            return jsonify({
                "error": {
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "Query service is not available. Gemini API key may not be configured."
                }
            }), 503

        # Validate request has JSON content
        if not request.is_json:
            return jsonify({
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request must be JSON"
                }
            }), 400

        data = request.get_json()

        # Validate required fields
        question = data.get('question')

        if not question or not isinstance(question, str) or not question.strip():
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Question is required and cannot be empty"
                }
            }), 400

        # Get optional chat history from request
        chat_history = data.get('chat_history', [])

        # Validate chat history format if provided
        if chat_history and not isinstance(chat_history, list):
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "chat_history must be a list"
                }
            }), 400

        # Get chat history from session if not provided in request
        if not chat_history:
            session_key = f"chat_history_{chatbot_id}"
            chat_history = session.get(session_key, [])

        # Process query using service
        result = query_service.query(
            chatbot_id,
            question.strip(),
            chat_history=chat_history
        )

        # Update session with new message
        session_key = f"chat_history_{chatbot_id}"
        if session_key not in session:
            session[session_key] = []

        session[session_key].append({
            "role": "user",
            "content": question.strip()
        })
        session[session_key].append({
            "role": "assistant",
            "content": result['response']
        })

        # Limit history to last 10 exchanges (20 messages)
        if len(session[session_key]) > 20:
            session[session_key] = session[session_key][-20:]

        logger.info("Processed query for chatbot '%s'", chatbot_id)

        return jsonify(result), 200

    except ValueError as e:
        logger.warning("Validation error in query_chatbot: %s", str(e))
        error_message = str(e)

        # Check if it's a "not found" or "not ready" error
        if "not found" in error_message.lower():
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": error_message
                }
            }), 404
        else:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": error_message
                }
            }), 400
    except Exception as e:
        logger.error("Error processing query for chatbot '%s': %s", chatbot_id, str(e))

        # Check if it's a Gemini API error
        error_message = str(e)
        if "gemini" in error_message.lower() or "api" in error_message.lower():
            return jsonify({
                "error": {
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "Gemini API is currently unavailable. Please try again later.",
                    "details": error_message if current_app.config.get('ENV') == 'development' else None
                }
            }), 503

        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to process query",
                "details": error_message if current_app.config.get('ENV') == 'development' else None
            }
        }), 500



@api_bp.route('/chatbot/<chatbot_id>/documents/<document_id>', methods=['DELETE'])
def delete_document(chatbot_id, document_id):
    """
    Delete a specific document from a chatbot.

    This endpoint:
    - Deletes the document file
    - Removes the document from the database
    - Regenerates the vector store with remaining documents

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot
        - document_id: Unique identifier of the document

    Returns:
        JSON response with success message (200 OK)
        or error message (404 Not Found, 500 Internal Server Error)

    Example:
        DELETE /api/chatbot/{chatbot_id}/documents/{document_id}
    """
    try:
        # Delete document using service
        document_service = current_app.document_service
        result = document_service.delete_document(chatbot_id, document_id)

        logger.info("Deleted document '%s' from chatbot '%s'", document_id, chatbot_id)

        return jsonify(result), 200

    except ValueError as e:
        logger.warning("Validation error in delete_document: %s", str(e))
        error_message = str(e)

        # Check if it's a "not found" error
        if "not found" in error_message.lower():
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": error_message
                }
            }), 404
        else:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": error_message
                }
            }), 400
    except Exception as e:
        logger.error("Error deleting document '%s' from chatbot '%s': %s", document_id, chatbot_id, str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to delete document",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500


@api_bp.route('/chatbot/<chatbot_id>', methods=['PUT'])
def update_chatbot(chatbot_id):
    """
    Update a chatbot's system prompt and/or model.

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot

    Request Body (JSON):
        - system_prompt: New system prompt (optional)
        - model: New model identifier (optional)

    Returns:
        JSON response with success message (200 OK)
        or error message (400 Bad Request, 404 Not Found, 500 Internal Server Error)

    Example:
        PUT /api/chatbot/{chatbot_id}
        {
            "system_prompt": "You are a helpful assistant.",
            "model": "gemini-1.5-flash"
        }
    """
    try:
        # Validate request has JSON content
        if not request.is_json:
            return jsonify({
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request must be JSON"
                }
            }), 400

        data = request.get_json()

        # Get fields to update
        system_prompt = data.get('system_prompt')
        model = data.get('model')

        # Validate at least one field is provided
        if system_prompt is None and model is None:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "At least one of 'system_prompt' or 'model' must be provided"
                }
            }), 400

        # Update chatbot using service
        chatbot_service = current_app.chatbot_service
        chatbot_service.update_chatbot(chatbot_id, system_prompt=system_prompt, model=model)

        logger.info("Updated chatbot '%s'", chatbot_id)

        return jsonify({
            "success": True,
            "message": "Chatbot updated successfully"
        }), 200

    except ValueError as e:
        logger.warning("Validation error in update_chatbot: %s", str(e))
        error_message = str(e)

        # Check if it's a "not found" error
        if "not found" in error_message.lower():
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": error_message
                }
            }), 404
        else:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": error_message
                }
            }), 400
    except Exception as e:
        logger.error("Error updating chatbot '%s': %s", chatbot_id, str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to update chatbot",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500


@api_bp.route('/chatbot/<chatbot_id>', methods=['DELETE'])
def delete_chatbot(chatbot_id):
    """
    Delete a chatbot and all associated data.

    This endpoint performs cascade deletion:
    - Deletes vector store
    - Deletes uploaded document files
    - Deletes database records (documents and chatbot)

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot

    Returns:
        JSON response with success message (200 OK)
        or error message (404 Not Found, 500 Internal Server Error)

    Example:
        DELETE /api/chatbot/{chatbot_id}
    """
    try:
        # Delete chatbot using service
        chatbot_service = current_app.chatbot_service
        chatbot_service.delete_chatbot(chatbot_id)

        # Clear session data for this chatbot
        session_key = f"chat_history_{chatbot_id}"
        if session_key in session:
            session.pop(session_key)

        logger.info("Deleted chatbot '%s' via API", chatbot_id)

        return jsonify({
            "success": True,
            "message": f"Chatbot '{chatbot_id}' deleted successfully"
        }), 200

    except ValueError as e:
        logger.warning("Validation error in delete_chatbot: %s", str(e))
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        }), 400
    except Exception as e:
        error_message = str(e)

        # Check if it's a "not found" error
        if "not found" in error_message.lower():
            logger.warning("Chatbot not found: %s", error_message)
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": error_message
                }
            }), 404

        logger.error("Error deleting chatbot '%s': %s", chatbot_id, str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to delete chatbot",
                "details": error_message if current_app.config.get('ENV') == 'development' else None
            }
        }), 500
