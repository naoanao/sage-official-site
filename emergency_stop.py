import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SageBrake")

STOP_FILE = "SAGE_STOP"

def emergency_stop():
    with open(STOP_FILE, "w") as f:
        f.write("STOP")
    logger.critical(f"🛑 Emergency Stop Signal Sent. Created {STOP_FILE}")
    logger.info("AI operations will now be blocked by AutoRegulator.")

if __name__ == "__main__":
    emergency_stop()
