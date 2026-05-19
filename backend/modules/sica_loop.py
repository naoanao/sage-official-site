import os
import sys
import logging
import json
from datetime import datetime

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

    Situation-Insight-Countermeasure-Action cycle:
    1. Analyzes execution history (Memory) → Situation
    2. Reads own source code → Insight
    3. Proposes improvements → Countermeasure
    4. Saves proposal for owner review → (Future: auto-apply if tests pass)

    LLM Backend: Groq (llama-3.3-70b-versatile)
    Switched from Gemini 2026-05-19 due to quota exhaustion.
    """

    def __init__(self, memory_system):
        self.memory = memory_system
        self.proposals_path = os.path.join(os.getcwd(), "backend", "memory_db", "sica_proposals.json")

        # Initialize Groq client
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            logger.warning("SICA: GROQ_API_KEY not found. Self-improvement disabled.")
            self.client = None
            return

        try:
            from groq import Groq
            self.client = Groq(api_key=self.groq_api_key)
            logger.info("SICA: Groq client initialized (llama-3.3-70b-versatile).")
        except ImportError:
            logger.error("SICA: groq package not installed. Run: pip install groq")
            self.client = None
        except Exception as e:
            logger.error(f"SICA: Failed to initialize Groq client: {e}")
            self.client = None

    def run_analysis(self):
        """
        Main SICA Cycle: Analyze logs + source → generate improvement proposal.
        """
        if not self.client:
            logger.warning("SICA: No LLM client available. Skipping analysis.")
            return None

        logger.info("🔄 SICA Loop: Starting Self-Analysis (Groq)...")

        # 1. Situation: Gather recent execution logs
        recent_logs = []
        try:
            recent_logs = self.memory.get_short_term(limit=20)
        except Exception as e:
            logger.warning(f"SICA: Could not fetch memory logs: {e}")

        # 2. Insight: Read source code of the core agent
        source_code = self._read_source_code("backend/modules/sage_master_agent.py")
        if not source_code:
            logger.error("SICA: Could not read source code. Aborting.")
            return None

        # Load identity for context
        identity_context = ""
        try:
            identity_path = os.path.join(os.getcwd(), "backend", "config", "identity.json")
            with open(identity_path, "r", encoding="utf-8") as f:
                identity = json.load(f)
            identity_context = f"Sage is: {identity.get('sage_core_concept', '')}"
        except Exception:
            pass

        # 3. Countermeasure: Ask Groq for one improvement
        prompt = f"""あなたはSageの「自己改善コーディングエージェント (SICA)」モジュールです。
SagはNaoさんの自律AI分身です。{identity_context}

現在の「Agent Controller」のコードと直近の実行ログを分析し、改善点を1つ見つけるのがあなたの仕事です。

--- RECENT LOGS（直近のログ）---
{json.dumps(recent_logs[:10], indent=2, ensure_ascii=False)}

--- SOURCE CODE（sage_master_agent.py 抜粋）---
{source_code[:3000]}

--- INSTRUCTION（指示）---
コードの改善点または最適化案を「1つだけ」特定してください。
具体的で実装可能な提案を優先してください。例：
- エラーハンドリングの追加（特定の例外が未処理の箇所）
- Gemini→Groq移行でまだ残っている箇所
- ログにあるエラーパターンへの対処
- パフォーマンスボトルネックの解消

出力は以下のJSON形式のみ（日本語で記述）:
{{
    "title": "改善案の短いタイトル（30字以内）",
    "priority": "high|medium|low",
    "reasoning": "なぜこの改善が必要なのかの理由（具体的に）",
    "proposed_code_change": "変更内容の説明またはコードの差分（具体的なコードがあればコードで）",
    "estimated_impact": "この改善で何がどう変わるか"
}}"""

        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=800,
            )
            raw = response.choices[0].message.content or ""
            content = raw.replace("```json", "").replace("```", "").strip()

            # Extract JSON even if surrounded by text
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                content = content[start:end]

            proposal = json.loads(content)
            self._save_proposal(proposal)
            logger.info(f"✅ SICA: Proposal generated — [{proposal.get('priority','?').upper()}] {proposal['title']}")
            return proposal

        except json.JSONDecodeError as e:
            logger.error(f"SICA: JSON parse failed: {e}. Raw: {raw[:200]}")
            return None
        except Exception as e:
            logger.error(f"SICA Analysis Failed: {e}")
            return None

    def _read_source_code(self, relative_path: str) -> str | None:
        try:
            path = os.path.join(os.getcwd(), relative_path)
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"SICA: Failed to read {relative_path}: {e}")
            return None

    def _save_proposal(self, proposal: dict):
        proposal["timestamp"] = datetime.now().isoformat()
        proposal["llm"] = "groq/llama-3.3-70b-versatile"

        os.makedirs(os.path.dirname(self.proposals_path), exist_ok=True)

        existing = []
        if os.path.exists(self.proposals_path):
            try:
                with open(self.proposals_path, 'r', encoding='utf-8') as f:
                    existing = json.load(f)
            except Exception:
                existing = []

        existing.append(proposal)

        # Keep only last 50 proposals to avoid unbounded growth
        existing = existing[-50:]

        with open(self.proposals_path, 'w', encoding='utf-8') as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)

    def get_recent_proposals(self, limit: int = 5) -> list:
        """Return the most recent SICA proposals for review."""
        if not os.path.exists(self.proposals_path):
            return []
        try:
            with open(self.proposals_path, 'r', encoding='utf-8') as f:
                proposals = json.load(f)
            return proposals[-limit:]
        except Exception:
            return []


if __name__ == "__main__":
    # Test Run
    from backend.modules.sage_memory import SageMemory
    mem = SageMemory()
    sica = SICALoop(mem)
    result = sica.run_analysis()
    if result:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("SICA: No proposal generated.")
