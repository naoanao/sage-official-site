from .neuromorphic_brain import NeuromorphicBrain

class SageBrain:
    """
    Wrapper for NeuromorphicBrain.
    Provides compatibility layer for Orchestrator.
    """
    def __init__(self):
        self.neuromorphic_brain = NeuromorphicBrain()
    
    def query(self, query: str):
        """Orchestrator calls this via consultbrain tool"""
        result = self.neuromorphic_brain.process_query(query)
        if result.get("response"):
            return result["response"]
        return "I don't have information about that yet."
    
    def provide_feedback(self, query: str, correct_response: str, was_helpful: bool):
        """API calls this for learning"""
        return self.neuromorphic_brain.provide_feedback(query, correct_response, was_helpful)
    
    def infer(self, query: str = None, user_query: str = None, **kwargs):
        """Alternative interface for direct brain queries"""
        actual_query = query or user_query or ""
        return self.neuromorphic_brain.process_query(actual_query)
