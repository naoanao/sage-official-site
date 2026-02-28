import os
import sys
import pathlib
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add root directory to sys.path
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

try:
    from backend.modules.langgraph_orchestrator import LangGraphOrchestrator
    logger.info("LangGraphOrchestrator imported successfully")
    
    orchestrator = LangGraphOrchestrator()
    logger.info("LangGraphOrchestrator initialized")
    
    if orchestrator.course_pipeline is not None:
        logger.info("✅ CourseProductionPipeline initialized successfully!")
    else:
        logger.error("❌ CourseProductionPipeline is still None")
        
except Exception as e:
    logger.error(f"Failed to test CourseProductionPipeline: {e}", exc_info=True)
