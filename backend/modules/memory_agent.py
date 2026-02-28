import os
import sys
import logging
from datetime import datetime

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.modules.sage_memory import SageMemory

logger = logging.getLogger("MemoryAgentCompat")

class MemoryAgent:
    """
    Compatibility Wrapper for SageMemory.
    Provides identical signature to legacy MemoryAgent but uses SageMemory backend.
    Enforces 'Source of Truth' in SageMemory (ChromaDB + SQLite).
    """
    def __init__(self, db_dir=None):
        # db_dir is ignored as SageMemory has its own config (memorydb/)
        self.sage = SageMemory()
        logger.info("🧠 MemoryAgent is now running in Compatibility Mode (Backend: SageMemory)")

    def save_conversation(self, role, content):
        """Maps to SageMemory's short-term interaction tracking"""
        try:
            # SageMemory.save_short_term handles individual message logging
            return self.sage.save_short_term(role=role, content=content, session_id="legacy_compat")
        except Exception as e:
            logger.error(f"Save Conversation Failed (SageMemory): {e}")
            return False

    def get_recent_conversation(self, limit=10):
        """Maps to SageMemory's get_short_term"""
        try:
            # SageMemory.get_short_term ALREADY returns [{"role": "...", "content": "..."}, ...]
            return self.sage.get_short_term(limit=limit, session_id="legacy_compat")
        except Exception as e:
            logger.error(f"Get Conversation Failed (SageMemory): {e}")
            return []

    def remember(self, text, metadata=None):
        """Maps to SageMemory's add_memory (Long-term)"""
        try:
            # SageMemory.add_memory adds to ChromaDB
            self.sage.add_memory(content=text, metadata=metadata)
            return {"status": "success"}
        except Exception as e:
            logger.error(f"Remember Failed (SageMemory): {e}")
            return {"status": "error", "message": str(e)}

    def recall(self, query, n_results=3):
        """Maps to SageMemory's search (Semantic searching)"""
        try:
            results = self.sage.search(query_text=query, limit=n_results)
            
            if not results or 'documents' not in results or not results['documents'][0]:
                return []
            
            docs = results['documents'][0]
            metas = results['metadatas'][0]
            
            return [{"content": d, "metadata": m} for d, m in zip(docs, metas)]
        except Exception as e:
            logger.error(f"Recall Failed (SageMemory): {e}")
            return []

    # Compatibility Aliases for Orchestrator
    def save_long_term(self, content, metadata=None):
        return self.remember(content, metadata)
    
    def update_entity(self, entity_type, entity_name, value):
        # Forward to SageMemory if it implements it, or ignore for now
        if hasattr(self.sage, 'update_entity'):
            return self.sage.update_entity(entity_type, entity_name, value)
        return True

    def save_context(self, title, content):
        return self.remember(content, {"title": title, "type": "context"})

if __name__ == "__main__":
    # Self-test
    print("🧠 Starting MemoryAgent Compatibility Test...")
    agent = MemoryAgent()
    
    # 1. SQLite Test
    print("📝 Testing SQLite proxy...")
    agent.save_conversation("user", "Hello Sage")
    history = agent.get_recent_conversation()
    print(f"  History snippet: {history}")
    
    # 2. Vector DB Test
    print("📚 Testing Vector DB proxy...")
    res = agent.remember("Sage is a unified intelligence system.")
    print(f"  Remember Result: {res}")
    
    print("🔍 Testing Recall proxy...")
    recall = agent.recall("What is Sage?")
    print(f"  Recall Results found: {len(recall)}")
