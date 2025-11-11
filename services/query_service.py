"""
Query Service for handling user queries with RAG pipeline.
"""

import os
import logging
from typing import List, Dict, Any, Optional

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    # Fallback for older package structure
    try:
        from langchain.chat_models import ChatGoogleGenerativeAI
    except ImportError:
        ChatGoogleGenerativeAI = None

try:
    import google.generativeai as genai

    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

from models.embedding_manager import EmbeddingManager
from models.vector_store_manager import VectorStoreManager
from models.database import get_db_connection

logger = logging.getLogger(__name__)


class QueryService:
    """
    Service class for handling user queries using RAG pipeline.

    Orchestrates retrieval of relevant context from vector store and
    generation of responses using Gemini API via LangChain.
    """

    def __init__(
        self,
        embedding_manager: EmbeddingManager,
        vector_store_manager: VectorStoreManager,
        gemini_api_key: Optional[str] = None,
    ):
        """
        Initialize the QueryService with RAG components.

        Args:
            embedding_manager: EmbeddingManager instance for query embeddings
            vector_store_manager: VectorStoreManager instance for retrieval
            gemini_api_key: Google Gemini API key (defaults to env variable)

        Raises:
            ImportError: If langchain-google-genai package is not installed
            ValueError: If Gemini API key is not provided
        """
        self.embedding_manager = embedding_manager
        self.vector_store_manager = vector_store_manager

        # Get API key from parameter or environment
        self.gemini_api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")

        if not self.gemini_api_key:
            raise ValueError(
                "Gemini API key is required. "
                "Set GEMINI_API_KEY environment variable or pass as parameter."
            )

        # Initialize Gemini LLM
        try:
            self.llm = self._initialize_llm()
            logger.info("QueryService initialized with Gemini API")
        except Exception as e:
            logger.error("Failed to initialize QueryService: %s", str(e))
            raise

    def _initialize_llm(self, model_name: str = "gemini-2.5-flash") -> Any:
        """
        Initialize the Gemini LLM via LangChain or direct API.

        Args:
            model_name: Name of the Gemini model to use

        Returns:
            Initialized model instance

        Raises:
            ImportError: If required packages are not installed
            Exception: If LLM initialization fails
        """
        if ChatGoogleGenerativeAI is None and not GENAI_AVAILABLE:
            raise ImportError(
                "langchain-google-genai package is not installed. "
                "Install it with: pip install langchain-google-genai"
            )

        try:
            # Use direct Google Generative AI SDK instead of LangChain wrapper
            if GENAI_AVAILABLE:
                genai.configure(api_key=self.gemini_api_key)
                # Create model with specified name
                model = genai.GenerativeModel(model_name)
                logger.info("Initialized Gemini LLM (%s) via direct API", model_name)
                return model
            else:
                # Fallback to LangChain
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    temperature=0.7,
                    google_api_key=self.gemini_api_key,
                )
                logger.info("Initialized Gemini LLM (%s) via LangChain", model_name)
                return llm
        except Exception as e:
            logger.error("Failed to initialize Gemini LLM: %s", str(e))
            raise Exception(f"LLM initialization failed: {str(e)}") from e

    def retrieve_context(
        self, chatbot_id: str, question: str, k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context from vector store using similarity search.

        Args:
            chatbot_id: Unique identifier for the chatbot
            question: User's question text
            k: Number of most similar documents to retrieve (default: 4)

        Returns:
            List of dictionaries containing retrieved documents with metadata

        Raises:
            ValueError: If inputs are invalid
            FileNotFoundError: If vector store doesn't exist
            Exception: If retrieval fails
        """
        if not chatbot_id or not isinstance(chatbot_id, str):
            raise ValueError("Valid chatbot_id is required")

        if not question or not isinstance(question, str) or not question.strip():
            raise ValueError("Valid question is required")

        try:
            # Generate embedding for the question
            query_embedding = self.embedding_manager.encode(question.strip())

            # Perform similarity search
            results = self.vector_store_manager.similarity_search(
                chatbot_id, query_embedding, k=k
            )

            logger.info(
                "Retrieved %d context documents for chatbot '%s'",
                len(results),
                chatbot_id,
            )

            return results

        except (ValueError, FileNotFoundError):
            raise
        except Exception as e:
            logger.error(
                "Failed to retrieve context for chatbot '%s': %s", chatbot_id, str(e)
            )
            raise Exception(f"Context retrieval failed: {str(e)}") from e

    def generate_response(
        self,
        question: str,
        context: List[Dict[str, Any]],
        system_prompt: str,
        model_name: str = "gemini-2.5-flash",
        history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Generate response using Gemini API with retrieved context.

        Constructs a prompt with system prompt, context, conversation history,
        and the user's question, then sends it to Gemini for response generation.

        Args:
            question: User's question text
            context: List of retrieved context documents
            system_prompt: System prompt defining chatbot behavior
            model_name: Name of the Gemini model to use
            history: Optional conversation history (list of role/content dicts)

        Returns:
            Generated response text from Gemini

        Raises:
            ValueError: If inputs are invalid
            Exception: If Gemini API call fails
        """
        if not question or not isinstance(question, str):
            raise ValueError("Valid question is required")

        if not system_prompt or not isinstance(system_prompt, str):
            raise ValueError("Valid system_prompt is required")

        try:
            # Initialize LLM with the specified model
            llm = self._initialize_llm(model_name)

            # Build context text from retrieved documents
            context_text = ""
            if context and len(context) > 0:
                context_parts = []
                for i, doc in enumerate(context, 1):
                    text = doc.get("text", "")
                    filename = doc.get("filename", "Unknown")
                    context_parts.append(f"[Document {i} - {filename}]\n{text}")
                context_text = "\n\n".join(context_parts)

            # Build conversation history text
            history_text = ""
            if history and len(history) > 0:
                history_parts = []
                for msg in history:
                    role = msg.get("role", "")
                    content = msg.get("content", "")
                    if role == "user":
                        history_parts.append(f"User: {content}")
                    elif role == "assistant":
                        history_parts.append(f"Assistant: {content}")
                history_text = "\n".join(history_parts)

            # Construct the full prompt
            prompt_parts = [system_prompt]

            if context_text:
                prompt_parts.append(
                    f"\nRelevant information from documents:\n{context_text}"
                )

            if history_text:
                prompt_parts.append(f"\nConversation history:\n{history_text}")

            prompt_parts.append(f"\nUser question: {question}")
            prompt_parts.append(
                "\nPlease provide a helpful response based on the information above."
            )

            full_prompt = "\n".join(prompt_parts)

            # Call Gemini API
            logger.debug("Sending prompt to Gemini API with model %s", model_name)

            if GENAI_AVAILABLE:
                # Use direct Google Generative AI SDK
                response = llm.generate_content(full_prompt)
                response_text = response.text
            else:
                # Use LangChain wrapper
                response = llm.invoke(full_prompt)
                # Extract response text
                if hasattr(response, "content"):
                    response_text = response.content
                else:
                    response_text = str(response)

            logger.info(
                "Generated response for question (length: %d) using model %s",
                len(response_text),
                model_name
            )
            return response_text

        except Exception as e:
            logger.error("Failed to generate response: %s", str(e))
            raise Exception(
                f"Response generation failed. Gemini API may be unavailable: {str(e)}"
            ) from e

    def query(
        self,
        chatbot_id: str,
        question: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        k: int = 4,
    ) -> Dict[str, Any]:
        """
        Process a user query using the complete RAG pipeline.

        Orchestrates the full query flow:
        1. Retrieve chatbot configuration
        2. Retrieve relevant context from vector store
        3. Generate response using Gemini with context and history
        4. Return response with metadata

        Args:
            chatbot_id: Unique identifier for the chatbot
            question: User's question text
            chat_history: Optional conversation history
            k: Number of context documents to retrieve (default: 4)

        Returns:
            Dictionary containing:
                - response: Generated response text
                - sources: List of source documents used
                - chatbot_id: ID of the chatbot

        Raises:
            ValueError: If inputs are invalid or chatbot not found
            Exception: If query processing fails
        """
        if not chatbot_id or not isinstance(chatbot_id, str):
            raise ValueError("Valid chatbot_id is required")

        if not question or not isinstance(question, str) or not question.strip():
            raise ValueError("Valid question is required")

        try:
            # Get chatbot configuration
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT id, name, system_prompt, model, status
                    FROM chatbots
                    WHERE id = ?
                """,
                    (chatbot_id,),
                )

                chatbot = cursor.fetchone()

                if chatbot is None:
                    raise ValueError(f"Chatbot '{chatbot_id}' not found")

                if chatbot["status"] != "ready":
                    raise ValueError(
                        f"Chatbot is not ready. Current status: {chatbot['status']}"
                    )

                system_prompt = chatbot["system_prompt"]
                model_name = chatbot["model"] or "gemini-2.5-flash"  # Default to gemini-2.5-flash if None

            # Retrieve relevant context
            context_docs = self.retrieve_context(chatbot_id, question, k=k)

            # Generate response with the chatbot's selected model
            response_text = self.generate_response(
                question, context_docs, system_prompt, model_name=model_name, history=chat_history
            )

            # Prepare source information
            sources = []
            for doc in context_docs:
                sources.append(
                    {
                        "filename": doc.get("filename", "Unknown"),
                        "chunk_index": doc.get("chunk_index", 0),
                        "score": doc.get("score", 0.0),
                    }
                )

            result = {
                "response": response_text,
                "sources": sources,
                "chatbot_id": chatbot_id,
            }

            logger.info("Successfully processed query for chatbot '%s'", chatbot_id)
            return result

        except ValueError:
            raise
        except Exception as e:
            logger.error(
                "Failed to process query for chatbot '%s': %s", chatbot_id, str(e)
            )
            raise Exception(f"Query processing failed: {str(e)}") from e
