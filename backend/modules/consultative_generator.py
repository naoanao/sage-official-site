import os
import json
import logging
from pathlib import Path
import datetime

logger = logging.getLogger(__name__)

class ConsultativeGenerator:
    def __init__(self, llm=None):
        """
        llm: A LangChain-compatible LLM object (e.g., ResilientLLMWrapper)
        """
        self.llm = llm
        # project_root / files / products
        self.output_dir = Path(__file__).parent.parent.parent / "files" / "products"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_product(self, chat_history: list):
        """
        Analyzes chat history to extract user needs and generate a product draft.
        chat_history: List of {"role": "user"|"assistant", "content": "..."}
        """
        if not self.llm:
            logger.error("LLM not provided to ConsultativeGenerator")
            return {"error": "LLM not initialized"}

        if not chat_history:
            return {"error": "Chat history is empty"}

        # Format history for prompt - Take last 15 messages for better context
        relevant_history = chat_history[-15:]
        history_text = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in relevant_history])
        
        prompt = f"""
        You are a Business Strategist & Content Creator. 
        Analyze the following chat history and extract the key needs, pain points, or topics the user is interested in.
        Your goal is to "Consult" and "Productize" these needs into high-value digital assets.
        
        CHAT HISTORY:
        {history_text}
        
        Please provide a detailed "Consultative Productization Plan" in the following JSON format:
        {{
            "analysis": "A summary of user needs and why this topic has high resonance.",
            "products": [
                {{
                    "type": "COURSE",
                    "title": "...",
                    "target": "...",
                    "value": "...",
                    "outline": ["Section 1", "Section 2", ...],
                    "sales_copy": "..."
                }},
                {{
                    "type": "ARTICLE",
                    "title": "...",
                    "target": "...",
                    "value": "...",
                    "outline": ["Intro", "Body", ...],
                    "sales_copy": "..."
                }}
            ],
            "recommended_action": "COURSE or ARTICLE"
        }}
        
        Use Japanese for all values if the history is primarily in Japanese, otherwise use English.
        Output ONLY the JSON.
        """
        
        try:
            logger.info("🚀 Generating consultative productization plan...")
            response = self.llm.invoke(prompt)
            content = response.content if hasattr(response, 'content') else str(response)
            
            # Extract JSON from potential markdown
            json_str = content
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            
            try:
                plan_data = json.loads(json_str)
            except json.JSONDecodeError:
                # Fallback to string if JSON fails
                logger.warning("JSON parsing failed, returning raw content")
                return {
                    "status": "success",
                    "content": content,
                    "raw": True
                }
            
            # Save to file
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"product_plan_{timestamp}.json"
            file_path = self.output_dir / filename
            
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(plan_data, f, indent=4, ensure_ascii=False)
                
            logger.info(f"✅ Product plan saved to: {file_path}")
            
            return {
                "status": "success",
                "plan": plan_data,
                "file_path": str(file_path),
                "filename": filename,
                "timestamp": timestamp
            }
        except Exception as e:
            logger.error(f"❌ Productization failed: {e}")
            return {"error": str(e)}
