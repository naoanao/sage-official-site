
import os
import sys
import json
import logging
import time
import re
from typing import TypedDict, Annotated, List, Union, Dict, Any
import operator
import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import datetime

# Import langchain
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END

# Import Agents (Optimistic imports)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

try:
    from backend.modules.browser_agent import BrowserAgent
except ImportError:
    BrowserAgent = None

try:
    from backend.modules.image_agent import ImageAgent
except ImportError:
    ImageAgent = None

try:
    from backend.modules.video_agent import VideoAgent
except ImportError:
    VideoAgent = None

try:
    from backend.modules.sage_brain import SageBrain
except ImportError:
    SageBrain = None

try:
    from backend.modules.neuromorphic_brain import NeuromorphicBrain
except ImportError:
    NeuromorphicBrain = None

try:
    from backend.modules.sage_memory import SageMemory
except ImportError:
    SageMemory = None

try:
    from backend.modules.jira_agent import JiraAgent
except ImportError:
    JiraAgent = None

try:
    from backend.modules.sheets_agent import SheetsAgent
except ImportError:
    SheetsAgent = None

try:
    from backend.modules.gmail_agent import GmailAgent
except ImportError:
    GmailAgent = None

try:
    from backend.modules.robot_agent import RobotAgent
except ImportError:
    RobotAgent = None

try:
    from backend.modules.file_operations_agent import FileOperationsAgent
except ImportError:
    FileOperationsAgent = None

try:
    from backend.modules.deploy_agent import DeployAgent
except ImportError:
    DeployAgent = None

try:
    from backend.integrations.computer_vision_agent import ComputerVisionAgent
except ImportError:
    ComputerVisionAgent = None

try:
    from backend.modules.browser_automation_agent import BrowserAutomationAgent
except ImportError:
    BrowserAutomationAgent = None

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LangGraphOrchestrator")

try:
    from backend.modules.auto_regulator import auto_regulator
    from backend.modules.api_monitor import api_monitor
except ImportError:
    auto_regulator = None
    api_monitor = None

# Groq
try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None

# Gemini SDK
import google.generativeai as genai

class AgentState(TypedDict):
    messages: Annotated[List[Any], operator.add]
    plan: List[Dict[str, Any]]
    current_step_index: int
    context: Dict[str, Any]
    final_response: str
    model_name: str

class SimpleGeminiSDK:
    def __init__(self, model_name):
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(model_name)
        else:
            self.model = None

    def invoke(self, input_data):
        if not self.model: raise Exception("Gemini API Key missing")
        
        # --- SAGE BRAKE CHECK ---
        if auto_regulator:
            auto_regulator.check_safety()

        try:
            text = ""
            if isinstance(input_data, str): text = input_data
            elif isinstance(input_data, list):
                text = "\n".join([f"{m.content}" for m in input_data if hasattr(m, "content")])
            else: text = str(input_data)
            
            response = self.model.generate_content(text)
            
            # --- LOG USAGE ---
            if api_monitor:
                # Estimate tokens (approx 4 chars/token for rough tracking)
                est_tokens = len(text) // 4 + len(response.text) // 4
                api_monitor.log_usage(model="gemini-2.5-flash", tokens=est_tokens)

            return AIMessage(content=response.text)
        except Exception as e:
            logger.error(f"Gemini invoke failed: {e}")
            raise e

class SimpleOllamaSDK:
    def __init__(self, model="llama3", base_url="http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    def invoke(self, input_data):
        # --- SAGE BRAKE CHECK ---
        if auto_regulator:
            auto_regulator.check_safety()

        try:
            prompt = ""
            if isinstance(input_data, str): prompt = input_data
            elif isinstance(input_data, list):
                prompt = "\n".join([f"{m.content}" for m in input_data if hasattr(m, "content")])
            
            payload = {"model": self.model, "messages": [{"role": "user", "content": prompt}], "stream": False}
            response = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=60)
            if response.status_code == 200:
                content = response.json().get("message", {}).get("content", "")
                
                # --- LOG USAGE (Ollama is free, but we track counts) ---
                if api_monitor:
                    api_monitor.log_usage(model=f"ollama-{self.model}", tokens=len(prompt)//4)

                return AIMessage(content=content)
            else:
                raise Exception(f"Ollama Error: {response.text}")
        except Exception as e:
            logger.error(f"Ollama invoke failed: {e}")
            raise e

class LangGraphOrchestrator:
    def __init__(self):
        # LLM Setup
        self.groq_llm = None
        groq_key = os.getenv("GROQ_API_KEY")
        if ChatGroq and groq_key:
            try:
                self.groq_llm = ChatGroq(model_name="llama-3.3-70b-versatile", api_key=groq_key, temperature=0.3)
                logger.info("Groq initialized")
            except: pass
            
        self.gemini_llm = SimpleGeminiSDK("gemini-2.5-flash")  # Updated from legacy model (2026/1/23)
        self.ollama_llm = SimpleOllamaSDK()
        
        # Default LLM
        if self.groq_llm: self.llm = self.groq_llm
        elif self.gemini_llm.model: self.llm = self.gemini_llm
        else: self.llm = self.ollama_llm
        
        # Agents
        self.browser_agent = BrowserAgent() if BrowserAgent else None
        self.image_agent = ImageAgent() if ImageAgent else None
        self.video_agent = VideoAgent() if VideoAgent else None
        self.jira_agent = JiraAgent() if JiraAgent else None
        self.sheets_agent = SheetsAgent() if SheetsAgent else None
        self.gmail_agent = GmailAgent() if GmailAgent else None
        self.robot_agent = RobotAgent(self.jira_agent) if RobotAgent else None

        # 👁️ Computer Vision Agent (Sage's Eyes + Hands — local PC control)
        self.cv_agent = None
        if ComputerVisionAgent:
            try:
                self.cv_agent = ComputerVisionAgent()
                logger.info("✅ ComputerVisionAgent initialized (screen control enabled)")
            except Exception as cv_err:
                logger.warning(f"ComputerVisionAgent not available: {cv_err}")

        # 🌐 Browser Automation Agent (Playwright)
        self.browser_automation = None
        if BrowserAutomationAgent:
            try:
                self.browser_automation = BrowserAutomationAgent(headless=True)
                logger.info("✅ BrowserAutomationAgent initialized (Playwright)")
            except Exception as ba_err:
                logger.warning(f"BrowserAutomationAgent not available: {ba_err}")

        # 🖐 File Operations Agent (Sage's Hands)
        if FileOperationsAgent:
            try:
                desktop = os.path.join(os.path.expanduser("~"), "Desktop")
                self.file_ops = FileOperationsAgent(base_path=desktop)
                logger.info("✅ FileOperationsAgent initialized (base: Desktop)")
            except Exception as e:
                logger.error(f"FileOperationsAgent init failed: {e}")
                self.file_ops = None
        else:
            self.file_ops = None
        
        # Brain & Memory
        self.neuromorphic_brain = NeuromorphicBrain() if NeuromorphicBrain else None
        self.brain = self.neuromorphic_brain
        self.memory_agent = SageMemory() if SageMemory else None
        self.deploy_agent = DeployAgent() if DeployAgent else None

        # State Graph
        workflow = StateGraph(AgentState)
        workflow.add_node("planner", self.plan_node)
        workflow.add_node("executor", self.execute_node)
        workflow.add_node("reporter", self.report_node)
        
        workflow.set_entry_point("planner")
        workflow.add_edge("planner", "executor")
        workflow.add_conditional_edges("executor", self.should_continue)
        workflow.add_edge("reporter", END)
        
        self.app = workflow.compile()

    def invoke(self, input_data):

         if isinstance(input_data, str):
             input_data = {"messages": [HumanMessage(content=input_data)], "plan": [], "current_step_index": 0, "context": {}}
         return self.app.invoke(input_data)

    def run(self, input_data):
        return self.invoke(input_data)

    @retry(retry=retry_if_exception_type(Exception), stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def invoke_with_retry(self, input_data):
        return self.llm.invoke(input_data)

    def plan_node(self, state: AgentState):
        logger.info("--- Planner Node ---")
        messages = state.get("messages", [])
        user_request = messages[-1].content if messages else ""
        context = state.get("context", {})
        req = user_request.lower().strip()
        
        # JIRA OVERRIDE
        if any(k in req for k in ["jira", "ticket", "チケット", "課題"]):
            # Extract summary: simple split by colon or use request
            summary = req.split(":", 1)[1].strip() if ":" in req else "New task from Sage AI"
            
            # Use real project key if possible (default KAN)
            proj_key = os.getenv("JIRA_PROJECT_KEY", "KAN")
            
            override_plan = [{
                "step_id": 1, 
                "tool": "jira_create_issue", 
                "params": {
                    "summary": summary, 
                    "description": f"Created via Sage AI: {user_request}", 
                    "issue_type": "Task",
                    "project_key": proj_key
                }
            }]
            ret_val = {"plan": override_plan, "context": context}
            logger.info(f"DEBUG RETURN: {ret_val}")
            return ret_val
        
        # SHEETS OVERRIDE
        if any(k in req for k in ["sheet", "excel", "spread", "スプレッド", "シート"]):
            override_plan = [{"step_id": 1, "tool": "sheets_create", "params": {"title": f"Sage Export {datetime.now().strftime('%Y-%m-%d')}"}}]
            ret_val = {"plan": override_plan, "context": context}
            logger.info(f"DEBUG RETURN: {ret_val}")
            return ret_val

        # PHYSICAL AI / ROBOT OVERRIDE (LeRobot/GR00T)
        if any(k in req for k in ["robot", "arm", "box", "demo", "ロボット", "箱", "lerobot", "gr00t"]):
            override_plan = [{"step_id": 1, "tool": "robot_action", "params": {"task": user_request}}]
            ret_val = {"plan": override_plan, "context": context}
            logger.info(f"DEBUG RETURN: {ret_val}")
            return ret_val

        # IMAGE GENERATION OVERRIDE (PixArt / SD / DALL-E)
        if any(k in req for k in ["image", "picture", "drawing", "photo", "paint", "sketch", "画像", "イラスト", "写真", "描いて"]):
             override_plan = [{"step_id": 1, "tool": "generate_image", "params": {"prompt": user_request}}]
             ret_val = {"plan": override_plan, "context": context}
             logger.info(f"DEBUG RETURN: {ret_val}")
             return ret_val

        # FILE CREATION OVERRIDE (Sage's Hands)
        if any(k in req for k in ["ファイル", "作成して", "書き込んで", "create file", "write file", "save file", "作って", "保存して"]):
             # Extract filename and content from request
             # Try to extract quoted filename
             fname_match = re.search(r'[「\'"](.*?\.[a-zA-Z]{2,4})[」\'"\s]', user_request)
             filename = fname_match.group(1) if fname_match else "sage_output.txt"
             # Determine location (desktop default)
             location = "desktop"
             if "document" in req or "ドキュメント" in req:
                 location = "documents"
             # Extract content between 「」or quotes if present
             content_match = re.search(r'[「\'"](.*?)[」\'|$]', user_request)
             content = content_match.group(1) if content_match and content_match.group(1) != filename else user_request
             override_plan = [{"step_id": 1, "tool": "create_file", "params": {"filename": filename, "content": content, "location": location, "overwrite": True}}]
             ret_val = {"plan": override_plan, "context": context}
             logger.info(f"DEBUG RETURN (create_file): {ret_val}")
             return ret_val

        # FILE LIST OVERRIDE
        if any(k in req for k in ["一覧", "ファイルを見て", "list files", "ls", "dir", "what files", "ファイル一覧"]):
             path = "."
             if "desktop" in req or "デスクトップ" in req:
                 path = os.path.join(os.path.expanduser("~"), "Desktop")
             elif "document" in req or "ドキュメント" in req:
                 path = os.path.join(os.path.expanduser("~"), "Documents")
             override_plan = [{"step_id": 1, "tool": "list_files", "params": {"path": path}}]
             ret_val = {"plan": override_plan, "context": context}
             logger.info(f"DEBUG RETURN (list_files): {ret_val}")
             return ret_val

        # WEB SEARCH OVERRIDE (News / Weather / Facts)
        if any(k in req for k in ["search", "weather", "news", "price", "who is", "what is", "検索", "天気", "株価", "ニュース", "誰", "何", "教えて", "調べ"]):
             query = user_request
             # Clean up common fillers to improve search accuracy
             for filler in ["教えて", "調べて", "って何", "を検索", "下さい", "ください", "tell me", "search for"]:
                 query = query.replace(filler, "").strip()
             
             override_plan = [{"step_id": 1, "tool": "browser_search", "params": {"query": query}}]
             ret_val = {"plan": override_plan, "context": context}
             logger.info(f"DEBUG RETURN: {ret_val}")
             return ret_val
            
        # WEB BROWSE OVERRIDE (Specific URL)
        url_match = re.search(r'(https?://[^\s]+)', user_request)
        if url_match or any(k in req for k in ["browse", "view", "read page", "ページを見て", "内容を読んで", "閲覧"]):
             target_url = url_match.group(1) if url_match else None
             if target_url:
                 override_plan = [{"step_id": 1, "tool": "browser_browse", "params": {"url": target_url}}]
                 ret_val = {"plan": override_plan, "context": context}
                 logger.info(f"DEBUG RETURN: {ret_val}")
                 return ret_val
            
        # WEB DEPLOY OVERRIDE (Publish to Blog)
        if any(k in req for k in ["publish", "deploy", "公開", "デプロイ", "ブログ投稿"]):
             title_match = re.search(r'[「\'"](.*?)[」\'"]', user_request)
             title = title_match.group(1) if title_match else "Sage Update"
             content = user_request.replace(title, "").replace("publish", "").replace("公開", "").strip()
             override_plan = [{"step_id": 1, "tool": "deploy_web_blog", "params": {"title": title, "content": content, "category": "General"}}]
             ret_val = {"plan": override_plan, "context": context}
             logger.info(f"DEBUG RETURN (deploy): {ret_val}")
             return ret_val

        # DEFAULT: Empty plan (will trigger LLM/Chat in execute/report)
        ret_val = {"plan": [], "context": context, "current_step_index": 0}
        logger.info(f"DEBUG RETURN: {ret_val}")
        return ret_val


    def execute_node(self, state: AgentState):
        logger.info("--- Executor Node ---")
        plan = state.get("plan", [])
        messages = state.get("messages", [])
        context = state.get("context", {})
        
        # BRAIN SHORT CIRCUIT (Only if plan is empty, to prioritize tools)
        if not plan and self.neuromorphic_brain:
            try:
                msgs = state.get("messages", [])
                user_txt = msgs[-1].content if msgs else ""
                if user_txt:
                     res = self.neuromorphic_brain.infer(query=user_txt)
                     if res.get("confidence", 0) > 0.15 and res.get("response"):
                         ret_val = {"final_response": res["response"], "context": {**context, "brain_used": True}}
                         logger.info(f"DEBUG RETURN: {ret_val}")
                         return ret_val
            except Exception as e: logger.error(f"Brain err: {e}")
            
        results = []
        for step in plan:
            tool = step.get("tool")
            params = step.get("params", {})
            res = "Failed"
            try:
                if tool == "jira_create_issue":
                    if self.jira_agent:
                        res = self.jira_agent.create_issue(params.get("summary"), params.get("description"), params.get("issue_type", "Task"), params.get("project_key", os.getenv("JIRA_PROJECT_KEY", "KAN")))
                    else: res = "JiraAgent missing"
                elif tool == "sheets_create":
                    if self.sheets_agent: res = self.sheets_agent.create_sheet(params.get("title"))
                    else: res = "SheetsAgent missing"
                elif tool == "generate_image":
                    if self.image_agent: res = self.image_agent.generate_image(params.get("prompt"))
                    else: res = "ImageAgent missing"
                elif tool == "browser_search":
                    if self.browser_agent: res = self.browser_agent.search_google(params.get("query"))
                    else: res = "BrowserAgent missing"
                elif tool == "browser_browse":
                    if self.browser_agent: res = self.browser_agent.browse_url(params.get("url"))
                    else: res = "BrowserAgent missing"
                elif tool == "robot_action":
                    if self.robot_agent: res = self.robot_agent.run_gr00t_inference(params)
                    else: res = "RobotAgent missing - Install 'lerobot' first."

                # 🖐 FILE OPERATIONS (Sage's Hands)
                elif tool == "create_file":
                    if self.file_ops:
                        fname = params.get("filename", "sage_output.txt")
                        content = params.get("content", "")
                        location = params.get("location", "desktop")
                        overwrite = params.get("overwrite", True)
                        # Resolve full path
                        if location == "desktop":
                            base = os.path.join(os.path.expanduser("~"), "Desktop")
                        elif location == "documents":
                            base = os.path.join(os.path.expanduser("~"), "Documents")
                        else:
                            base = location
                        full_path = os.path.join(base, fname)
                        try:
                            os.makedirs(os.path.dirname(full_path), exist_ok=True)
                            with open(full_path, 'w', encoding='utf-8') as f:
                                f.write(content)
                            res = f"✅ File created: {full_path}"
                            context['last_created_file'] = full_path
                        except Exception as fe:
                            res = f"❌ Failed to create file: {str(fe)}"
                    else:
                        res = "FileOperationsAgent not available"

                elif tool == "list_files":
                    path = params.get("path", os.path.join(os.path.expanduser("~"), "Desktop"))
                    try:
                        if os.path.exists(path):
                            files = sorted(os.listdir(path))[:30]
                            res = f"📂 Files in {path}:\n" + "\n".join(f"  - {f}" for f in files)
                        else:
                            res = f"❌ Path not found: {path}"
                    except Exception as fe:
                        res = f"❌ Error listing: {str(fe)}"

                elif tool == "deploy_web_blog":
                    if self.deploy_agent:
                        res = str(self.deploy_agent.publish_blog(
                            title=params.get("title", "Update"),
                            content=params.get("content", ""),
                            category=params.get("category", "General")
                        ))
                    else:
                        res = "DeployAgent not ready"

                elif tool == "move_file":
                    if self.file_ops:
                        res = self.file_ops.move_file(params.get("source", ""), params.get("destination", ""))
                    else:
                        res = "FileOperationsAgent not available"

                elif tool == "run_command":
                    if self.file_ops:
                        res = self.file_ops.execute_command(params.get("command", ""))
                    else:
                        res = "FileOperationsAgent (execute_command) not available"

                # 👁️ COMPUTER VISION / PC CONTROL (Sage's Eyes & Hands)
                elif tool == "computer_screenshot":
                    if self.cv_agent:
                        try:
                            path = self.cv_agent.capture_screen(
                                params.get("filename", "sage_screen.png")
                            )
                            res = {"status": "success", "screenshot_path": str(path)}
                        except Exception as e:
                            res = {"status": "error", "message": str(e)}
                    else:
                        res = "ComputerVisionAgent not available (pyautogui required)"

                elif tool == "computer_find_and_click":
                    # 画面上の要素を説明で見つけてクリック
                    if self.cv_agent:
                        try:
                            desc = params.get("description", "")
                            result = self.cv_agent.find_and_click(desc)
                            res = result
                        except Exception as e:
                            res = {"status": "error", "message": str(e)}
                    else:
                        res = "ComputerVisionAgent not available"

                elif tool == "computer_click":
                    # 座標を直接指定してクリック
                    if self.cv_agent:
                        try:
                            x, y = params.get("x", 0), params.get("y", 0)
                            success = self.cv_agent.click_element(x, y)
                            res = {"status": "success" if success else "error", "x": x, "y": y}
                        except Exception as e:
                            res = {"status": "error", "message": str(e)}
                    else:
                        res = "ComputerVisionAgent not available"

                elif tool == "browser_automate":
                    # Playwrightでブラウザ操作
                    if self.browser_automation:
                        try:
                            action = params.get("action", "navigate")
                            if action == "navigate":
                                self.browser_automation.start()
                                res = self.browser_automation.navigate(params.get("url", ""))
                            elif action == "screenshot":
                                self.browser_automation.start()
                                res = self.browser_automation.take_screenshot(
                                    params.get("url", ""), params.get("output_path", "browser_shot.png")
                                )
                            elif action == "fill":
                                res = self.browser_automation.fill_form(
                                    params.get("selector", ""), params.get("value", "")
                                )
                            elif action == "click":
                                res = self.browser_automation.click(params.get("selector", ""))
                            else:
                                res = f"Unknown browser action: {action}"
                        except Exception as e:
                            res = {"status": "error", "message": str(e)}
                    else:
                        res = "BrowserAutomationAgent not available (playwright required)"

                else:
                    res = f"Tool '{tool}' not implemented in v2 engine"
            except Exception as e:
                res = f"Error: {e}"
            # Raw dict/list を人間可読な文字列に変換してから追加
            if isinstance(res, dict):
                # browser_search 結果を人間が読めるサマリーに変換
                if res.get("status") == "success" and "results" in res:
                    search_results = res["results"]
                    if search_results:
                        summary_lines = []
                        for r in search_results[:5]:
                            title = r.get("title", "")
                            snippet = r.get("snippet", r.get("description", ""))
                            link = r.get("link", r.get("url", ""))
                            summary_lines.append(f"- {title}: {snippet} ({link})")
                        res = "Search results:\n" + "\n".join(summary_lines)
                    else:
                        res = "Search completed but no results found."
                else:
                    res = str(res.get("error") or res.get("message") or "Tool returned no useful data.")
            elif isinstance(res, list):
                res = "\n".join(str(x) for x in res[:10])
            results.append(f"{tool}: {res}")

        context["step_results"] = results
        ret_val = {"context": context, "current_step_index": len(plan)}
        logger.info(f"DEBUG RETURN: {ret_val}")
        return ret_val

    def report_node(self, state: AgentState):
        logger.info("--- Reporter Node ---")
        try:
            messages = state.get("messages", [])
            context = state.get("context", {})
            user_msg = messages[-1].content if messages else ""
            
            # Brain Short Circuit Check
            if context.get("brain_used") and context.get("final_response"):
                ret_val = {"final_response": context["final_response"]}
                logger.info(f"DEBUG RETURN: {ret_val}")
                return ret_val
            
            # Construct Robust Prompt
            step_results = context.get("step_results", [])
            results_str = "\n".join(step_results) if step_results else "No tools executed."
            
            system_msg = f"""You are Sage, a helpful AI assistant.

CRITICAL RULES — NEVER VIOLATE:
- NEVER output raw Python dicts, JSON objects, or API response structures (e.g. {{'status': 'success', 'results': []}})
- NEVER output "Task executed but LLM report failed" or "No tools executed" or similar technical boilerplate
- NEVER say 'I don't have the capability to access the internet'
- If search results are empty, say so naturally: 'I searched but couldn't find specific details'
- Always respond in natural, helpful language

Context of actions taken:
{results_str}

User Request: {user_msg}

Respond helpfully and naturally. If no tools ran or search returned nothing, answer from your knowledge directly.
"""
            # [FIX] Pass FULL HISTORY to LLM, not just the last message
            # messages contains [Human, AI, Human, AI, ... Human(current)]
            input_msgs = [SystemMessage(content=system_msg)] + messages
            
            if self.llm:
                # Use retry logic
                try:
                    response = self.invoke_with_retry(input_msgs)
                    content = response.content
                    
                    # Fallback if empty
                    if not content or not content.strip():
                        content = f"Task executed successfully.\n\nDetails:\n{results_str}"
                    
                    # --- FIX IMAGE PATHS (Post-Processing) ---
                    # LLM might miss the instruction, so we force-fix it here using Regex
                    # Pattern: match anything that looks like an absolute windows path in markdown image
                    # Target: /files/filename.extension
                    try:
                        import re
                        def replace_path(match):
                            full_path = match.group(1)
                            filename = os.path.basename(full_path)
                            return f"/files/{filename}"
                        
                        # Fix markdown images: ![Alt](C:\Path\To\File.jpg) -> ![Alt](/files/File.jpg)
                        content = re.sub(r'\((C:[^)]+)\)', replace_path, content)
                        # Fix plain paths if mentioned: C:\Path\To\File.jpg -> /files/File.jpg
                        content = re.sub(r'C:[\\\w\s\.-]+generated_images[\\\\]([\w\.-]+)', r'/files/\1', content)
                    except Exception as regex_err:
                        logger.warning(f"Image path refactoring failed: {regex_err}")

                    # --- BRAIN LEARNING (STDP Loop) ---
                    # Only learn meaningful responses if tools were not involved (conversational learning) OR if it was a successful tool usage
                    if self.neuromorphic_brain and content:
                        # Feed back to brain for next time
                        self.neuromorphic_brain.provide_feedback(user_msg, content, was_helpful=True)

                    ret_val = {"final_response": content}
                    logger.info(f"DEBUG RETURN: {ret_val}")
                    return ret_val
                except Exception as e:
                    logger.error(f"LLM Invoke Error: {e}")
                    return {"final_response": f"Task executed but LLM report failed.\n\nRaw Output:\n{results_str}"}
            else:
                ret_val = {"final_response": f"Sage Offline Mode. Actions taken:\n{results_str}"}
                logger.info(f"DEBUG RETURN: {ret_val}")
                return ret_val
        except Exception as e:
            logger.error(f"Report failed: {e}")
            step_results = context.get("step_results", [])
            results_str = "\n".join(step_results) if step_results else "No details."
            ret_val = {"final_response": f"System Error during reporting: {e}\n\nOperation Data:\n{results_str}"}
            logger.info(f"DEBUG RETURN: {ret_val}")
            return ret_val

    def should_continue(self, state: AgentState):
        # If we already have a final response (e.g. from Brain), go to reporter
        if state.get("final_response"):
            return "reporter"
            
        index = state['current_step_index']
        plan = state['plan']
        # If there are steps left, loop back to executor
        if index < len(plan):
            return "executor"
        # Otherwise, go to reporter to synthesize response
        return "reporter"



