import os
import sys
import logging
import sqlite3
import json
from datetime import datetime
import hashlib

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MemoryAgent:
    def __init__(self, db_dir="backend/memory_db"):
        self.db_dir = os.path.join(os.getcwd(), db_dir)
        os.makedirs(self.db_dir, exist_ok=True)
        
        self.sqlite_path = os.path.join(self.db_dir, "simple_memory.db")
        self.chroma_path = os.path.join(self.db_dir, "chroma_db")
        
        # Lazy loaded components
        self._chroma_client = None
        self._chroma_collection = None
        
        # Initialize SQLite immediately (it's fast)
        self._init_sqlite()

    def _init_sqlite(self):
        try:
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            # Conversation History
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp REAL NOT NULL
                )
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"SQLite Init Failed: {e}")

    def _get_chroma(self):
        """Lazy load ChromaDB"""
        if self._chroma_collection:
            return self._chroma_collection
            
        try:
            logger.info("Lazy loading ChromaDB...")
            import chromadb
            self._chroma_client = chromadb.PersistentClient(path=self.chroma_path)
            self._chroma_collection = self._chroma_client.get_or_create_collection(name="sage_memory")
            logger.info("ChromaDB loaded successfully.")
            return self._chroma_collection
        except Exception as e:
            logger.error(f"ChromaDB Load Failed: {e}")
            return None

    def _get_embedding(self, text):
        """Get embedding from Ollama (Lazy import)"""
        try:
            from backend.ollama_direct import get_ollama_embedding
            return get_ollama_embedding(text)
        except Exception as e:
            logger.error(f"Embedding Failed: {e}")
            return None

    def save_conversation(self, role, content):
        """Save chat log to SQLite (Fast & Robust)"""
        try:
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO conversations (role, content, timestamp) VALUES (?, ?, ?)",
                (role, content, datetime.now().timestamp())
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Save Conversation Failed: {e}")
            return False

    def get_recent_conversation(self, limit=10):
        """Get recent chat logs"""
        try:
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT role, content FROM conversations ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            conn.close()
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]
        except Exception as e:
            logger.error(f"Get Conversation Failed: {e}")
            return []

    def remember(self, text, metadata=None):
        """Save to Vector DB (Long-term Memory)"""
        collection = self._get_chroma()
        if not collection:
            return {"status": "error", "message": "Vector DB unavailable"}

        try:
            embedding = self._get_embedding(text)
            if not embedding:
                return {"status": "error", "message": "Embedding generation failed"}

            doc_id = hashlib.sha256(text.encode()).hexdigest()
            meta = metadata or {}
            meta['timestamp'] = datetime.now().isoformat()

            collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[meta]
            )
            return {"status": "success", "id": doc_id}
        except Exception as e:
            logger.error(f"Remember Failed: {e}")
            return {"status": "error", "message": str(e)}

    def recall(self, query, n_results=3):
        """Search Vector DB"""
        collection = self._get_chroma()
        if not collection:
            return []

        try:
            embedding = self._get_embedding(query)
            if not embedding:
                return []

            results = collection.query(
                query_embeddings=[embedding],
                n_results=n_results
            )
            
            # Format results
            documents = results['documents'][0]
            metadatas = results['metadatas'][0]
            
            return [{"content": doc, "metadata": meta} for doc, meta in zip(documents, metadatas)]
        except Exception as e:
            logger.error(f"Recall Failed: {e}")
            return []

if __name__ == "__main__":
    # Self-test
    print("🧠 Starting MemoryAgent Self-Test...")
    agent = MemoryAgent()
    
    # 1. SQLite Test
    print("📝 Testing SQLite...")
    agent.save_conversation("user", "Hello Sage")
    agent.save_conversation("assistant", "Hello User")
    history = agent.get_recent_conversation()
    print(f"  History: {history}")
    
    # 2. Vector DB Test
    print("📚 Testing Vector DB (This might take a moment to load Chroma)...")
    res = agent.remember("Sage is a modular AI agent built with Python.")
    print(f"  Remember Result: {res}")
    
    print("🔍 Testing Recall...")
    recall = agent.recall("What is Sage?")
    print(f"  Recall Result: {recall}")
