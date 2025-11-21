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


@api_bp.route('/test-gemini', methods=['GET'])
def test_gemini():
    """Test Gemini API connectivity and list available models."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=current_app.config['GEMINI_API_KEY'])
        
        # List available models
        available_models = []
        for model in genai.list_models():
            if 'generateContent' in model.supported_generation_methods:
                available_models.append(model.name)
        
        # Test with the first available model
        if available_models:
            test_model_name = available_models[0].replace('models/', '')
            model = genai.GenerativeModel(test_model_name)
            response = model.generate_content('Say "Hello, API is working!"')
            
            return jsonify({
                "success": True,
                "message": "Gemini API is working",
                "test_model": test_model_name,
                "response": response.text,
                "available_models": available_models
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "No models available for generateContent"
            }), 500
            
    except Exception as e:
        logger.error("Gemini API test failed: %s", str(e), exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@api_bp.route('/draft/files', methods=['POST'])
def upload_draft_files():
    """
    Upload files temporarily before chatbot creation (for draft/step 1).

    Request:
        - Content-Type: multipart/form-data
        - files: One or more files (PDF, TXT, DOCX)
        - draft_id: Optional draft ID (if not provided, generates one)

    Returns:
        JSON response with draft_id and uploaded files (200 OK)
        or error message (400 Bad Request, 500 Internal Server Error)

    Example:
        POST /api/draft/files
        Content-Type: multipart/form-data
        files: [file1.pdf, file2.txt]
        draft_id: optional-draft-id
    """
    try:
        import uuid
        import os
        from werkzeug.utils import secure_filename

        # Get or generate draft_id
        draft_id = request.form.get('draft_id')
        if not draft_id:
            draft_id = str(uuid.uuid4())

        # Check if files are present
        if 'files' not in request.files:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "No files provided"
                }
            }), 400

        files = request.files.getlist('files')
        if not files or len(files) == 0:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "No files provided"
                }
            }), 400

        # Validate file count
        if len(files) > 10:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Maximum 10 files allowed"
                }
            }), 400

        # Create draft folder
        draft_folder = os.path.join('./data/drafts', draft_id)
        os.makedirs(draft_folder, exist_ok=True)

        # Load existing metadata or create new
        metadata_file = os.path.join(draft_folder, 'metadata.json')
        import json
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        else:
            metadata = {}

        uploaded_files = []
        errors = []

        for file in files:
            try:
                if not file.filename:
                    errors.append({"filename": "unknown", "error": "No filename provided"})
                    continue

                # Validate file type
                allowed_extensions = {'pdf', 'txt', 'docx'}
                file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
                if file_ext not in allowed_extensions:
                    errors.append({
                        "filename": file.filename,
                        "error": f"Unsupported file type. Allowed: PDF, TXT, DOCX"
                    })
                    continue

                # Validate file size (50MB max)
                file.seek(0, os.SEEK_END)
                file_size = file.tell()
                file.seek(0)
                if file_size > 50 * 1024 * 1024:
                    errors.append({
                        "filename": file.filename,
                        "error": "File size exceeds 50MB"
                    })
                    continue

                # Save file
                secure_name = secure_filename(file.filename)
                file_id = str(uuid.uuid4())
                unique_filename = f"{file_id}.{file_ext}"
                file_path = os.path.join(draft_folder, unique_filename)
                file.save(file_path)

                # Store original filename in metadata
                metadata[file_id] = {
                    "original_filename": secure_name,
                    "file_type": file_ext,
                    "file_size": file_size
                }
                
                # Save metadata
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f)

                uploaded_files.append({
                    "id": file_id,
                    "filename": secure_name,
                    "file_type": file_ext,
                    "file_size": file_size,
                    "file_path": file_path
                })

            except Exception as e:
                errors.append({
                    "filename": file.filename if file.filename else "unknown",
                    "error": str(e)
                })

        if not uploaded_files:
            return jsonify({
                "error": {
                    "code": "UPLOAD_FAILED",
                    "message": "Failed to upload any files",
                    "details": errors
                }
            }), 400

        logger.info("Uploaded %d files for draft '%s'", len(uploaded_files), draft_id)

        return jsonify({
            "success": True,
            "draft_id": draft_id,
            "uploaded_files": uploaded_files,
            "errors": errors
        }), 200

    except Exception as e:
        logger.error("Error uploading draft files: %s", str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to upload files",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500


@api_bp.route('/draft/<draft_id>/files', methods=['GET'])
def get_draft_files(draft_id):
    """
    Get all files for a draft.

    URL Parameters:
        - draft_id: Draft identifier

    Returns:
        JSON response with list of files (200 OK)
    """
    try:
        import os
        import json
        draft_folder = os.path.join('./data/drafts', draft_id)

        if not os.path.exists(draft_folder):
            return jsonify({
                "success": True,
                "files": [],
                "count": 0
            }), 200

        # Load metadata if it exists
        metadata_file = os.path.join(draft_folder, 'metadata.json')
        metadata = {}
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            except Exception as e:
                logger.warning("Could not load metadata file: %s", str(e))

        files = []
        for filename in os.listdir(draft_folder):
            # Skip metadata file
            if filename == 'metadata.json':
                continue
                
            file_path = os.path.join(draft_folder, filename)
            if os.path.isfile(file_path):
                if '.' in filename:
                    file_id, ext = filename.rsplit('.', 1)
                else:
                    file_id = filename
                    ext = ''
                
                # Get original filename from metadata, fallback to UUID filename
                original_filename = filename
                if file_id in metadata:
                    original_filename = metadata[file_id].get('original_filename', filename)
                
                files.append({
                    "id": file_id,
                    "filename": original_filename,
                    "file_type": ext,
                    "file_size": os.path.getsize(file_path),
                    "file_path": file_path
                })

        return jsonify({
            "success": True,
            "files": files,
            "count": len(files)
        }), 200

    except Exception as e:
        logger.error("Error getting draft files: %s", str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to retrieve files"
            }
        }), 500


@api_bp.route('/draft/<draft_id>/files/<file_id>', methods=['DELETE'])
def delete_draft_file(draft_id, file_id):
    """
    Delete a file from a draft.

    URL Parameters:
        - draft_id: Draft identifier
        - file_id: File identifier (filename without extension)

    Returns:
        JSON response with success message (200 OK)
    """
    try:
        import os
        import glob
        import json

        draft_folder = os.path.join('./data/drafts', draft_id)
        file_pattern = os.path.join(draft_folder, f"{file_id}.*")
        matching_files = glob.glob(file_pattern)

        if not matching_files:
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": "File not found"
                }
            }), 404

        for file_path in matching_files:
            try:
                os.remove(file_path)
                logger.info("Deleted draft file: %s", file_path)
            except Exception as e:
                logger.error("Error deleting file: %s", str(e))

        # Remove from metadata if it exists
        metadata_file = os.path.join(draft_folder, 'metadata.json')
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                if file_id in metadata:
                    del metadata[file_id]
                    with open(metadata_file, 'w') as f:
                        json.dump(metadata, f)
            except Exception as e:
                logger.warning("Could not update metadata file: %s", str(e))

        return jsonify({
            "success": True,
            "message": "File deleted successfully"
        }), 200

    except Exception as e:
        logger.error("Error deleting draft file: %s", str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to delete file"
            }
        }), 500


@api_bp.route('/generate-system-prompt', methods=['POST'])
def generate_system_prompt():
    """
    Generate an optimized system prompt based on special instructions.

    Request Body (JSON):
        - special_instructions: Optional user instructions for chatbot behavior

    Returns:
        JSON response with generated system prompt (200 OK)
        or error message (400 Bad Request, 503 Service Unavailable, 500 Internal Server Error)

    Example:
        POST /api/generate-system-prompt
        {
            "special_instructions": "Focus on customer support, be professional"
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
        special_instructions = data.get('special_instructions', '').strip()

        # Generate system prompt
        if special_instructions:
            # Use LLM to generate tailored prompt
            prompt = f"""You are an expert at creating effective system prompts for RAG (Retrieval-Augmented Generation) chatbots.

Create a comprehensive and effective system prompt based on the user's instructions below:

User's Special Instructions:
{special_instructions}

Your task is to generate an ideal system prompt that:
1. Incorporates the user's special instructions naturally and effectively
2. Emphasizes providing in-depth, detailed, and specific answers
3. Instructs the chatbot to answer based on the provided documents/knowledge base
4. Encourages thoroughness and accuracy in responses
5. Sets a professional and helpful tone
6. Includes guidance on how to handle questions (don't cite the sources in the answer, be specific, provide examples when relevant)

The system prompt should be 4-8 sentences long and create a strong foundation for an intelligent, helpful chatbot.

Do not include any preamble, explanation, or meta-commentary. Return ONLY the system prompt itself.

System Prompt:"""

            try:
                import google.generativeai as genai
                genai.configure(api_key=current_app.config['GEMINI_API_KEY'])
                
                # Use gemini-2.5-flash (same as chatbot queries)
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content(prompt)
                
                system_prompt = response.text.strip()
                logger.info("Successfully generated system prompt using LLM (gemini-2.5-flash)")
            except Exception as e:
                logger.error("Error generating system prompt with LLM: %s", str(e), exc_info=True)
                # Fallback to template-based generation
                logger.info("Using fallback template for system prompt generation")
                base_prompt = "You are a knowledgeable AI assistant designed to provide in-depth, detailed answers."
                if special_instructions:
                    base_prompt += f" {special_instructions}"
                system_prompt = f"""{base_prompt}

Always base your responses on the provided documents and knowledge base. Provide specific information, and give comprehensive explanations. When answering questions, don't cite the resources, be thorough and include relevant details, examples, or context that helps the user fully understand the topic. Maintain a professional and helpful tone throughout all interactions."""
        else:
            # Default system prompt - comprehensive and emphasizes depth
            system_prompt = """You are a knowledgeable AI assistant designed to provide in-depth, detailed, and accurate answers based on the provided documents and knowledge base.

When responding to questions:
- Provide comprehensive and specific information rather than brief or generic answers
- Include relevant details, examples, and context to help users fully understand the topic
- don't cite the sources in the answer
- If a question requires multiple aspects to be addressed, cover all of them thoroughly
- Be thorough in your explanations and avoid superficial responses
- Maintain a professional, clear, and helpful tone
- If information is not available in the provided documents, clearly state this rather than speculating

Your goal is to be as helpful and informative as possible while staying accurate to the source material."""
            
            logger.info("Generated default system prompt")

        return jsonify({
            "success": True,
            "system_prompt": system_prompt
        }), 200

    except Exception as e:
        logger.error("Error generating system prompt: %s", str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to generate system prompt",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500


@api_bp.route('/chatbot/<chatbot_id>/copy-draft-files', methods=['POST'])
def copy_draft_files_to_chatbot(chatbot_id):
    """
    Copy files from a draft to an existing chatbot.

    Request Body (JSON):
        - draft_id: Draft ID containing files to copy

    Returns:
        JSON response with success message (200 OK)
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

        if not request.is_json:
            return jsonify({
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request must be JSON"
                }
            }), 400

        data = request.get_json()
        draft_id = data.get('draft_id')

        if not draft_id:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Draft ID is required"
                }
            }), 400

        # Copy files from draft to chatbot
        import os
        import shutil
        import uuid
        import json
        from models.database import get_db_connection

        document_service = current_app.document_service

        # Ensure existing chatbot documents/vector store are cleared so new draft files fully replace them
        try:
            document_service.reset_chatbot_documents(chatbot_id)
        except Exception as e:
            logger.error("Failed to reset chatbot '%s' before copying draft files: %s", chatbot_id, str(e))
            return jsonify({
                "error": {
                    "code": "RESET_FAILED",
                    "message": "Unable to clear existing chatbot documents before copying new data",
                    "details": str(e) if current_app.config.get('ENV') == 'development' else None
                }
            }), 500

        draft_folder = os.path.join('./data/drafts', draft_id)
        chatbot_folder = os.path.join('./data/uploads', chatbot_id)
        os.makedirs(chatbot_folder, exist_ok=True)

        # Load metadata if it exists
        metadata_file = os.path.join(draft_folder, 'metadata.json')
        metadata = {}
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            except Exception as e:
                logger.warning("Could not load metadata file: %s", str(e))

        copied_files = []

        if os.path.exists(draft_folder):
            for filename in os.listdir(draft_folder):
                # Skip metadata file
                if filename == 'metadata.json':
                    continue
                    
                file_path = os.path.join(draft_folder, filename)
                if os.path.isfile(file_path):
                    # Extract file info
                    if '.' in filename:
                        file_id, file_ext = filename.rsplit('.', 1)
                    else:
                        file_id = filename
                        file_ext = ''
                    
                    # Get original filename from metadata, fallback to UUID filename
                    original_filename = filename
                    if file_id in metadata:
                        original_filename = metadata[file_id].get('original_filename', filename)
                    
                    # Create new unique filename
                    new_file_id = str(uuid.uuid4())
                    new_filename = f"{new_file_id}.{file_ext}"
                    new_file_path = os.path.join(chatbot_folder, new_filename)
                    
                    # Copy file
                    shutil.copy2(file_path, new_file_path)
                    
                    # Get file size
                    file_size = os.path.getsize(new_file_path)
                    
                    # Save to database with original filename
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO documents (id, chatbot_id, filename, file_type, file_size, file_path, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (new_file_id, chatbot_id, original_filename, file_ext, file_size, new_file_path, 'uploaded'))
                    
                    copied_files.append(new_file_id)
            
            # Generate embeddings
            if copied_files:
                try:
                    document_service = current_app.document_service
                    document_service.generate_embeddings(chatbot_id)
                except Exception as e:
                    logger.error("Failed to generate embeddings: %s", str(e))

        return jsonify({
            "success": True,
            "message": f"Copied {len(copied_files)} files to chatbot",
            "files_count": len(copied_files)
        }), 200

    except Exception as e:
        logger.error("Error copying draft files: %s", str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to copy files",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500


@api_bp.route('/deploy-chatbot', methods=['POST'])
def deploy_chatbot():
    """
    Deploy a chatbot by creating it with all collected data from draft.

    Request Body (JSON):
        - name: Chatbot name (required)
        - system_prompt: System prompt (required)
        - model: LLM model (optional, defaults to 'gemini-2.5-flash')
        - draft_id: Draft ID containing uploaded files (required)

    Returns:
        JSON response with chatbot metadata (201 Created)
        or error message (400 Bad Request, 500 Internal Server Error)
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
        name = data.get('name')
        system_prompt = data.get('system_prompt')
        model = data.get('model', 'gemini-2.5-flash')
        draft_id = data.get('draft_id')

        # Validate required fields
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

        if not draft_id:
            return jsonify({
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Draft ID is required"
                }
            }), 400

        # Create chatbot
        chatbot_service = current_app.chatbot_service
        chatbot = chatbot_service.create_chatbot(name.strip(), system_prompt.strip(), model.strip())
        chatbot_id = chatbot['id']

        # Move files from draft to permanent storage
        import os
        import shutil
        from werkzeug.utils import secure_filename
        import uuid
        import json
        from models.database import get_db_connection

        draft_folder = os.path.join('./data/drafts', draft_id)
        chatbot_folder = os.path.join('./data/uploads', chatbot_id)
        os.makedirs(chatbot_folder, exist_ok=True)

        # Load metadata if it exists
        metadata_file = os.path.join(draft_folder, 'metadata.json')
        metadata = {}
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            except Exception as e:
                logger.warning("Could not load metadata file: %s", str(e))

        if os.path.exists(draft_folder):
            # Get all files from draft
            draft_files = []
            for filename in os.listdir(draft_folder):
                # Skip metadata file
                if filename == 'metadata.json':
                    continue
                    
                file_path = os.path.join(draft_folder, filename)
                if os.path.isfile(file_path):
                    # Extract file info
                    if '.' in filename:
                        file_id, file_ext = filename.rsplit('.', 1)
                    else:
                        file_id = filename
                        file_ext = ''
                    
                    # Get original filename from metadata, fallback to UUID filename
                    original_filename = filename
                    if file_id in metadata:
                        original_filename = metadata[file_id].get('original_filename', filename)
                    
                    # Create new unique filename
                    new_file_id = str(uuid.uuid4())
                    new_filename = f"{new_file_id}.{file_ext}"
                    new_file_path = os.path.join(chatbot_folder, new_filename)
                    
                    # Copy file
                    shutil.copy2(file_path, new_file_path)
                    
                    # Get file size
                    file_size = os.path.getsize(new_file_path)
                    
                    # Save to database with original filename
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            INSERT INTO documents (id, chatbot_id, filename, file_type, file_size, file_path, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (new_file_id, chatbot_id, original_filename, file_ext, file_size, new_file_path, 'uploaded'))
                    
                    draft_files.append(new_file_id)
            
            # Generate embeddings
            if draft_files:
                try:
                    document_service = current_app.document_service
                    document_service.generate_embeddings(chatbot_id)
                except Exception as e:
                    logger.error("Failed to generate embeddings: %s", str(e))
                    # Continue even if embedding generation fails

            # Clean up draft folder
            try:
                shutil.rmtree(draft_folder)
                logger.info("Cleaned up draft folder: %s", draft_folder)
            except Exception as e:
                logger.warning("Could not clean up draft folder: %s", str(e))

        logger.info("Deployed chatbot via API: %s", chatbot_id)

        return jsonify(chatbot), 201

    except ValueError as e:
        logger.warning("Validation error in deploy_chatbot: %s", str(e))
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }
        }), 400
    except Exception as e:
        logger.error("Error deploying chatbot: %s", str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to deploy chatbot",
                "details": str(e) if current_app.config.get('ENV') == 'development' else None
            }
        }), 500


@api_bp.route('/chatbot/<chatbot_id>/documents', methods=['GET'])
def get_chatbot_documents(chatbot_id):
    """
    Get all documents for a specific chatbot.

    URL Parameters:
        - chatbot_id: Unique identifier of the chatbot

    Returns:
        JSON response with list of documents (200 OK)
        or error message (404 Not Found, 500 Internal Server Error)

    Example:
        GET /api/chatbot/{chatbot_id}/documents
    """
    try:
        # Verify chatbot exists
        chatbot_service = current_app.chatbot_service
        chatbot = chatbot_service.get_chatbot(chatbot_id)

        if chatbot is None:
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Chatbot '{chatbot_id}' not found"
                }
            }), 404

        # Get documents from database
        from models.database import get_db_connection

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, filename, file_type, file_size, status, uploaded_at
                FROM documents
                WHERE chatbot_id = ?
                ORDER BY uploaded_at DESC
                """,
                (chatbot_id,)
            )

            documents = []
            for row in cursor.fetchall():
                documents.append({
                    "id": row[0],
                    "filename": row[1],
                    "file_type": row[2],
                    "file_size": row[3],
                    "status": row[4],
                    "uploaded_at": row[5]
                })

        logger.info("Retrieved %d documents for chatbot '%s'", len(documents), chatbot_id)

        return jsonify({
            "success": True,
            "documents": documents,
            "count": len(documents)
        }), 200

    except Exception as e:
        logger.error("Error retrieving documents for chatbot '%s': %s", chatbot_id, str(e))
        return jsonify({
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Failed to retrieve documents",
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
            }}), 500
