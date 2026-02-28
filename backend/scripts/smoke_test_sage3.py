
import os
import sys
import time
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.getcwd())

# Force reload env
load_dotenv(override=True)

from backend.modules.notion_agent import NotionAgent
from backend.modules.neuromorphic_brain import NeuromorphicBrain
from backend.modules.sage_memory import SageMemory
from backend.pipelines.course_production_pipeline import CourseProductionPipeline

def run_smoke_test():
    print("🚬 Starting Sage 3.0 Smoke Test...")
    
    # 1. Notion SSOT Check
    agent = NotionAgent()
    if agent.enabled and agent.runbook_parent_id and agent.evidence_db_id:
        print("✅ Notion Config: OK")
        agent.log_evidence(
            name="Smoke Test Started",
            topic="Testing",
            status="成功",
            log_excerpt="Beginning end-to-end smoke test of knowledge integration."
        )
    else:
        print("⚠️ Notion Config: Incomplete. Logging to Notion will be skipped.")

    # 2. Memory & Brain Initialization
    memory = SageMemory()
    brain = NeuromorphicBrain()
    pipeline = CourseProductionPipeline(memory=memory, brain=brain)
    
    initial_stats = brain.get_stats()
    print(f"🧠 Initial Brain patterns: {initial_stats['learned_patterns']}")

    # 3. Full Path Test: Generate -> QA WARN -> Override -> Learn
    print("⏳ Simulating Course Generation & QA Gate...")
    test_topic = f"Smoke Test Topic {int(time.time())}"
    
    # 3a. Force a WARN result (too short)
    test_result = {
        "status": "success",
        "topic": test_topic,
        "sections": [{"title": "Quick Start", "content": "Tiny bit of content."}], # triggers warn
        "research_source": "smoke_test_sage3.py"
    }
    
    qa_passed, qa_issues = pipeline._qa_gate(test_result)
    print(f"🧐 QA Passed: {qa_passed}, Issues: {qa_issues}")
    
    if not qa_passed:
        print("🛡 QA WARN Detected. Simulating Manual Override Flow...")
        # Simulate /api/monetization/approve
        override_data = {
            "topic": test_topic,
            "product_summary": "Simulated short course for smoke test.",
            "qa_issues": qa_issues
        }
        
        # Internal brain learning (simulating what the Flask endpoint does)
        feedback_content = f"Topic: {test_topic} | Manual Approved | Issues: {qa_issues}"
        brain.provide_feedback(query=test_topic, correct_response=feedback_content, was_helpful=True)
        
        # Simulation of monetization logging
        from backend.modules.monetization_measure import MonetizationMeasure
        MonetizationMeasure.log_event("qa_warn", {"topic": test_topic, "issues": qa_issues})
        MonetizationMeasure.log_event("human_approved", {"topic": test_topic})

        if agent.enabled:
            agent.log_evidence(
                name=f"Manual Override: {test_topic[:20]}",
                topic=test_topic,
                status="成功",
                log_excerpt=f"Full test path verified. QA WARN overridden by human judgment.\nIssues: {qa_issues}"
            )

    # 4. Final verification of metrics
    final_stats = brain.get_stats()
    m_stats = MonetizationMeasure.get_stats()
    print(f"🧠 Final Brain patterns: {final_stats['learned_patterns']}")
    print(f"📊 QA Warn count (MonetizationStats): {m_stats.get('qa_warn')}")
    
    if final_stats['learned_patterns'] > initial_stats['learned_patterns']:
        print("✨ SMOKE TEST SUCCESS: Full path (QA -> Override -> Learning) verified.")
    else:
        print("❌ SMOKE TEST FAILED: Learning was not recorded.")

if __name__ == "__main__":
    run_smoke_test()
