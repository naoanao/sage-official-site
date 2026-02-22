import time
import hashlib
import json
import os
import logging
from typing import Dict, List, Any
from pathlib import Path

# Initialize logger for this module
logger = logging.getLogger(__name__)

class NeuromorphicBrain:
    """
    Sage Brain v2.0 (Vector-Associative Memory)
    Replaces v1.0 (Spiking Neural Network) to solve the "non-learning" loop.
    This version uses deterministic hashing for instant recall.
    """
    def __init__(self):
        self.brain_version = "2.0.1"
        self.input_dim = 1000
        # 短期記憶: JSON永続化された高速キャッシュ
        self.short_term_memory: Dict[str, str] = {}
        
        # 永続化パス設定
        self.memory_path = os.getenv(
            "BRAIN_SHORT_TERM_PATH",
            str(Path(__file__).resolve().parents[1] / "logs" / "brain_short_term.json")
        )

        # 統計情報
        self.threshold = 0.15  # ⚡ 感度向上 (0.5 -> 0.15)
        self.stats = {
            "total_queries": 0,
            "brain_hits": 0,
            "learned_patterns": 0,
            "status": "Active (Persistent Learning)"
        }
        self.learning_enabled = True
        self.learning_stats = {"updates": 0}
        
        # 起動時にメモリをロード
        self._load_memory()

    def _load_memory(self):
        """JSONから記憶をロード"""
        try:
            if os.path.exists(self.memory_path):
                with open(self.memory_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    self.short_term_memory.update({str(k): str(v) for k, v in data.items()})
                    self.stats["learned_patterns"] = len(self.short_term_memory)
                    
                    # [INFO] CRITICAL DEBUG LOGGING
                    logger.info(f"[INIT] Brain Loaded: {len(self.short_term_memory)} patterns")
                    logger.info(f"[INIT] Memory dict ID: {id(self.short_term_memory)}")
                    logger.info(f"[INIT] Sample keys (first 3): {list(self.short_term_memory.keys())[:3]}")
                    try:
                        print(f"[BRAIN] Brain Loaded: {len(self.short_term_memory)} patterns from {self.memory_path}")
                    except: pass
            else:
                logger.warning(f"[WARN] No memory file found at: {self.memory_path}")
        except Exception as e:
            logger.error(f"[ERROR] Brain Load Error: {e}")
            logger.exception("Full traceback:")
            print(f"[ERROR] Brain Load Error: {e}")

    def _save_memory(self):
        """記憶をJSONにAtomic Save"""
        try:
            os.makedirs(os.path.dirname(self.memory_path), exist_ok=True)
            tmp = self.memory_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.short_term_memory, f, ensure_ascii=False, indent=2)
            os.replace(tmp, self.memory_path)
        except Exception as e:
            print(f"[WARN] Brain Save Error: {e}")

    def _hash_query(self, query: str) -> str:
        """クエリを安定したキーに変換"""
        return hashlib.md5(query.strip().lower().encode()).hexdigest()

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        脳内検索: 0.01秒以下で記憶をスキャン
        """
        start_time = time.time()
        self.stats["total_queries"] += 1
        query_key = self._hash_query(query)
        
        # 🔥 CRITICAL DEBUG LOGGING
        logger.info(f"🔍 [BRAIN] Query: '{query[:50]}...'")
        logger.info(f"🔍 [BRAIN] Hash: {query_key}")
        logger.info(f"🔍 [BRAIN] Memory size: {len(self.short_term_memory)} patterns")
        logger.info(f"🔍 [BRAIN] Memory dict ID: {id(self.short_term_memory)}")
        logger.info(f"🔍 [BRAIN] Hash in memory: {query_key in self.short_term_memory}")
        
        # DEBUG LOGGING
        try:
            with open("brain_debug.log", "a", encoding="utf-8") as f:
                f.write(f"QUERY: '{query}' | HASH: {query_key}\\n")
        except: pass
        
        # 1. 記憶にあるか確認 (Fast Path)
        if query_key in self.short_term_memory:
            response = self.short_term_memory[query_key]
            self.stats["brain_hits"] += 1
            
            logger.info(f"✅ [BRAIN] FOUND! Response: '{response[:50] if len(response) > 50 else response}'")
            
            return {
                "source": "neuromorphic_brain",
                "response": response,
                "confidence": 0.98,  # 記憶にあるので確信度MAX
                "processing_time": time.time() - start_time,
                "note": "Recalled from memory"
            }

        # 2. 未知のクエリ (Pass to LLM)
        logger.warning(f"❌ [BRAIN] NOT FOUND in {len(self.short_term_memory)} patterns")
        logger.warning(f"❌ [BRAIN] Sample keys: {list(self.short_term_memory.keys())[:5]}")
        return {
            "source": "neuromorphic_brain",
            "response": None,
            "confidence": 0.15,  # 低信頼度 -> LLMへフォールバック
            "processing_time": time.time() - start_time
        }

    def provide_feedback(self, query: str, correct_response: str, was_helpful: bool):
        """
        【重要】学習機能
        ユーザーが良い回答と認めた場合、即座に脳に焼き付ける
        """
        if was_helpful and correct_response:
            query_key = self._hash_query(query)
            
            # 既に記憶にあるかチェック
            if query_key not in self.short_term_memory:
                self.short_term_memory[query_key] = correct_response
                self.stats["learned_patterns"] += 1
                self.learning_stats["updates"] = self.stats["learned_patterns"]
                self._save_memory()  # 即時永続化
                print(f"[BRAIN] Brain Learned: '{query[:20]}...' (Total Memories: {self.stats['learned_patterns']})")
                return True
            
        return False

    def get_status(self) -> Dict[str, Any]:
        return self.stats

    def get_stats(self) -> Dict[str, Any]:
        """Alias for get_status to maintain backward compatibility"""
        return self.stats

    def infer(self, query: str = None, user_query: str = None, **kwargs) -> Dict[str, Any]:
        """Alias for process_query to match LangGraph Orchestrator call"""
        actual_query = query or user_query or kwargs.get('text') or ""
        return self.process_query(actual_query)

