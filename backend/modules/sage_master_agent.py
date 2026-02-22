import os
import sys
import logging
import json
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.modules.langgraph_orchestrator import LangGraphOrchestrator
from backend.modules.sage_memory import SageMemory
from backend.modules.sica_loop import SICALoop

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SageMasterAgent:
    """
    The 'Wise Person' (Sage) Master Controller.
    - Manages the Lifecycle of the Agent.
    - Holds the 'Self' (Memory & Personality).
    - Delegates execution to LangGraphOrchestrator.
    - Oversees Self-Improvement (SICA).
    """
    def __init__(self):
        logger.info("🧠 Initializing Sage Master Agent...")
        
        # 1. Initialize Memory (The Brain)
        self.memory = SageMemory()
        
        # 2. Initialize Execution Engine (The Hands)
        self.orchestrator = LangGraphOrchestrator()
        
        # 3. Initialize Self-Improvement (The Soul)
        self.sica = SICALoop(self.memory)
        
        # 4. Load Personality/Config
        self.config = self.memory.get_entity("system", "config") or {}
        logger.info("✨ Sage Master Agent is Awake.")

    def run(self, user_message: str) -> Dict[str, Any]:
        """
        Main Entry Point for Sage.
        """
        logger.info(f"👂 Sage hearing: {user_message}")
        
        # 1. Recall Context (Short & Long Term)
        short_term = self.memory.get_short_term(limit=5)
        long_term = self.memory.search_long_term(user_message)
        
        logger.info(f"📚 Context Recalled: {len(long_term)} long-term memories.")
        
        # 2. Save User Input to Short-Term Memory
        self.memory.save_short_term("user", user_message)
        
        # 3. Delegate to Orchestrator (Execution)
        response = self.orchestrator.run(user_message)
        
        # 4. Process Result
        final_output = response.get("final_response", "I'm thinking...")
        
        # 5. Save Sage Output to Short-Term Memory
        self.memory.save_short_term("sage", final_output)
        
        # 6. Auto-Reflection (SICA Loop)
        # Run asynchronously or periodically in real production.
        # For now, we run it lightly if the message implies a complex task.
        if len(user_message) > 20: 
            try:
                logger.info("🔄 Triggering SICA Analysis...")
                self.sica.run_analysis()
            except Exception as e:
                logger.warning(f"SICA Trigger Failed: {e}")
        
        return response

    def inject_knowledge(self, text: str):
        """
        Directly seed knowledge into the brain (Memory Injection).
        """
        return self.memory.save_long_term(text, metadata={"source": "injection"})

if __name__ == "__main__":
    print("🧙 Sage Master Agent Test")
    sage = SageMasterAgent()
    res = sage.run("Hello, who are you?")
    print("Response:", res)
