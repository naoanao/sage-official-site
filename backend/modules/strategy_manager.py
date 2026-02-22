import json
import os
import logging
from pathlib import Path

logger = logging.getLogger("StrategyManager")
STRATEGY_FILE = Path(__file__).parent.parent / "config" / "business_strategy.json"

class StrategyManager:
    """
    Manages the strategic goals and user intent for the Sage system.
    This allows the AI to align its autonomous actions with user-defined outcomes.
    """
    @staticmethod
    def get_strategy():
        if not STRATEGY_FILE.exists():
            # Initial default strategy (The "Wise Person" Vision)
            return {
                "mission": "Prove the value of Sage 3.0 and Architect an Autonomous Paradise.",
                "target_product": "Sage 3.0 Architect Edition",
                "target_url": "https://naofumi3.gumroad.com/l/apvbzh?wanted=true",
                "core_directive": "Resonance Mastery",
                "focus_tags": ["self_hosted_tech", "metrics_driven", "autonomous_wealth"]
            }
        
        try:
            with open(STRATEGY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read strategy file: {e}")
            return {}

    @staticmethod
    def save_strategy(strategy_data: dict):
        try:
            STRATEGY_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(STRATEGY_FILE, 'w', encoding='utf-8') as f:
                json.dump(strategy_data, f, indent=4, ensure_ascii=False)
            logger.info("🎯 Business strategy updated successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to save strategy: {e}")
            return False

if __name__ == "__main__":
    sm = StrategyManager()
    print(sm.get_strategy())
