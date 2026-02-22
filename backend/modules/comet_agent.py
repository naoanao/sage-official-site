import os
import sys
import logging
import functools

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CometAgent:
    """
    Comet ML (Opik) Agent for LLM Tracing and Analytics.
    """
    def __init__(self, project_name="Sage 2.0"):
        self.enabled = False
        self.opik = None
        
        try:
            import opik
            from opik import Opik
            
            # Check for API Key (Optional if local, but good practice)
            # os.environ["OPIK_API_KEY"] = "..." 
            
            self.opik = Opik(project_name=project_name)
            self.enabled = True
            logger.info(f"Comet ML (Opik) initialized for project: {project_name}")
        except ImportError:
            logger.warning("Opik library not found. Tracing disabled.")
        except Exception as e:
            logger.error(f"Failed to initialize Opik: {e}")

    def log_trace(self, name, input_data, output_data, metadata=None):
        """
        Log a simple trace (Input -> Output).
        """
        if not self.enabled:
            return

        try:
            # Opik's API might vary, assuming standard trace logging
            # If explicit trace object is needed, we'd create it.
            # For now, using a simplified approach or just logging via the decorator pattern is preferred,
            # but here is a manual log attempt.
            
            # Note: Opik is often used via decorators. 
            # This manual method is a placeholder for explicit logging if needed.
            pass 
        except Exception as e:
            logger.error(f"Failed to log trace: {e}")

    def trace(self, func):
        """
        Decorator to trace a function execution.
        """
        if not self.enabled:
            return func

        import opik
        
        @opik.track
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper

if __name__ == "__main__":
    print("☄️ Starting CometAgent Self-Test...")
    agent = CometAgent(project_name="Sage_Test")
    
    if agent.enabled:
        print("✅ Opik is enabled.")
        
        @agent.trace
        def test_function(x, y):
            print(f"  Executing test_function({x}, {y})")
            return x + y
            
        print("  Calling traced function...")
        res = test_function(5, 10)
        print(f"  Result: {res}")
        print("✅ Trace logged (check Opik dashboard).")
    else:
        print("⚠️ Opik is disabled.")
