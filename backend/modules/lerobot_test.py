
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from lerobot.datasets.lerobot_dataset import LeRobotDataset
    logger.info("✅ LeRobot library imported successfully.")
except ImportError as e:
    logger.error(f"❌ Failed to import LeRobot: {e}")
    sys.exit(1)

def test_dataset_access():
    repo_id = "lerobot/aloha_sim_transfer_cube_script"
    logger.info(f"🔄 Attempting to access dataset: {repo_id} (Streaming Mode)")
    
    try:
        # Attempt to load dataset using streaming to avoid massive download
        # Note: 'streaming=True' might not be supported by all ver., checking documentation behavior
        # We will try to load it normally but maybe just meta data if possible.
        # For this test, we accept we might need to download a bit.
        
        # In LeRobot v0.x, we instantiate. 
        dataset = LeRobotDataset(repo_id, root="backend/datasets", episodes=[0])
        
        logger.info(f"✅ Dataset initialized. Stats: {dataset.stats}")
        logger.info(f"📊 Number of episodes: {dataset.num_episodes}")
        
        # Get one frame
        item = dataset[0]
        logger.info(f"✅ Successfully loaded frame 0. Keys: {item.keys()}")
        
        # Check specific action keys
        if "action" in item:
            logger.info(f"🦾 Action Vector Shape: {item['action'].shape}")
            logger.info(f"🦾 Sample Action: {item['action'][:5]}...")
            
    except Exception as e:
        logger.error(f"❌ Failed to load dataset: {e}")

if __name__ == "__main__":
    test_dataset_access()
