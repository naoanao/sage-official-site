import sys
import os
import logging
import re
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

# Ensure backend folder is in path
sys.path.append(os.path.abspath("."))

from backend.pipelines.course_production_pipeline import CourseProductionPipeline
from backend.modules.langgraph_orchestrator_v2 import SimpleGeminiSDK
from backend.integrations.gumroad_generator import GumroadPageGenerator
from backend.modules.image_agent import ImageAgent
from langchain_groq import ChatGroq

# Fix for Windows encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

logging.basicConfig(level=logging.INFO)

def run_actual_monetization_experiment():
    print("\n--- STARTING PHASE 1 EXPERIMENT: SAGE SELF-VERIFICATION ---")
    
    # 1. SETUP COMPONENTS (Using Groq for speed and quota reliability)
    llm = ChatGroq(model_name="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"), temperature=0.3)
    image_agent = ImageAgent()
    gumroad_gen = GumroadPageGenerator(ollama_client=llm)
    
    # 2. LOAD GROUND TRUTH
    research_path = Path("obsidian_vault/knowledge/research_2026_ai_influencer_revenue.md")
    research_content = ""
    if research_path.exists():
        with open(research_path, "r", encoding="utf-8") as f:
            research_content = f.read()
        print(f"Loaded Ground Truth: {research_path.name}")
    else:
        research_content = "Target: 2026. Market Size: $27.54 billion (Verified Fortune). 2025: $32.55B."

    # 3. GENERATE PRODUCT CONTENT
    topic = "2026 AI Influencer Monetization Express"
    print(f"Generating Product using Gemini: {topic}...")
    
    pipeline = CourseProductionPipeline(ollama_client=llm, image_agent=image_agent)
    
    outline = pipeline._generate_outline(topic, 5, {"filename": "research.md", "content": research_content})
    sections = pipeline._generate_sections(outline, {"filename": "research.md", "content": research_content})
    
    # 4. GENERATE COVER IMAGE
    print("Generating Cover Image...")
    cover_result = image_agent.generate_image(f"E-course cover for {topic}")
    cover_path = cover_result.get("path") if cover_result.get("status") == "success" else None

    # 5. GENERATE GUMROAD SALES PAGE
    print("Generating Sales Page...")
    course_info = {
        'topic': topic,
        'num_sections': len(outline),
        'sections': sections,
        'price': 29.99
    }
    sales_page = gumroad_gen.generate_sales_page(course_info)

    # 6. GENERATE 3 SNS POSTS
    print("Generating SNS Posts...")
    sns_prompt = f"Write 3 biting social media posts based on: {research_content[:1000]}"
    sns_res = llm.invoke(sns_prompt)
    sns_posts = sns_res.content if hasattr(sns_res, 'content') else str(sns_res)

    # 7. PACKAGE EVERYTHING
    output_dir = Path("dist/sage_experiment_2026_v1")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open(output_dir / "COURSE_CONTENT.md", "w", encoding="utf-8") as f:
        f.write(f"# {topic}\n\nContents based on Ground Truth\n\n")
        for s in sections:
            f.write(f"## {s['title']}\n{s['content']}\n\n---\n")
    
    with open(output_dir / "SALES_PAGE.md", "w", encoding="utf-8") as f:
        f.write(sales_page)
        
    with open(output_dir / "SNS_DRAFTS.md", "w", encoding="utf-8") as f:
        f.write(sns_posts)

    import shutil
    shutil.make_archive("dist/Sage_Product_Express_2026", 'zip', output_dir)

    print("\n--- EXPERIMENT PACKAGE READY ---")
    print(f"Location: dist/Sage_Product_Express_2026.zip")
    print("Finalizing...")

if __name__ == "__main__":
    run_actual_monetization_experiment()
