"""
Vector Store Manager for FAISS operations.
"""

import os
import json
import logging
import shutil
from typing import List, Dict, Any, Optional, TYPE_CHECKING
import numpy as np

try:
    import faiss
except ImportError:
    faiss = None

if TYPE_CHECKING:
    import faiss

logger = logging.getLogger(__name__)


class VectorStoreManager:
    """
    Manages FAISS vector stores for each chatbot.
    
    This class handles creating, loading, and managing FAISS indices for
    storing and retrieving document embeddings.
    """
    
    def __init__(self, base_path: str = "./data/vector_stores"):
        """
        Initialize the VectorStoreManager.
        
        Args:
            base_path: Base directory path for storing vector stores
        
        Raises:
            ImportError: If faiss package is not installed
        """
        if faiss is None:
            raise ImportError(
                "faiss package is not installed. "
                "Install it with: pip install faiss-cpu"
            )
        
        self.base_path = base_path
        
        # Create base directory if it doesn't exist
        os.makedirs(base_path, exist_ok=True)
        logger.info(f"VectorStoreManager initialized with base path: {base_path}")
    
    def _get_store_path(self, chatbot_id: str) -> str:
        """
        Get the directory path for a chatbot's vector store.
        
        Args:
            chatbot_id: Unique identifier for the chatbot
            
        Returns:
            Path to the chatbot's vector store directory
        """
        return os.path.join(self.base_path, chatbot_id)
    
    def _get_index_path(self, chatbot_id: str) -> str:
        """
        Get the file path for a chatbot's FAISS index.
        
        Args:
            chatbot_id: Unique identifier for the chatbot
            
        Returns:
            Path to the FAISS index file
        """
        return os.path.join(self._get_store_path(chatbot_id), "index.faiss")
    
    def _get_metadata_path(self, chatbot_id: str) -> str:
        """
        Get the file path for a chatbot's metadata.
        
        Args:
            chatbot_id: Unique identifier for the chatbot
            
        Returns:
            Path to the metadata JSON file
        """
        return os.path.join(self._get_store_path(chatbot_id), "metadata.json")

    def create_store(self, chatbot_id: str, dimension: int) -> "faiss.Index":
        """
        Initialize a new FAISS index for a chatbot.
        
        Args:
            chatbot_id: Unique identifier for the chatbot
            dimension: Dimension of the embedding vectors
            
        Returns:
            Newly created FAISS index
            
        Raises:
            ValueError: If dimension is invalid or store already exists
            Exception: If index creation fails
        """
        if dimension <= 0:
            raise ValueError(f"Invalid embedding dimension: {dimension}")
        
        store_path = self._get_store_path(chatbot_id)
        
        # Check if store already exists
        if os.path.exists(store_path):
            raise ValueError(f"Vector store for chatbot '{chatbot_id}' already exists")
        
        try:
            # Create directory for this chatbot's vector store
            os.makedirs(store_path, exist_ok=True)
            
            # Create FAISS index using L2 distance (Euclidean)
            index = faiss.IndexFlatL2(dimension)
            
            # Save the empty index
            index_path = self._get_index_path(chatbot_id)
            faiss.write_index(index, index_path)
            
            # Initialize empty metadata
            metadata = {
                "chatbot_id": chatbot_id,
                "dimension": dimension,
                "total_documents": 0,
                "documents": []
            }
            
            metadata_path = self._get_metadata_path(chatbot_id)
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Created vector store for chatbot '{chatbot_id}' with dimension {dimension}")
            return index
            
        except Exception as e:
            # Clean up on failure
            if os.path.exists(store_path):
                shutil.rmtree(store_path)
            logger.error(f"Failed to create vector store for chatbot '{chatbot_id}': {str(e)}")
            raise Exception(f"Vector store creation failed: {str(e)}")
    
    def load_store(self, chatbot_id: str) -> "faiss.Index":
        """
        Load an existing FAISS index for a chatbot.
        
        Args:
            chatbot_id: Unique identifier for the chatbot
            
        Returns:
            Loaded FAISS index
            
        Raises:
            FileNotFoundError: If vector store doesn't exist
            Exception: If loading fails
        """
        index_path = self._get_index_path(chatbot_id)
        
        if not os.path.exists(index_path):
            raise FileNotFoundError(f"Vector store for chatbot '{chatbot_id}' not found")
        
        try:
            index = faiss.read_index(index_path)
            logger.info(f"Loaded vector store for chatbot '{chatbot_id}' with {index.ntotal} vectors")
            return index
            
        except Exception as e:
            logger.error(f"Failed to load vector store for chatbot '{chatbot_id}': {str(e)}")
            raise Exception(f"Vector store loading failed: {str(e)}")

    def add_documents(
        self, 
        chatbot_id: str, 
        texts: List[str], 
        embeddings: np.ndarray, 
        metadata: List[Dict[str, Any]]
    ) -> None:
        """
        Add documents with their embeddings and metadata to the vector store.
        
        Args:
            chatbot_id: Unique identifier for the chatbot
            texts: List of text chunks to add
            embeddings: NumPy array of embeddings with shape (n_texts, dimension)
            metadata: List of metadata dictionaries for each text chunk
            
        Raises:
            ValueError: If inputs are invalid or mismatched
            FileNotFoundError: If vector store doesn't exist
            Exception: If adding documents fails
        """
        if not texts or len(texts) == 0:
            raise ValueError("Cannot add empty texts list")
        
        if embeddings.shape[0] != len(texts):
            raise ValueError(
                f"Mismatch between number of texts ({len(texts)}) "
                f"and embeddings ({embeddings.shape[0]})"
            )
        
        if len(metadata) != len(texts):
            raise ValueError(
                f"Mismatch between number of texts ({len(texts)}) "
                f"and metadata entries ({len(metadata)})"
            )
        
        try:
            # Load existing index
            index = self.load_store(chatbot_id)
            
            # Verify embedding dimension matches
            if embeddings.shape[1] != index.d:
                raise ValueError(
                    f"Embedding dimension ({embeddings.shape[1]}) "
                    f"doesn't match index dimension ({index.d})"
                )
            
            # Add embeddings to index
            index.add(embeddings.astype('float32'))
            
            # Save updated index
            index_path = self._get_index_path(chatbot_id)
            faiss.write_index(index, index_path)
            
            # Load and update metadata
            metadata_path = self._get_metadata_path(chatbot_id)
            with open(metadata_path, 'r', encoding='utf-8') as f:
                store_metadata = json.load(f)
            
            # Add new documents to metadata
            for i, (text, meta) in enumerate(zip(texts, metadata)):
                doc_entry = {
                    "id": store_metadata["total_documents"] + i,
                    "text": text,
                    **meta
                }
                store_metadata["documents"].append(doc_entry)
            
            store_metadata["total_documents"] += len(texts)
            
            # Save updated metadata
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(store_metadata, f, indent=2)
            
            logger.info(
                f"Added {len(texts)} documents to vector store for chatbot '{chatbot_id}'. "
                f"Total documents: {store_metadata['total_documents']}"
            )
            
        except FileNotFoundError:
            raise
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to add documents to vector store for chatbot '{chatbot_id}': {str(e)}")
            raise Exception(f"Adding documents failed: {str(e)}")

    def similarity_search(
        self, 
        chatbot_id: str, 
        query_embedding: np.ndarray, 
        k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Perform similarity search to retrieve relevant documents.
        
        Args:
            chatbot_id: Unique identifier for the chatbot
            query_embedding: Query embedding vector with shape (1, dimension) or (dimension,)
            k: Number of most similar documents to retrieve
            
        Returns:
            List of dictionaries containing retrieved documents with metadata and scores
            
        Raises:
            ValueError: If inputs are invalid
            FileNotFoundError: If vector store doesn't exist
            Exception: If search fails
        """
        if k <= 0:
            raise ValueError(f"Invalid k value: {k}. Must be positive.")
        
        try:
            # Load index and metadata
            index = self.load_store(chatbot_id)
            
            metadata_path = self._get_metadata_path(chatbot_id)
            with open(metadata_path, 'r', encoding='utf-8') as f:
                store_metadata = json.load(f)
            
            # Check if index is empty
            if index.ntotal == 0:
                logger.warning(f"Vector store for chatbot '{chatbot_id}' is empty")
                return []
            
            # Reshape query embedding if needed
            if query_embedding.ndim == 1:
                query_embedding = query_embedding.reshape(1, -1)
            
            # Verify embedding dimension
            if query_embedding.shape[1] != index.d:
                raise ValueError(
                    f"Query embedding dimension ({query_embedding.shape[1]}) "
                    f"doesn't match index dimension ({index.d})"
                )
            
            # Limit k to available documents
            k = min(k, index.ntotal)
            
            # Perform similarity search
            distances, indices = index.search(query_embedding.astype('float32'), k)
            
            # Retrieve documents with metadata
            results = []
            for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                if idx < len(store_metadata["documents"]):
                    doc = store_metadata["documents"][idx].copy()
                    doc["score"] = float(distance)
                    doc["rank"] = i + 1
                    results.append(doc)
            
            logger.info(
                f"FAISS search completed for chatbot '{chatbot_id}': "
                f"Retrieved {len(results)} documents from {index.ntotal} total vectors (k={k})"
            )
            
            if results:
                logger.debug(
                    f"Distance statistics - Min: {min(r['score'] for r in results):.3f}, "
                    f"Max: {max(r['score'] for r in results):.3f}, "
                    f"Avg: {sum(r['score'] for r in results) / len(results):.3f}"
                )
            
            return results
            
        except FileNotFoundError:
            raise
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to perform similarity search for chatbot '{chatbot_id}': {str(e)}")
            raise Exception(f"Similarity search failed: {str(e)}")
    
    def delete_store(self, chatbot_id: str) -> None:
        """
        Remove a chatbot's vector store completely.
        
        Args:
            chatbot_id: Unique identifier for the chatbot
            
        Raises:
            FileNotFoundError: If vector store doesn't exist
            Exception: If deletion fails
        """
        store_path = self._get_store_path(chatbot_id)
        
        if not os.path.exists(store_path):
            raise FileNotFoundError(f"Vector store for chatbot '{chatbot_id}' not found")
        
        try:
            shutil.rmtree(store_path)
            logger.info(f"Deleted vector store for chatbot '{chatbot_id}'")
            
        except Exception as e:
            logger.error(f"Failed to delete vector store for chatbot '{chatbot_id}': {str(e)}")
            raise Exception(f"Vector store deletion failed: {str(e)}")
