import os
import sys
import logging
import json
from datetime import datetime
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Load env if run standalone
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SICALoop:
    """
    Self-Improving Coding Agent (SICA) Loop.
    1. Analyzes execution history (Memory).
    2. Reads own source code.
    3. Proposes improvements.
    4. (Future) Applies improvements.
    """
    def __init__(self, memory_system):
        self.memory = memory_system
        self.proposals_path = os.path.join(os.getcwd(), "backend", "memory_db", "sica_proposals.json")
        
        # Initialize LLM for Code Analysis
        api_key = os.getenv("GOOGLE_AI_STUDIO_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            logger.warning("SICA: No API Key found. Self-improvement disabled.")
            self.llm = None
            return

        self.llm = ChatGoogleGenerativeAI(
            model="models/gemini-flash-latest", # Stable alias
            google_api_key=api_key,
            temperature=0.2
        )

    def run_analysis(self):
        """
        Main SICA Cycle.
        """
        print("DEBUG: SICA Loop Starting...")
        logger.info("🔄 SICA Loop: Starting Self-Analysis...")
        
        # 1. Gather Context
        recent_logs = self.memory.get_short_term(limit=20)
        print(f"DEBUG: Recent Logs Count: {len(recent_logs)}")
        
        source_code = self._read_source_code("backend/modules/sage_master_agent.py")
        print(f"DEBUG: Source Code Length: {len(source_code) if source_code else 'None'}")
        
        if not source_code:
            logger.error("SICA: Could not read source code.")
            return
            
        # 2. Analyze
        print("DEBUG: invoking LLM...")
        prompt = f"""
        あなたはSageの「自己改善コーディングエージェント (SICA)」モジュールです。
        現在の「Agent Controller」のコードと、直近の実行ログを分析し、改善点を見つけるのがあなたの仕事です。
        
        --- RECENT LOGS (直近のログ) ---
        {json.dumps(recent_logs, indent=2, ensure_ascii=False)}
        
        --- CURRENT SOURCE CODE (sage_master_agent.py) ---
        {source_code}
        
        --- INSTRUCTION (指示) ---
        コードの改善点または最適化案を「1つだけ」特定してください。
        例:
        - エラーハンドリングの追加
        - 遅い関数の最適化
        - ログにあるユーザーの要望に基づく新機能の追加
        
        出力は以下のJSON形式のみ（日本語で記述）:
        {{
            "title": "改善案の短いタイトル",
            "reasoning": "なぜこの改善が必要なのかの理由",
            "proposed_code_change": "変更内容の説明またはコードの差分"
        }}
        """
        
        try:
            response = self.llm.invoke([HumanMessage(content=prompt)])
            print("DEBUG: LLM Response Received.")
            content = response.content.replace("```json", "").replace("```", "").strip()
            print(f"DEBUG: Parsed Content: {content[:100]}...")
            
            proposal = json.loads(content)
            
            # 3. Save Proposal
            print(f"DEBUG: Saving proposal to {self.proposals_path}")
            self._save_proposal(proposal)
            logger.info(f"✅ SICA: Generated Proposal - {proposal['title']}")
            print(f"DEBUG: Proposal Generated: {json.dumps(proposal, indent=2, ensure_ascii=False)}")
            return proposal
            
        except Exception as e:
            logger.error(f"SICA Analysis Failed: {e}")
            print(f"DEBUG: Exception: {e}")
            return None

    def _read_source_code(self, relative_path):
        try:
            path = os.path.join(os.getcwd(), relative_path)
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to read file {relative_path}: {e}")
            return None

    def _save_proposal(self, proposal):
        proposal['timestamp'] = datetime.now().isoformat()
        
        existing = []
        if os.path.exists(self.proposals_path):
            with open(self.proposals_path, 'r') as f:
                try:
                    existing = json.load(f)
                except: pass
        
        existing.append(proposal)
        
        with open(self.proposals_path, 'w') as f:
            json.dump(existing, f, indent=2)

if __name__ == "__main__":
    # Test Run
    from backend.modules.sage_memory import SageMemory
    mem = SageMemory()
    sica = SICALoop(mem)
    sica.run_analysis()
