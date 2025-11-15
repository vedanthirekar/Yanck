"""
Document Service for handling file uploads, text extraction, and embedding generation.
"""

import os
import uuid
import logging
from typing import List, Dict, Any
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
except ImportError:
    from langchain_text_splitters import RecursiveCharacterTextSplitter

try:
    from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
except ImportError:
    # Fallback for older langchain versions
    from langchain.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader

from models.database import get_db_connection
from models.embedding_manager import EmbeddingManager
from models.vector_store_manager import VectorStoreManager

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Service class for managing document operations.

    Handles document upload, text extraction, chunking, embedding generation,
    and status tracking for chatbot training documents.
    """

    # File validation constants
    ALLOWED_EXTENSIONS = {'pdf', 'txt', 'docx'}
    MAX_FILE_SIZE_MB = 50
    MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    MAX_FILES_PER_CHATBOT = 10

    # Text chunking configuration
    CHUNK_SIZE = 800
    CHUNK_OVERLAP = 150

    def __init__(
        self,
        embedding_manager: EmbeddingManager,
        vector_store_manager: VectorStoreManager,
        upload_folder: str = "./data/uploads"
    ):
        """
        Initialize the DocumentService.

        Args:
            embedding_manager: EmbeddingManager instance for generating embeddings
            vector_store_manager: VectorStoreManager instance for storing embeddings
            upload_folder: Base directory for storing uploaded files
        """
        self.embedding_manager = embedding_manager
        self.vector_store_manager = vector_store_manager
        self.upload_folder = upload_folder

        # Create upload folder if it doesn't exist
        os.makedirs(upload_folder, exist_ok=True)

        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.CHUNK_SIZE,
            chunk_overlap=self.CHUNK_OVERLAP,
            separators=["\n\n", "\n", " ", ""]
        )

        logger.info("DocumentService initialized")

    def _get_file_extension(self, filename: str) -> str:
        """
        Extract file extension from filename.

        Args:
            filename: Name of the file

        Returns:
            Lowercase file extension without the dot
        """
        return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

    def _validate_file_type(self, filename: str) -> bool:
        """
        Validate if file type is supported.

        Args:
            filename: Name of the file

        Returns:
            True if file type is supported, False otherwise
        """
        extension = self._get_file_extension(filename)
        return extension in self.ALLOWED_EXTENSIONS

    def _validate_file_size(self, file: FileStorage) -> bool:
        """
        Validate if file size is within limits.

        Args:
            file: FileStorage object

        Returns:
            True if file size is valid, False otherwise
        """
        # Seek to end to get file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset to beginning

        return file_size <= self.MAX_FILE_SIZE_BYTES

    def _get_chatbot_upload_folder(self, chatbot_id: str) -> str:
        """
        Get the upload folder path for a specific chatbot.

        Args:
            chatbot_id: Unique identifier for the chatbot

        Returns:
            Path to the chatbot's upload folder
        """
        folder_path = os.path.join(self.upload_folder, chatbot_id)
        os.makedirs(folder_path, exist_ok=True)
        return folder_path

    def upload_documents(
        self,
        chatbot_id: str,
        files: List[FileStorage]
    ) -> Dict[str, Any]:
        """
        Upload and validate documents for a chatbot.

        Args:
            chatbot_id: Unique identifier for the chatbot
            files: List of FileStorage objects to upload

        Returns:
            Dictionary containing upload results:
                - success: Boolean indicating overall success
                - uploaded_files: List of successfully uploaded file info
                - errors: List of error messages for failed uploads

        Raises:
            ValueError: If validation fails or limits are exceeded
            Exception: If database or file operations fail
        """
        if not files or len(files) == 0:
            raise ValueError("No files provided for upload")

        if len(files) > self.MAX_FILES_PER_CHATBOT:
            raise ValueError(
                f"Too many files. Maximum {self.MAX_FILES_PER_CHATBOT} files allowed, "
                f"but {len(files)} provided"
            )

        # Check existing document count
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT COUNT(*) as count FROM documents WHERE chatbot_id = ?",
                    (chatbot_id,)
                )
                existing_count = cursor.fetchone()['count']

                if existing_count + len(files) > self.MAX_FILES_PER_CHATBOT:
                    raise ValueError(
                        f"Upload would exceed maximum of {self.MAX_FILES_PER_CHATBOT} files. "
                        f"Current: {existing_count}, Attempting to add: {len(files)}"
                    )
        except Exception as e:
            logger.error("Failed to check existing document count: %s", str(e))
            raise

        uploaded_files = []
        errors = []

        chatbot_folder = self._get_chatbot_upload_folder(chatbot_id)

        for file in files:
            try:
                # Validate file has a filename
                if not file.filename:
                    errors.append({"filename": "unknown", "error": "No filename provided"})
                    continue

                # Validate file type
                if not self._validate_file_type(file.filename):
                    errors.append({
                        "filename": file.filename,
                        "error": f"Unsupported file type. Allowed types: {', '.join(self.ALLOWED_EXTENSIONS)}"
                    })
                    continue

                # Validate file size
                if not self._validate_file_size(file):
                    errors.append({
                        "filename": file.filename,
                        "error": f"File size exceeds maximum of {self.MAX_FILE_SIZE_MB}MB"
                    })
                    continue

                # Generate unique document ID and secure filename
                document_id = str(uuid.uuid4())
                secure_name = secure_filename(file.filename)
                file_extension = self._get_file_extension(secure_name)

                # Create unique filename to avoid collisions
                unique_filename = f"{document_id}.{file_extension}"
                file_path = os.path.join(chatbot_folder, unique_filename)

                # Save file
                file.save(file_path)

                # Get actual file size
                file_size = os.path.getsize(file_path)

                # Save document metadata to database
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO documents (id, chatbot_id, filename, file_type, file_size, file_path, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (document_id, chatbot_id, secure_name, file_extension, file_size, file_path, 'uploaded'))

                uploaded_files.append({
                    "id": document_id,
                    "filename": secure_name,
                    "file_type": file_extension,
                    "file_size": file_size,
                    "status": "uploaded"
                })

                logger.info("Uploaded document '%s' for chatbot '%s'", secure_name, chatbot_id)

            except Exception as e:
                error_msg = f"Failed to upload file: {str(e)}"
                errors.append({
                    "filename": file.filename if file.filename else "unknown",
                    "error": error_msg
                })
                logger.error("Error uploading file '%s': %s", file.filename, str(e))

        result = {
            "success": len(uploaded_files) > 0,
            "uploaded_files": uploaded_files,
            "errors": errors
        }

        return result

    def extract_text(self, file_path: str, file_type: str) -> str:
        """
        Extract text content from a document file using LangChain loaders.

        Args:
            file_path: Path to the document file
            file_type: Type of the file (pdf, txt, docx)

        Returns:
            Extracted text content as a string

        Raises:
            ValueError: If file type is unsupported
            FileNotFoundError: If file doesn't exist
            Exception: If text extraction fails
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_type = file_type.lower()

        if file_type not in self.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type: {file_type}. "
                f"Allowed types: {', '.join(self.ALLOWED_EXTENSIONS)}"
            )

        try:
            # Select appropriate loader based on file type
            if file_type == 'pdf':
                loader = PyPDFLoader(file_path)
            elif file_type == 'txt':
                loader = TextLoader(file_path, encoding='utf-8')
            elif file_type == 'docx':
                loader = Docx2txtLoader(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")

            # Load documents
            documents = loader.load()

            # Combine all pages/sections into single text
            text = "\n\n".join([doc.page_content for doc in documents])

            logger.info("Extracted text from file '%s' (%d characters)", file_path, len(text))
            return text

        except Exception as e:
            logger.error("Failed to extract text from '%s': %s", file_path, str(e))
            raise Exception(f"Text extraction failed: {str(e)}") from e

    def generate_embeddings(self, chatbot_id: str) -> None:
        """
        Generate embeddings for all uploaded documents of a chatbot.

        This method:
        1. Retrieves all uploaded documents for the chatbot
        2. Extracts text from each document
        3. Chunks the text into smaller pieces
        4. Generates embeddings for each chunk
        5. Stores embeddings in the vector store
        6. Updates document and chatbot status

        Args:
            chatbot_id: Unique identifier for the chatbot

        Raises:
            ValueError: If no documents found or chatbot doesn't exist
            Exception: If embedding generation or storage fails
        """
        try:
            # Get all uploaded documents for this chatbot
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, filename, file_type, file_path, status
                    FROM documents
                    WHERE chatbot_id = ? AND status = 'uploaded'
                """, (chatbot_id,))

                documents = cursor.fetchall()

            if not documents:
                raise ValueError(f"No uploaded documents found for chatbot '{chatbot_id}'")

            logger.info("Processing %d documents for chatbot '%s'", len(documents), chatbot_id)

            # Update chatbot status to processing
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE chatbots
                    SET status = 'processing', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (chatbot_id,))

            all_chunks = []
            all_metadata = []

            # Process each document
            for doc in documents:
                document_id = doc['id']
                filename = doc['filename']
                file_type = doc['file_type']
                file_path = doc['file_path']

                try:
                    # Update document status to processing
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE documents
                            SET status = 'processing'
                            WHERE id = ?
                        """, (document_id,))

                    # Extract text
                    text = self.extract_text(file_path, file_type)

                    if not text or not text.strip():
                        logger.warning("No text extracted from document '%s'", filename)
                        with get_db_connection() as conn:
                            cursor = conn.cursor()
                            cursor.execute("""
                                UPDATE documents
                                SET status = 'error'
                                WHERE id = ?
                            """, (document_id,))
                        continue

                    # Split text into chunks
                    chunks = self.text_splitter.split_text(text)

                    logger.info(
                        "Split document '%s' into %d chunks",
                        filename,
                        len(chunks)
                    )

                    # Add chunks and metadata
                    for i, chunk in enumerate(chunks):
                        all_chunks.append(chunk)
                        all_metadata.append({
                            "document_id": document_id,
                            "filename": filename,
                            "chunk_index": i,
                            "total_chunks": len(chunks)
                        })

                    # Update document status to completed
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE documents
                            SET status = 'completed'
                            WHERE id = ?
                        """, (document_id,))

                    logger.info("Successfully processed document '%s'", filename)

                except Exception as e:
                    logger.error("Failed to process document '%s': %s", filename, str(e))
                    # Update document status to error
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE documents
                            SET status = 'error'
                            WHERE id = ?
                        """, (document_id,))
                    # Continue processing other documents

            if not all_chunks:
                raise Exception("No text chunks generated from any documents")

            # Generate embeddings for all chunks
            logger.info("Generating embeddings for %d chunks", len(all_chunks))
            embeddings = self.embedding_manager.encode(all_chunks)

            # Create or load vector store
            try:
                # Try to load existing store
                self.vector_store_manager.load_store(chatbot_id)
            except FileNotFoundError:
                # Create new store if it doesn't exist
                dimension = self.embedding_manager.get_embedding_dimension()
                self.vector_store_manager.create_store(chatbot_id, dimension)

            # Add documents to vector store
            self.vector_store_manager.add_documents(
                chatbot_id,
                all_chunks,
                embeddings,
                all_metadata
            )

            # Update chatbot status to ready
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE chatbots
                    SET status = 'ready', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (chatbot_id,))

            logger.info(
                "Successfully generated embeddings for chatbot '%s' (%d chunks)",
                chatbot_id,
                len(all_chunks)
            )

        except Exception as e:
            logger.error("Failed to generate embeddings for chatbot '%s': %s", chatbot_id, str(e))

            # Update chatbot status to error
            try:
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE chatbots
                        SET status = 'error', updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (chatbot_id,))
            except Exception as update_error:
                logger.error("Failed to update chatbot status: %s", str(update_error))

            raise Exception(f"Embedding generation failed: {str(e)}") from e

    def delete_document(self, chatbot_id: str, document_id: str) -> Dict[str, Any]:
        """
        Delete a document and regenerate the vector store.

        Args:
            chatbot_id: Unique identifier for the chatbot
            document_id: Unique identifier for the document to delete

        Returns:
            Dictionary containing deletion results:
                - success: Boolean indicating success
                - message: Status message

        Raises:
            ValueError: If document doesn't exist or doesn't belong to the chatbot
            Exception: If deletion or vector store regeneration fails
        """
        try:
            # Get document info and verify it belongs to this chatbot
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, chatbot_id, filename, file_path
                    FROM documents
                    WHERE id = ? AND chatbot_id = ?
                """, (document_id, chatbot_id))

                document = cursor.fetchone()

                if document is None:
                    raise ValueError(f"Document '{document_id}' not found for chatbot '{chatbot_id}'")

                file_path = document['file_path']
                filename = document['filename']

            # Delete the physical file
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logger.info("Deleted file: %s", file_path)
                except Exception as e:
                    logger.error("Failed to delete file '%s': %s", file_path, str(e))
                    # Continue with database deletion even if file deletion fails

            # Delete the document record from database
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    DELETE FROM documents WHERE id = ?
                """, (document_id,))

            logger.info("Deleted document '%s' from chatbot '%s'", filename, chatbot_id)

            # Check if there are any remaining documents
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT COUNT(*) as count FROM documents WHERE chatbot_id = ?
                """, (chatbot_id,))
                remaining_count = cursor.fetchone()['count']

            # If no documents remain, delete the vector store and update chatbot status
            if remaining_count == 0:
                try:
                    self.vector_store_manager.delete_store(chatbot_id)
                    logger.info("Deleted vector store for chatbot '%s' (no documents remaining)", chatbot_id)
                except FileNotFoundError:
                    logger.warning("Vector store for chatbot '%s' not found", chatbot_id)

                # Update chatbot status to 'creating' since it has no documents
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE chatbots
                        SET status = 'creating', updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (chatbot_id,))

                return {
                    "success": True,
                    "message": f"Document '{filename}' deleted. No documents remain.",
                    "remaining_documents": 0
                }
            else:
                # Regenerate vector store with remaining documents
                logger.info("Regenerating vector store for chatbot '%s' after document deletion", chatbot_id)

                # Delete existing vector store
                try:
                    self.vector_store_manager.delete_store(chatbot_id)
                except FileNotFoundError:
                    pass

                # Get all remaining documents
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE documents
                        SET status = 'uploaded'
                        WHERE chatbot_id = ?
                    """, (chatbot_id,))

                # Regenerate embeddings for remaining documents
                self.generate_embeddings(chatbot_id)

                return {
                    "success": True,
                    "message": f"Document '{filename}' deleted. Vector store regenerated.",
                    "remaining_documents": remaining_count
                }

        except ValueError:
            raise
        except Exception as e:
            logger.error("Failed to delete document '%s': %s", document_id, str(e))
            raise Exception(f"Document deletion failed: {str(e)}") from e

    def get_document_status(self, chatbot_id: str) -> Dict[str, Any]:
        """
        Get the processing status of documents for a chatbot.

        Args:
            chatbot_id: Unique identifier for the chatbot

        Returns:
            Dictionary containing status information:
                - chatbot_id: ID of the chatbot
                - chatbot_status: Overall chatbot status
                - total_documents: Total number of documents
                - documents: List of document status details

        Raises:
            ValueError: If chatbot doesn't exist
            Exception: If database query fails
        """
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()

                # Get chatbot status
                cursor.execute("""
                    SELECT status FROM chatbots WHERE id = ?
                """, (chatbot_id,))

                chatbot_row = cursor.fetchone()

                if chatbot_row is None:
                    raise ValueError(f"Chatbot '{chatbot_id}' not found")

                chatbot_status = chatbot_row['status']

                # Get all documents for this chatbot
                cursor.execute("""
                    SELECT id, filename, file_type, file_size, status, uploaded_at
                    FROM documents
                    WHERE chatbot_id = ?
                    ORDER BY uploaded_at DESC
                """, (chatbot_id,))

                documents = cursor.fetchall()

                document_list = []
                for doc in documents:
                    document_list.append({
                        "id": doc['id'],
                        "filename": doc['filename'],
                        "file_type": doc['file_type'],
                        "file_size": doc['file_size'],
                        "status": doc['status'],
                        "uploaded_at": doc['uploaded_at']
                    })

                status_info = {
                    "chatbot_id": chatbot_id,
                    "chatbot_status": chatbot_status,
                    "total_documents": len(document_list),
                    "documents": document_list
                }

                logger.info("Retrieved status for chatbot '%s'", chatbot_id)
                return status_info

        except ValueError:
            raise
        except Exception as e:
            logger.error("Failed to get document status for chatbot '%s': %s", chatbot_id, str(e))
            raise Exception(f"Failed to retrieve document status: {str(e)}") from e
