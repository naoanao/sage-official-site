
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
        self.sheets_agent = SheetsAgent() if SheetsAgent else None
        self.gmail_agent = GmailAgent() if GmailAgent else None
        self.robot_agent = RobotAgent(self.jira_agent) if RobotAgent else None
        
        # Brain & Memory
        self.neuromorphic_brain = NeuromorphicBrain() if NeuromorphicBrain else None
        self.brain = self.neuromorphic_brain
        self.memory_agent = SageMemory() if SageMemory else None

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
        import sys
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

        # WEB SEARCH OVERRIDE (News / Weather / Facts)
        if any(k in req for k in ["search", "weather", "news", "price", "who is", "what is", "検索", "天気", "株価", "ニュース", "誰", "何", "教えて", "調べ"]):
             override_plan = [{"step_id": 1, "tool": "browser_search", "params": {"query": user_request}}]
             ret_val = {"plan": override_plan, "context": context}
             logger.info(f"DEBUG RETURN: {ret_val}")
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
                elif tool == "robot_action":
                    if self.robot_agent: res = self.robot_agent.run_gr00t_inference(params)
                    else: res = "RobotAgent missing - Install 'lerobot' first."
                else:
                    res = f"Tool {tool} not implemented"
            except Exception as e:
                res = f"Error: {e}"
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
            
            system_msg = f"""You are Sage, an advanced AI OS.
Context of actions taken:
{results_str}

Additional Context:
{json.dumps(context, default=str)[:2000]}

User Request: {user_msg}

Synthesize a helpful response for the user based on the actions taken. 
If a robot task was performed, describe the movement and status clearly.
If an anomaly was detected, highlight it.
If an image was generated, respond with: ![Generated Image](/files/<filename>)
NOTE: The tool returns a local absolute path. You MUST convert it to a web-accessible relative path '/files/<filename>' for the user.
Example: 'C:\\Users\\nao\\...\\img_123.jpg' -> '/files/img_123.jpg'
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



