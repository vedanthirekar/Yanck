# Implementation Plan

- [x] 1. Set up project structure and dependencies





  - Create Flask project directory structure with folders for routes, services, models, templates, and static files
  - Create requirements.txt with Flask, LangChain, Sentence Transformers, FAISS, PyPDF2, python-docx, and google-generativeai
  - Create .env.example file with required environment variables
  - Create .gitignore for Python projects
  - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [x] 2. Implement database models and initialization




        
  - Create database schema file with SQLite tables for chatbots and documents
  - Write database initialization script (init_db.py) to create tables
  - Create database utility functions for connection management
  - _Requirements: 1.1, 7.1, 7.2_

- [x] 3. Implement embedding manager





  - Create EmbeddingManager class that loads Sentence Transformer model on initialization
  - Implement encode method to generate embeddings from text
  - Implement get_embedding_dimension method
  - Add error handling for model loading failures
  - _Requirements: 3.2, 6.2_

- [x] 4. Implement vector store manager





  - Create VectorStoreManager class for FAISS operations
  - Implement create_store method to initialize new FAISS index for a chatbot
  - Implement load_store method to load existing FAISS index
  - Implement add_documents method to add embeddings with metadata
  - Implement similarity_search method for retrieval
  - Implement delete_store method to remove chatbot vector store
  - _Requirements: 3.3, 4.2, 6.5_

- [x] 5. Implement chatbot service





  - Create ChatbotService class with database operations
  - Implement create_chatbot method with validation for name and system prompt
  - Implement get_chatbot method to retrieve chatbot by ID
  - Implement update_chatbot_status method
  - Implement delete_chatbot method with cascade deletion of documents and vector store
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 6. Implement document service





  - Create DocumentService class with file handling and processing logic
  - Implement upload_documents method with file validation (type, size, count)
  - Implement extract_text method using LangChain loaders for PDF, TXT, DOCX
  - Implement text chunking using RecursiveCharacterTextSplitter
  - Implement generate_embeddings method that processes chunks and stores in vector store
  - Implement get_document_status method
  - Add error handling for unsupported formats and size limits
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3_

- [x] 7. Implement query service with RAG pipeline





  - Create QueryService class with LangChain RAG chain
  - Initialize Gemini API client with LangChain ChatGoogleGenerativeAI
  - Implement retrieve_context method using vector store similarity search
  - Implement generate_response method that constructs prompt with system prompt, context, and history
  - Implement query method that orchestrates retrieval and generation
  - Add conversation history management within session
  - Add error handling for Gemini API failures
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.3, 6.4_

- [x] 8. Create Flask application and configuration





  - Create app.py with Flask initialization
  - Configure file upload settings (50MB max, allowed extensions)
  - Load environment variables for Gemini API key and paths
  - Initialize embedding manager and vector store manager on startup
  - Configure session management for conversation history
  - Add error handlers for 400, 404, 500, 503 errors
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 6.1, 6.4_

- [x] 9. Implement API routes





  - Create api_routes.py blueprint
  - Implement POST /api/chatbot endpoint for chatbot creation
  - Implement POST /api/chatbot/<id>/documents endpoint for file uploads
  - Implement GET /api/chatbot/<id>/status endpoint for processing status
  - Implement POST /api/chatbot/<id>/query endpoint for user queries
  - Implement DELETE /api/chatbot/<id> endpoint for chatbot deletion
  - Add request validation and error responses
  - _Requirements: 1.1, 1.2, 2.1-2.6, 3.4, 3.5, 4.1, 4.4, 6.4_

- [x] 10. Create frontend templates for chatbot creation wizard





  - Create base.html template with common layout and navigation
  - Create index.html landing page
  - Create create_step1.html for Basic Settings (name and system prompt inputs)
  - Create create_step2.html for Data Upload (file upload interface with drag-and-drop)
  - Create create_step3.html for Preview & Test (simple chat interface for testing)
  - Create create_step4.html for Deploy (confirmation and chatbot URL)
  - Add step indicator component showing current step (1-4)
  - Add form validation on frontend
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 11. Create chat interface template




  - Create chat.html template with message display area
  - Add input field for user queries
  - Add send button and enter key support
  - Display conversation history with user/assistant message styling
  - Add loading indicator for response generation
  - Display error messages when Gemini API is unavailable
  - _Requirements: 4.1, 4.4, 6.4_
-

- [x] 12. Implement frontend JavaScript for wizard flow




  - Create wizard.js for step navigation logic
  - Implement form submission for Step 1 (Basic Settings) with validation
  - Implement file upload for Step 2 with progress indicator and status polling
  - Implement test query functionality for Step 3
  - Implement deploy confirmation for Step 4
  - Add back button functionality to navigate to previous steps
  - Add error display for validation failures and API errors
  - _Requirements: 1.3, 1.4, 2.5, 2.6, 3.4, 5.6, 5.7_

- [x] 13. Implement frontend JavaScript for chat interface




  - Create chat.js for chat functionality
  - Implement message sending with fetch API
  - Implement message display with proper formatting
  - Add auto-scroll to latest message
  - Add loading state during response generation
  - Store conversation history in session storage
  - Handle error responses and display error messages
  - _Requirements: 4.1, 4.4, 4.5, 6.4_

- [x] 14. Implement web routes





  - Create web_routes.py blueprint
  - Implement GET / route for landing page
  - Implement GET /create route that renders Step 1
  - Implement GET /create/step/<step_number> routes for wizard steps
  - Implement GET /chat/<chatbot_id> route for chat interface
  - Add chatbot existence validation for chat route
  - _Requirements: 1.1, 4.1, 5.1-5.5_

- [x] 15. Add CSS styling





  - Create styles.css with responsive layout
  - Style wizard steps with step indicator
  - Style form inputs and buttons
  - Style file upload area with drag-and-drop visual feedback
  - Style chat interface with message bubbles
  - Add loading spinner styles
  - Add error message styles
  - Ensure mobile responsiveness
  - _Requirements: 1.1, 4.1, 5.1_
-

- [x] 16. Create application entry point and startup script




  - Create run.py to start Flask application
  - Add development server configuration
  - Create startup script that checks for required environment variables
  - Add instructions in README.md for setup and running the application
  - _Requirements: 6.1, 6.2, 6.3_
