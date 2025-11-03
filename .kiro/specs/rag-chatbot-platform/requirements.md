# Requirements Document

## Introduction

This document specifies the requirements for a RAG (Retrieval-Augmented Generation) chatbot platform that enables users and companies to create custom chatbots trained on their own documents. The platform provides a simple 3-4 step workflow for chatbot creation, document upload, embedding generation, and query interface for MVP deployment.

## Glossary

- **RAG Platform**: The Flask-based web application system that enables users to create and manage custom chatbots
- **Chatbot**: An AI-powered conversational agent created by a user, trained on specific documents
- **User**: An individual or company representative who creates and manages chatbots
- **Document**: A text-based file (PDF, TXT, or DOCX) uploaded by the user for training
- **Embedding**: A vector representation of document content generated server-side using Sentence Transformer
- **Sentence Transformer**: The local embedding model deployed on the server for generating document embeddings
- **Gemini API**: The Google Gemini API used as the language model for generating chatbot responses
- **Query Interface**: The chat interface where users interact with their created chatbot
- **Vector Store**: The local server-side storage system that persists document embeddings
- **LangChain**: The Python framework used for LLM and RAG operations on the server
- **Flask Server**: The Python web server that handles all backend operations

## Requirements

### Requirement 1

**User Story:** As a user, I want to create a new chatbot by providing basic configuration details, so that I can set up a custom AI assistant for my specific needs

#### Acceptance Criteria

1. THE RAG Platform SHALL provide a form interface for chatbot creation
2. WHEN the user accesses the chatbot creation flow, THE RAG Platform SHALL display input fields for chatbot name and system prompt
3. THE RAG Platform SHALL validate that the chatbot name field is not empty before allowing progression
4. THE RAG Platform SHALL validate that the system prompt field is not empty before allowing progression
5. THE Flask Server SHALL use the Gemini API for all LLM operations without requiring user model selection

### Requirement 2

**User Story:** As a user, I want to upload multiple documents to train my chatbot, so that it can answer questions based on my specific data

#### Acceptance Criteria

1. THE RAG Platform SHALL accept PDF file uploads with a maximum size of 50MB per file
2. THE RAG Platform SHALL accept TXT file uploads with a maximum size of 50MB per file
3. THE RAG Platform SHALL accept DOCX file uploads with a maximum size of 50MB per file
4. THE RAG Platform SHALL allow users to upload up to 10 files per chatbot
5. WHEN a user uploads a file with an unsupported format, THE RAG Platform SHALL display an error message indicating supported formats
6. WHEN a user uploads a file exceeding the size limit, THE RAG Platform SHALL display an error message indicating the maximum file size

### Requirement 3

**User Story:** As a user, I want my uploaded documents to be automatically processed into embeddings, so that my chatbot can retrieve relevant information from them

#### Acceptance Criteria

1. WHEN a user completes document upload, THE Flask Server SHALL extract text content from each uploaded document using LangChain document loaders
2. WHEN text extraction is complete, THE Flask Server SHALL generate embeddings for the extracted text using the local Sentence Transformer model
3. THE Flask Server SHALL store the generated embeddings in the Vector Store on the local server with references to the source documents
4. WHEN embedding generation is in progress, THE RAG Platform SHALL display a processing status indicator to the user
5. WHEN embedding generation completes successfully, THE Flask Server SHALL notify the user that the chatbot is ready

### Requirement 4

**User Story:** As a user, I want to interact with my chatbot through a simple query interface, so that I can ask questions and receive answers based on my uploaded documents

#### Acceptance Criteria

1. THE RAG Platform SHALL provide a chat interface for querying the created chatbot
2. WHEN a user submits a query, THE Flask Server SHALL retrieve relevant embeddings from the Vector Store using LangChain similarity search
3. WHEN relevant embeddings are retrieved, THE Flask Server SHALL send the query and retrieved context to the Gemini API using LangChain
4. WHEN the Gemini API generates a response, THE Flask Server SHALL return the response to display in the chat interface
5. THE Flask Server SHALL maintain conversation history within a single chat session

### Requirement 5

**User Story:** As a user, I want to complete the chatbot creation process in 3-4 simple steps, so that I can quickly set up my chatbot without technical complexity

#### Acceptance Criteria

1. THE RAG Platform SHALL organize the chatbot creation flow into exactly four sequential steps
2. THE RAG Platform SHALL label the first step as "Basic Settings" for chatbot configuration
3. THE RAG Platform SHALL label the second step as "Data Upload" for document uploads
4. THE RAG Platform SHALL label the third step as "Preview & Test" for initial chatbot testing
5. THE RAG Platform SHALL label the fourth step as "Deploy" for making the chatbot live
6. WHEN a user completes a step, THE RAG Platform SHALL enable navigation to the next step
7. THE RAG Platform SHALL allow users to navigate back to previous steps to modify settings

### Requirement 6

**User Story:** As a user, I want the system to use a locally deployed model, so that my data remains private and the system operates independently

#### Acceptance Criteria

1. THE Flask Server SHALL connect to the Gemini API using a valid API key for LLM response generation
2. THE Flask Server SHALL load the Sentence Transformer model locally for generating embeddings from uploaded documents
3. THE Flask Server SHALL use LangChain with the Gemini API for generating responses to user queries
4. WHEN the Gemini API is unavailable, THE Flask Server SHALL return an error response and THE RAG Platform SHALL display an error message indicating service unavailability
5. THE Flask Server SHALL store all embeddings in local server storage


