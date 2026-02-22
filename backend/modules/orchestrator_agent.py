import os
import sys
import json
import logging
import re
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

try:
    from ollama_integration import OllamaBackend
except ImportError:
    print("⚠️ OllamaBackend not found in path")
    OllamaBackend = None

# Import Agents
try:
    from backend.modules.browser_agent import BrowserAgent
    from backend.modules.video_agent import VideoAgent
    from backend.modules.image_agent import ImageAgent
    from backend.modules.memory_agent import MemoryAgent
    from backend.modules.gmail_agent import GmailAgent
    from backend.modules.drive_agent import DriveAgent
    from backend.global_market.translation_service import TranslationService
    from backend.automation.twitter_automation import TwitterAutomation
    AGENTS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Agent Import Error: {e}")
    AGENTS_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OrchestratorAgent:
    def __init__(self):
        self.ollama = OllamaBackend() if OllamaBackend else None
        
        # Initialize Sub-Agents
        if AGENTS_AVAILABLE:
            self.browser = BrowserAgent(headless=True)
            self.video = VideoAgent()
            self.image = ImageAgent()
            self.memory = MemoryAgent()
            self.gmail = GmailAgent()
            self.drive = DriveAgent()
            self.translation = TranslationService()
            self.twitter = TwitterAutomation()
        else:
            self.browser = None
            self.video = None
            self.image = None
            self.memory = None
            self.gmail = None
            self.drive = None
            self.twitter = None

        self.available_tools = [
            "video_agent",
            "image_agent",
            "browser_agent",
            "memory_agent",
            "gmail_agent",
            "drive_agent",
            "translation_service",
            "file_system"
        ]

    def plan_task(self, user_request):
        """
        Breaks down a complex user request into a list of steps.
        """
        if not self.ollama:
            return {"status": "error", "message": "Ollama not available for planning"}

        prompt = f"""
        SYSTEM: You are a strict JSON generator.
        GOAL: Break down the REQUEST into steps.
        
        TOOLS:
        - video_agent: create_slideshow(image_paths, output_filename)
        - image_agent: generate_image(prompt)
        - browser_agent: search_google(query), browse(url)
        - memory_agent: remember(text)
        - gmail_agent: get_unread_emails(), send_email(to, subject, body)
        - drive_agent: list_files(), upload_file(path)
        - drive_agent: list_files(), upload_file(path)
        - translation_service: translate_text(text, target_lang)
        - twitter_agent: post_tweet(text, image_path)
        
        RULES:
        1. DO NOT invent file paths. Use "image_agent" to generate images first.
        2. If you need an image, Step 1 MUST be "image_agent".
        3. For "video_agent", use the path returned by "image_agent" (e.g., "CONTEXT.image_paths").
        
        REQUEST: "{user_request}"
        
        RESPONSE FORMAT (JSON ONLY):
        {{
            "plan": [
                {{
                    "step_id": 1,
                    "tool": "tool_name",
                    "action": "function_name",
                    "params": {{ "param_name": "param_value" }},
                    "description": "short description"
                }}
            ]
        }}
        """
        
        # Retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Planning attempt {attempt+1}/{max_retries}...")
                response = self.ollama.query(prompt, timeout=600) # Increased timeout to 10 mins
                if not response:
                    continue
                    
                # Extract JSON from response (handle potential markdown code blocks)
                json_str = response
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0]
                elif "```" in response:
                    json_str = response.split("```")[1].split("```")[0]
                    
                plan = json.loads(json_str.strip())
                return {"status": "success", "plan": plan.get("plan", [])}
            except json.JSONDecodeError:
                logger.warning(f"JSON Decode Error on attempt {attempt+1}")
                continue
            except Exception as e:
                logger.error(f"Planning error on attempt {attempt+1}: {e}")
                continue

        return {"status": "error", "message": "Failed to generate plan after retries"}

    def execute_plan(self, plan):
        """
        Executes the plan by dispatching calls to actual agents.
        """
        results = []
        context = {} # Store results from previous steps (e.g. image paths)
        
        for step in plan:
            logger.info(f"Executing Step {step['step_id']}: {step['description']}")
            tool = step['tool']
            action = step['action']
            params = step.get('params', {})
            
            step_result = {"status": "error", "message": "Unknown tool or action"}

            try:
                # --- Browser Agent ---
                if tool == "browser_agent":
                    if action == "search_google":
                        step_result = self.browser.search_google(params.get('query'))
                    elif action == "browse":
                        step_result = self.browser.browse(params.get('url'))
                    elif action == "take_screenshot":
                        step_result = self.browser.take_screenshot(params.get('url'), params.get('path'))

                # --- Image Agent ---
                elif tool == "image_agent":
                    if action == "generate_image":
                        prompt = params.get('prompt')
                        step_result = self.image.generate_image(prompt)
                        # Store image path in context for video agent
                        if step_result['status'] == 'success':
                            if 'image_paths' not in context: context['image_paths'] = []
                            context['image_paths'].append(step_result['path'])

                # --- Video Agent ---
                elif tool == "video_agent":
                    if action == "create_slideshow":
                        # Use images from context if available, otherwise use params
                        image_paths = context.get('image_paths', params.get('image_paths', []))
                        output_filename = params.get('output_filename', f"video_{int(time.time())}.mp4")
                        step_result = self.video.create_slideshow(image_paths, output_filename)

                # --- Memory Agent ---
                elif tool == "memory_agent":
                    if action == "remember":
                        step_result = self.memory.remember(params.get('text'))
                    elif action == "recall":
                        step_result = {"status": "success", "results": self.memory.recall(params.get('query'))}

                # --- Gmail Agent ---
                elif tool == "gmail_agent":
                    if not getattr(self.gmail, 'enabled', False):
                        step_result = {"status": "error", "message": "Gmail Agent is disabled (Auth Failed)"}
                    elif action == "get_unread_emails":
                        step_result = {"status": "success", "emails": self.gmail.get_unread_emails()}
                    elif action == "send_email":
                        step_result = self.gmail.send_email(params.get('to'), params.get('subject'), params.get('body'))

                # --- Drive Agent ---
                elif tool == "drive_agent":
                    if not getattr(self.drive, 'enabled', False):
                        step_result = {"status": "error", "message": "Drive Agent is disabled (Auth Failed)"}
                    elif action == "list_files":
                        step_result = {"status": "success", "files": self.drive.list_files()}
                    elif action == "upload_file":
                        step_result = self.drive.upload_file(params.get('path'))

                # --- Translation Service ---
                elif tool == "translation_service":
                    if action == "translate_text":
                        step_result = {"status": "success", "text": self.translation.translate_text(params.get('text'), params.get('target_lang'))}

                # --- Twitter Agent ---
                elif tool == "twitter_agent":
                    if action == "post_tweet":
                        # Use image from context if available
                        image_path = params.get('image_path')
                        if not image_path and 'image_paths' in context and context['image_paths']:
                            image_path = context['image_paths'][-1] # Use the last generated image
                            
                        step_result = self.twitter.post_tweet(params.get('text'), image_path)

                # --- File System (Basic) ---
                elif tool == "file_system":
                    if action == "write":
                        with open(params.get('path'), 'w', encoding='utf-8') as f:
                            f.write(params.get('content'))
                        step_result = {"status": "success", "message": f"Wrote to {params.get('path')}"}
                
                # Log result
                logger.info(f"Step {step['step_id']} Result: {step_result.get('status')}")
                results.append({
                    "step_id": step['step_id'],
                    "status": step_result.get('status'),
                    "result": step_result
                })

            except Exception as e:
                logger.error(f"Step {step['step_id']} Failed: {e}")
                results.append({
                    "step_id": step['step_id'],
                    "status": "error",
                    "error": str(e)
                })
            
        return results

if __name__ == "__main__":
    print("🧠 Starting OrchestratorAgent Self-Test...")
    agent = OrchestratorAgent()
    
    if not agent.ollama:
        print("❌ Ollama not found. Skipping test.")
        sys.exit(1)
        
    request = "Find the latest news about Python and create a summary video."
    print(f"📋 Planning for: {request}")
    
    # 1. Plan
    plan_res = agent.plan_task(request)
    if plan_res['status'] == 'success':
        print("✅ Plan Generated:")
        print(json.dumps(plan_res['plan'], indent=2, ensure_ascii=False))
        
        # 2. Execute (Dry run / Real run)
        print("\n🚀 Executing Plan...")
        exec_res = agent.execute_plan(plan_res['plan'])
        print(json.dumps(exec_res, indent=2, ensure_ascii=False))
    else:
        print(f"❌ Planning Failed: {plan_res.get('message')}")

