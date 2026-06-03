import os
import sys
import logging
import json
import threading
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.modules.langgraph_orchestrator import LangGraphOrchestrator
from backend.modules.sage_memory import SageMemory
from backend.modules.sica_loop import SICALoop
from backend.modules.soul_loader import load_soul
from backend.modules.gatekeeper import gatekeeper

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SageMasterAgent:
    """
    The 'Wise Person' (Sage) Master Controller v4.0 — SOUL.md対応版
    - Manages the Lifecycle of the Agent.
    - Holds the 'Self' (Memory, Personality & SOUL).
    - Delegates execution to LangGraphOrchestrator.
    - Oversees Self-Improvement (SICA).
    - Enforces ethical boundaries via Gatekeeper + SOUL.md.
    """
    def __init__(self):
        logger.info("🧠 Initializing Sage Master Agent v4.0...")

        # 0. Load SOUL.md (Identity & Ethics Foundation)
        self.soul = load_soul()
        logger.info(f"✨ Soul loaded: {self.soul}")

        # 1. Initialize Memory (The Brain)
        self.memory = SageMemory()

        # 2. Initialize Execution Engine (The Hands)
        self.orchestrator = LangGraphOrchestrator()

        # 3. Initialize Self-Improvement (The Soul)
        self.sica = SICALoop(self.memory)

        # 4. Load Personality/Config (identity.jsonとSOUL.mdをマージ)
        self.config = self.memory.get_entity("system", "config") or {}
        self.config.update({
            "agent_name": self.soul.identity.get("name", "Sage"),
            "version": self.soul.identity.get("version", "4.0"),
            "mission": self.soul.mission,
        })

        logger.info(f"✨ Sage Master Agent v4.0 is Awake. Identity: {self.soul.identity.get('name')}")

    def run(self, user_message: str) -> Dict[str, Any]:
        """
        Main Entry Point for Sage v4.0 — SOUL.md準拠
        """
        logger.info(f"👂 Sage hearing: {user_message}")

        # 0. Gatekeeper check (会話実行はTier1)
        if not gatekeeper.verify_action("sns_post", {"type": "chat_response"}):
            return {"final_response": "🛑 Sage is currently paused. Check SAGE_STOP file."}

        # 1. Recall Context (Short & Long Term)
        short_term = self.memory.get_short_term(limit=5)
        long_term = self.memory.search_long_term(user_message)

        logger.info(f"📚 Context Recalled: {len(long_term)} long-term memories.")

        # 2. Save User Input to Short-Term Memory
        self.memory.save_short_term("user", user_message)

        # 3. Delegate to Orchestrator (Execution)
        # SOUL.mdのシステムプロンプトを注入してSageの人格を保持
        context = {
            "short_term_history": short_term,
            "long_term_knowledge": long_term,
            "config": self.config,
            "soul_system_prompt": self.soul.get_system_prompt(),  # 🆕 SOUL注入
            "agent_identity": self.soul.identity,  # 🆕 アイデンティティ
        }
        response = self.orchestrator.run(user_message, context=context)
        
        # 4. Process Result
        final_output = response.get("final_response", "I'm thinking...")

        # 4.5. SOUL.mdコンテンツ安全チェック
        is_safe, reason = self.soul.check_content_safety(final_output)
        if not is_safe:
            logger.warning(f"⚠️ SOUL safety check failed: {reason}. Sanitizing output.")
            final_output = f"[Content filtered by SOUL policy: {reason}]"
            response["final_response"] = final_output

        # 5. Save Sage Output to Short-Term Memory
        self.memory.save_short_term("sage", final_output)

        # 6. Auto-Reflection (SICA Loop) — バックグラウンドで非同期実行
        if len(user_message) > 20:
            try:
                logger.info("🔄 Triggering SICA Analysis in background...")
                thread = threading.Thread(target=self.sica.run_analysis, daemon=True)
                thread.start()
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
