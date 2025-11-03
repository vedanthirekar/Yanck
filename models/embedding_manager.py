"""
Embedding Manager for generating document embeddings using Sentence Transformers.
"""

import logging
from typing import List, Union
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

logger = logging.getLogger(__name__)


class EmbeddingManager:
    """
    Manages the local Sentence Transformer model for generating embeddings.
    
    This class handles loading the embedding model and provides methods to
    encode text into vector embeddings for RAG operations.
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the EmbeddingManager with a Sentence Transformer model.
        
        Args:
            model_name: Name of the Sentence Transformer model to load.
                       Default is "all-MiniLM-L6-v2" (384 dimensions, fast, good quality)
        
        Raises:
            ImportError: If sentence-transformers package is not installed
            Exception: If model loading fails
        """
        self.model_name = model_name
        self.model = None
        self._dimension = None
        
        try:
            self.model = self._load_model()
            logger.info(f"Successfully loaded embedding model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load embedding model '{model_name}': {str(e)}")
            raise
    
    def _load_model(self) -> SentenceTransformer:
        """
        Load the Sentence Transformer model.
        
        Returns:
            Loaded SentenceTransformer model instance
            
        Raises:
            ImportError: If sentence-transformers is not installed
            Exception: If model loading fails
        """
        if SentenceTransformer is None:
            raise ImportError(
                "sentence-transformers package is not installed. "
                "Install it with: pip install sentence-transformers"
            )
        
        try:
            model = SentenceTransformer(self.model_name)
            return model
        except Exception as e:
            raise Exception(f"Failed to load model '{self.model_name}': {str(e)}")
    
    def encode(self, texts: Union[str, List[str]]) -> np.ndarray:
        """
        Generate embeddings from text using the loaded model.
        
        Args:
            texts: Single text string or list of text strings to encode
            
        Returns:
            NumPy array of embeddings with shape (n_texts, embedding_dimension)
            
        Raises:
            ValueError: If model is not loaded or texts is empty
            Exception: If encoding fails
        """
        if self.model is None:
            raise ValueError("Model is not loaded. Cannot generate embeddings.")
        
        if not texts:
            raise ValueError("Cannot encode empty text input")
        
        # Convert single string to list for consistent processing
        if isinstance(texts, str):
            texts = [texts]
        
        try:
            embeddings = self.model.encode(
                texts,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            logger.debug(f"Generated embeddings for {len(texts)} text(s)")
            return embeddings
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {str(e)}")
            raise Exception(f"Embedding generation failed: {str(e)}")
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of embeddings produced by the model.
        
        Returns:
            Integer representing the embedding dimension
            
        Raises:
            ValueError: If model is not loaded
        """
        if self.model is None:
            raise ValueError("Model is not loaded. Cannot determine embedding dimension.")
        
        # Cache the dimension after first call
        if self._dimension is None:
            self._dimension = self.model.get_sentence_embedding_dimension()
            logger.debug(f"Embedding dimension: {self._dimension}")
        
        return self._dimension
