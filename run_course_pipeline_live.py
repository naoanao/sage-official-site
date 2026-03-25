import sys
import os
import logging
from unittest.mock import MagicMock

# Ensure backend folder is in path
sys.path.append(os.path.abspath("."))

from backend.pipelines.course_production_pipeline import CourseProductionPipeline
from backend.modules.langgraph_orchestrator_v2 import LangGraphOrchestrator

logging.basicConfig(level=logging.INFO)

def run_real_pipeline():
    print("\n--- 🚀 Running Real Course Production Pipeline for 'AI Influencer 2026' ---")
    
    # 1. Initialize Orchestrator (to get real LLM and ImageAgent)
    orch = LangGraphOrchestrator()
    
    # 2. Initialize Pipeline
    pipeline = CourseProductionPipeline(
        ollama_client=orch.llm,
        image_agent=orch.image_agent,
        obsidian=orch.memory_agent,
        brain=orch.neuromorphic_brain
    )
    
    # 3. RUN
    topic = "AI Influencer Monetization Strategy 2026"
    result = pipeline.generate_course(topic=topic, num_sections=5)
    
    print(f"\n--- Result received: {result} ---")
    
    if result and result.get("status") == "success":
        print(f"\n✅ SUCCESS! Course generated and saved to: {result.get('obsidian_note')}")
        print(f"Sales Page Preview (first 200 chars):\n{result.get('sales_page', '')[:200]}...")
        
        # Save sales page to a separate file for Gumroad ready-to-use
        with open("gumroad_sales_page.md", "w", encoding="utf-8") as f:
            f.write(result['sales_page'])
        print(f"✅ Gumroad Sales Page saved to: gumroad_sales_page.md")
    else:
        print(f"\n❌ FAILED: {result.get('message')}")

if __name__ == "__main__":
    run_real_pipeline()
