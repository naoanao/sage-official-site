import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.modules.image_agent import ImageAgent
from backend.modules.video_agent import VideoAgent

def test_pipeline():
    print("🚀 Starting Video Pipeline Test...")
    
    # 1. Initialize Agents
    image_agent = ImageAgent()
    video_agent = VideoAgent()
    
    # 2. Define Script
    prompts = [
        "Scene 1: Introduction to Sage AI",
        "Scene 2: Modular Architecture Explained",
        "Scene 3: Future of Autonomous Agents"
    ]
    
    # 3. Generate Images
    image_paths = []
    print("🎨 Generating Images...")
    for p in prompts:
        res = image_agent.generate_image(p)
        if res['status'] == 'success':
            print(f"  ✅ Generated: {res['path']}")
            image_paths.append(res['path'])
        else:
            print(f"  ❌ Failed: {res['message']}")
            return
            
    # 4. Generate Video
    print("🎥 Generating Video...")
    video_res = video_agent.create_slideshow(image_paths, "pipeline_test.mp4")
    
    if video_res['status'] == 'success':
        print(f"✅ Video Created Successfully: {video_res['path']}")
    else:
        print(f"❌ Video Creation Failed: {video_res['message']}")

if __name__ == "__main__":
    test_pipeline()
