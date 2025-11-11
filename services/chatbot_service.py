"""
Chatbot Service for managing chatbot lifecycle and metadata.
"""

import uuid
import logging
import os
import shutil
from typing import Optional, Dict, Any

from models.database import get_db_connection
from models.vector_store_manager import VectorStoreManager

logger = logging.getLogger(__name__)


class ChatbotService:
    """
    Service class for managing chatbot operations.

    Handles chatbot creation, retrieval, status updates, and deletion
    with cascade deletion of associated documents and vector stores.
    """

    def __init__(self, vector_store_manager: Optional[VectorStoreManager] = None):
        """
        Initialize the ChatbotService.

        Args:
            vector_store_manager: Optional VectorStoreManager instance.
                                 If None, creates a new instance.
        """
        self.vector_store_manager = vector_store_manager or VectorStoreManager()
        logger.info("ChatbotService initialized")

    def create_chatbot(self, name: str, system_prompt: str) -> Dict[str, Any]:
        """
        Create a new chatbot with validation.

        Args:
            name: Name of the chatbot (required, non-empty)
            system_prompt: System prompt for the chatbot (required, non-empty)

        Returns:
            Dictionary containing chatbot metadata:
                - id: Unique chatbot identifier
                - name: Chatbot name
                - system_prompt: System prompt
                - status: Current status ('creating')
                - created_at: Creation timestamp
                - updated_at: Last update timestamp

        Raises:
            ValueError: If name or system_prompt is empty or invalid
            Exception: If database operation fails
        """
        # Validate inputs
        if not name or not isinstance(name, str) or not name.strip():
            raise ValueError("Chatbot name is required and cannot be empty")

        if not system_prompt or not isinstance(system_prompt, str) or not system_prompt.strip():
            raise ValueError("System prompt is required and cannot be empty")

        # Generate unique ID
        chatbot_id = str(uuid.uuid4())

        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()

                # Insert chatbot record
                cursor.execute("""
                    INSERT INTO chatbots (id, name, system_prompt, status)
                    VALUES (?, ?, ?, ?)
                """, (chatbot_id, name.strip(), system_prompt.strip(), 'creating'))

                # Retrieve the created chatbot
                cursor.execute("""
                    SELECT id, name, system_prompt, status, created_at, updated_at
                    FROM chatbots
                    WHERE id = ?
                """, (chatbot_id,))

                row = cursor.fetchone()

                chatbot = {
                    'id': row['id'],
                    'name': row['name'],
                    'system_prompt': row['system_prompt'],
                    'status': row['status'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }

                logger.info("Created chatbot '%s' with id '%s'", name, chatbot_id)
                return chatbot

        except Exception as e:
            logger.error("Failed to create chatbot '%s': %s", name, str(e))
            raise Exception(f"Chatbot creation failed: {str(e)}") from e

    def get_chatbot(self, chatbot_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a chatbot by ID.

        Args:
            chatbot_id: Unique identifier of the chatbot

        Returns:
            Dictionary containing chatbot metadata if found, None otherwise:
                - id: Unique chatbot identifier
                - name: Chatbot name
                - system_prompt: System prompt
                - status: Current status
                - created_at: Creation timestamp
                - updated_at: Last update timestamp

        Raises:
            ValueError: If chatbot_id is empty or invalid
            Exception: If database operation fails
        """
        if not chatbot_id or not isinstance(chatbot_id, str) or not chatbot_id.strip():
            raise ValueError("Chatbot ID is required and cannot be empty")

        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()

                cursor.execute("""
                    SELECT id, name, system_prompt, status, created_at, updated_at
                    FROM chatbots
                    WHERE id = ?
                """, (chatbot_id.strip(),))

                row = cursor.fetchone()

                if row is None:
                    logger.warning("Chatbot with id '%s' not found", chatbot_id)
                    return None

                chatbot = {
                    'id': row['id'],
                    'name': row['name'],
                    'system_prompt': row['system_prompt'],
                    'status': row['status'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }

                logger.info("Retrieved chatbot with id '%s'", chatbot_id)
                return chatbot

        except Exception as e:
            logger.error("Failed to retrieve chatbot '%s': %s", chatbot_id, str(e))
            raise Exception(f"Chatbot retrieval failed: {str(e)}") from e

    def update_chatbot_status(self, chatbot_id: str, status: str) -> None:
        """
        Update the status of a chatbot.

        Args:
            chatbot_id: Unique identifier of the chatbot
            status: New status value (e.g., 'creating', 'processing', 'ready', 'error')

        Raises:
            ValueError: If chatbot_id or status is empty or invalid
            Exception: If database operation fails or chatbot not found
        """
        if not chatbot_id or not isinstance(chatbot_id, str) or not chatbot_id.strip():
            raise ValueError("Chatbot ID is required and cannot be empty")

        if not status or not isinstance(status, str) or not status.strip():
            raise ValueError("Status is required and cannot be empty")

        # Validate status value
        valid_statuses = ['creating', 'processing', 'ready', 'error']
        if status.strip() not in valid_statuses:
            raise ValueError(
                f"Invalid status '{status}'. "
                f"Must be one of: {', '.join(valid_statuses)}"
            )

        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()

                # Update status and updated_at timestamp
                cursor.execute("""
                    UPDATE chatbots
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (status.strip(), chatbot_id.strip()))

                if cursor.rowcount == 0:
                    raise Exception(f"Chatbot with id '{chatbot_id}' not found")

                logger.info(
                    "Updated chatbot '%s' status to '%s'",
                    chatbot_id,
                    status
                )

        except Exception as e:
            logger.error(
                "Failed to update status for chatbot '%s': %s",
                chatbot_id,
                str(e)
            )
            raise Exception(f"Status update failed: {str(e)}") from e

    def delete_chatbot(self, chatbot_id: str) -> None:
        """
        Delete a chatbot with cascade deletion of documents and vector store.

        This method performs the following operations:
        1. Deletes the chatbot's vector store
        2. Deletes uploaded document files
        3. Deletes database records (documents and chatbot)

        Args:
            chatbot_id: Unique identifier of the chatbot

        Raises:
            ValueError: If chatbot_id is empty or invalid
            Exception: If deletion operation fails
        """
        if not chatbot_id or not isinstance(chatbot_id, str) or not chatbot_id.strip():
            raise ValueError("Chatbot ID is required and cannot be empty")

        chatbot_id = chatbot_id.strip()

        try:
            # First, verify chatbot exists
            chatbot = self.get_chatbot(chatbot_id)
            if chatbot is None:
                raise Exception(f"Chatbot with id '{chatbot_id}' not found")

            # Get document file paths before deletion
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT file_path FROM documents WHERE chatbot_id = ?
                """, (chatbot_id,))
                file_paths = [row['file_path'] for row in cursor.fetchall()]

            # Delete vector store (if exists)
            try:
                self.vector_store_manager.delete_store(chatbot_id)
                logger.info("Deleted vector store for chatbot '%s'", chatbot_id)
            except FileNotFoundError:
                logger.warning(
                    "Vector store for chatbot '%s' not found, skipping",
                    chatbot_id
                )
            except Exception as e:
                logger.error(
                    "Failed to delete vector store for chatbot '%s': %s",
                    chatbot_id,
                    str(e)
                )
                # Continue with deletion even if vector store deletion fails

            # Delete uploaded files
            for file_path in file_paths:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info("Deleted file: %s", file_path)
                except Exception as e:
                    logger.error("Failed to delete file '%s': %s", file_path, str(e))
                    # Continue with deletion even if file deletion fails

            # Delete chatbot upload directory if it exists
            upload_dir = os.path.join('./data/uploads', chatbot_id)
            if os.path.exists(upload_dir):
                try:
                    shutil.rmtree(upload_dir)
                    logger.info("Deleted upload directory for chatbot '%s'", chatbot_id)
                except Exception as e:
                    logger.error(
                        "Failed to delete upload directory for chatbot '%s': %s",
                        chatbot_id,
                        str(e)
                    )

            # Delete database records (CASCADE will handle documents)
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM chatbots WHERE id = ?", (chatbot_id,))

                if cursor.rowcount == 0:
                    raise Exception(f"Chatbot with id '{chatbot_id}' not found in database")

            logger.info("Successfully deleted chatbot '%s'", chatbot_id)

        except Exception as e:
            logger.error("Failed to delete chatbot '%s': %s", chatbot_id, str(e))
            raise Exception(f"Chatbot deletion failed: {str(e)}") from e
