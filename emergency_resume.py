import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SageBrake")

STOP_FILE = "SAGE_STOP"

def emergency_resume():
    if os.path.exists(STOP_FILE):
        os.remove(STOP_FILE)
        logger.info(f"✅ Emergency Stop Cleared. Removed {STOP_FILE}")
        logger.info("AI operations can now resume.")
    else:
        logger.info("No stop signal found. System is already clear.")

if __name__ == "__main__":
    emergency_resume()
