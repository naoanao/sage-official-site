"""
Word2Vec Embeddings Module for Neuromorphic Brain (Phase 1.3)

Provides semantic understanding through word embeddings.
"""

import logging
import numpy as np
from typing import List, Optional
try:
    from gensim.models import Word2Vec
    GENSIM_AVAILABLE = True
except Exception:
    GENSIM_AVAILABLE = False
    Word2Vec = None  # Mock or handle gracefully

logger = logging.getLogger(__name__)

class Word2VecEmbeddings:
    """
    Word2Vec embeddings for semantic pattern matching
    
    Features:
    - Train on custom sentences
    - Get word embeddings
    - Get sentence embeddings (average of words)
    - Safe handling of unknown words
    """
    
    def __init__(self, vector_size: int = 50, window: int = 5, min_count: int = 1):
        """
        Initialize Word2Vec model
        
        Args:
            vector_size: Dimension of word vectors
            window: Context window size
            min_count: Minimum word frequency to include
        """
        self.vector_size = vector_size
        self.window = window
        self.min_count = min_count
        self.model: Optional[Word2Vec] = None
        self.is_trained = False
        
        logger.info(f"📝 Word2Vec initialized (dim={vector_size}, window={window})")
    
    def train(self, sentences: List[List[str]]):
        """
        Train Word2Vec model on sentences
        """
        if not sentences:
            logger.warning("No sentences provided for training")
            return
            
        if not GENSIM_AVAILABLE:
            logger.warning("Gensim not installed. Word2Vec training skipped.")
            return
        
        try:
            self.model = Word2Vec(
                sentences=sentences,
                vector_size=self.vector_size,
                window=self.window,
                min_count=self.min_count,
                workers=4,
                epochs=10
            )
            self.is_trained = True
            logger.info(f"✅ Word2Vec trained on {len(sentences)} sentences")
        except Exception as e:
            logger.error(f"Failed to train Word2Vec: {e}")
            raise
    
    def get_embedding(self, word: str) -> np.ndarray:
        """
        Get embedding vector for a single word
        """
        if not GENSIM_AVAILABLE:
            return np.zeros(self.vector_size)
            
        if not self.is_trained or self.model is None:
            logger.warning("Word2Vec model not trained yet")
            return np.zeros(self.vector_size)
        
        word = word.lower()  # Normalize
        
        try:
            return self.model.wv[word]
        except KeyError:
            # Unknown word - return zero vector
            return np.zeros(self.vector_size)
    
    def get_sentence_embedding(self, sentence: str) -> np.ndarray:
        """
        Get embedding vector for a sentence (average of word vectors)
        """
        words = sentence.lower().split()
        
        if not words:
            return np.zeros(self.vector_size)
        
        # Get embeddings for all words
        embeddings = [self.get_embedding(word) for word in words]
        
        # Filter out zero vectors (unknown words)
        non_zero = [emb for emb in embeddings if not np.allclose(emb, 0)]
        
        if not non_zero:
            return np.zeros(self.vector_size)
        
        # Average of all word vectors
        return np.mean(non_zero, axis=0)
    
    def get_similarity(self, word1: str, word2: str) -> float:
        """
        Get cosine similarity between two words
        """
        emb1 = self.get_embedding(word1)
        emb2 = self.get_embedding(word2)
        
        # If either is zero vector, return 0 similarity
        if np.allclose(emb1, 0) or np.allclose(emb2, 0):
            return 0.0
        
        # Cosine similarity
        dot_product = np.dot(emb1, emb2)
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
    
    def get_stats(self) -> dict:
        """Get statistics about the Word2Vec model"""
        if not self.is_trained or self.model is None:
            return {
                'trained': False,
                'vocabulary_size': 0,
                'vector_size': self.vector_size
            }
        
        return {
            'trained': True,
            'vocabulary_size': len(self.model.wv),
            'vector_size': self.vector_size,
            'window': self.window
        }
