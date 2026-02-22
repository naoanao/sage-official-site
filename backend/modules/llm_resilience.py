
import logging
import time
import os
import requests
import json
from typing import List, Dict, Any, Optional, Union

# Configure logging
logger = logging.getLogger("LLMResilience")

class ResilientLLMWrapper:
    """
    The Immortal Circuit: Automatic LLM Fallback System
    
    Strategy:
    1. Try Primary Provider (e.g., Gemini)
    2. If failed (500/429/Timeout), switch to Secondary (e.g., Groq)
    3. If all cloud fails, fallback to Local (Ollama)
    
    This ensures Sage NEVER stops thinking, even during API outages.
    """
    
    def __init__(self, config: Dict[str, Any] = None, providers: Dict[str, Any] = None, preference: List[str] = None):
        if providers and preference:
            # LangGraphOrchestrator V2 style: Direct object injection
            self.providers = providers
            self.provider_order = preference
            self.mode = "injected"
            logger.info(f"Resilient Circuit (Injected) Initialized. Order: {self.provider_order}")
        else:
            # Traditional style: Config based instantiation
            try:
                from backend.modules.sage_config import config as sage_config
                self.config = config or sage_config.get("privacy")
            except ImportError:
                self.config = {}
            self.provider_order = self.config.get("fallback_order", ["gemini", "groq", "ollama"])
            self.mode = "config"
            logger.info(f"Resilient Circuit (Config) Initialized. Order: {self.provider_order}")
            
        self.current_provider_index = 0
        
        # Load API keys from env
        self.api_keys = {
            "gemini": os.getenv("GEMINI_API_KEY"),
            "groq": os.getenv("GROQ_API_KEY"),
            "openai": os.getenv("OPENAI_API_KEY")
        }

    def invoke(self, input_data: Union[str, List[Dict[str, str]], Any], **kwargs) -> str:
        """
        Main entry point. Attempts to generate response using current provider,
        falling back if necessary.
        """
        # --- Input Normalization (Truth in Logic) ---
        if isinstance(input_data, str):
            messages = [{"role": "user", "content": input_data}]
        elif isinstance(input_data, list):
            # Already a list of dicts or list of message objects
            messages = []
            for m in input_data:
                if isinstance(m, dict):
                    messages.append(m)
                elif hasattr(m, 'role') and hasattr(m, 'content'):
                    messages.append({"role": m.role, "content": m.content})
                elif hasattr(m, 'content'): # LangChain message objects
                    messages.append({"role": "user", "content": m.content})
                else:
                    messages.append({"role": "user", "content": str(m)})
        else:
            messages = [{"role": "user", "content": str(input_data)}]

        original_index = self.current_provider_index
        attempts = 0
        max_attempts = len(self.provider_order)

        while attempts < max_attempts:
            provider = self.provider_order[self.current_provider_index]
            logger.info(f"[LLM] Thinking with {provider.upper()}...")
            
            try:
                # If we have injected providers (LangChain objects), use them
                if self.mode == "injected":
                    llm = self.providers.get(provider)
                    if llm:
                        request_id = kwargs.pop('request_id', None) # STRIP IT before passing to provider
                        start_time = time.time()
                        resp = llm.invoke(messages, **kwargs)
                        latency = time.time() - start_time
                        
                        # Extract content
                        content = resp.content if hasattr(resp, 'content') else str(resp)
                        
                        # LOG THIS CALL (Fortress Observability)
                        from backend.modules.llm_logger import llm_logger
                        llm_logger.log_call(
                            provider=provider,
                            messages=messages,
                            response=content,
                            latency_ms=round(latency * 1000, 2),
                            model=getattr(llm, 'model_name', getattr(llm, 'model', 'injected')),
                            request_id=request_id
                        )

                        # Reset to primary for next time
                        if self.current_provider_index != 0:
                             logger.info(f"[RESTORE] Recovered with {provider}. Next call will try primary again.")
                             self.current_provider_index = 0 
                        return content
                    else:
                        raise ValueError(f"Provider {provider} not found in injected providers")

                # Otherwise use internal REST calls
                response = self._call_provider(provider, messages, **kwargs)
                if response:
                    # Success handled within _call_provider logs already
                    return response
            
            except Exception as e:
                logger.error(f"[FAIL] Provider {provider.upper()} Failed: {str(e)}")
                
                # Switch to next provider
                self.current_provider_index = (self.current_provider_index + 1) % len(self.provider_order)
                attempts += 1
                
                if attempts < max_attempts:
                    next_provider = self.provider_order[self.current_provider_index]
                    logger.warning(f"[FALLBACK] Switching to: {next_provider.upper()}")
                else:
                    logger.critical("[FATAL] All LLM circuits failed. Sage is silent.")
                    raise Exception("All intelligence providers failed or are unstable. Aborting generation.")


    def _call_provider(self, provider: str, messages: List[Dict[str, str]], **kwargs) -> str:
        """Internal router for provider specific implementations"""
        from backend.modules.llm_logger import llm_logger
        from backend.modules.rate_limiter import groq_limiter
        
        start_time = time.time()
        model = "unknown"
        
        try:
            if provider == "gemini":
                model = "gemini-2.0-flash"
                response = self._call_gemini(messages)
            elif provider == "groq":
                if not groq_limiter.is_allowed():
                    logger.warning("Groq Rate Limit Exceeded. Falling back.")
                    raise Exception("Groq rate limit reached")
                
                model = "llama-3.3-70b-versatile"
                response = self._call_groq(messages)
            elif provider == "ollama":
                model = kwargs.get("model", "llama3")
                response = self._call_ollama(messages, model=model)
            else:
                raise ValueError(f"Unknown provider: {provider}")
                
            latency = time.time() - start_time
            llm_logger.log_call(
                provider=provider, 
                messages=messages, 
                response=response, 
                latency_ms=round((time.time() - start_time) * 1000, 2), 
                model=model, 
                request_id=kwargs.get('request_id')
            )
            return response
            
        except Exception as e:
            raise e

    def _call_gemini(self, messages: List[Dict[str, str]]) -> str:
        api_key = self.api_keys.get("gemini")
        if not api_key: raise ValueError("GEMINI_API_KEY not found")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        contents = []
        for m in messages:
            if isinstance(m, str):
                role = "user"
                text = m
            else:
                role = "user" if m.get("role") == "user" else "model"
                text = m.get("content", "")
            contents.append({"role": role, "parts": [{"text": text}]})
            
        payload = {"contents": contents}
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

    def _call_groq(self, messages: List[Dict[str, str]]) -> str:
        api_key = self.api_keys.get("groq")
        if not api_key: raise ValueError("GROQ_API_KEY not found")
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": "llama-3.3-70b-versatile", 
            "messages": messages,
            "temperature": 0.3
        }
        resp = requests.post(url, json=payload, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, timeout=15)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    def _call_ollama(self, input_messages: Any, model: str = "qwen2.5-coder:1.5b") -> str:
        """
        Final gateway to Ollama. Ensures messages are always correct.
        """
        url = f"{os.getenv('OLLAMA_HOST', 'http://localhost:11434')}/api/chat"
        
        # --- THE ULTIMATE NORMALIZER (One Point of Truth) ---
        messages = []
        try:
            # 1. Handle Stringified JSON or Raw String
            if isinstance(input_messages, str):
                trimmed = input_messages.strip()
                if (trimmed.startswith('[') and trimmed.endswith(']')) or (trimmed.startswith('{') and trimmed.endswith('}')):
                    try:
                        parsed = json.loads(trimmed)
                        if isinstance(parsed, list):
                            messages = parsed
                        elif isinstance(parsed, dict):
                            messages = [parsed]
                    except:
                        messages = [{"role": "user", "content": trimmed}]
                else:
                    messages = [{"role": "user", "content": trimmed}]
            
            # 2. Handle List directly
            elif isinstance(input_messages, list):
                messages = input_messages
            
            # 3. Handle Other types
            else:
                messages = [{"role": "user", "content": str(input_messages)}]
        except Exception as e:
            logger.error(f"[SEC] Final Normalization Error: {e}")
            raise Exception(f"Input normalization failed: {e}")

        # --- VALIDATE STRUCTURE ---
        final_messages = []
        allowed_roles = ["system", "user", "assistant"]
        for m in messages:
            role = "user"
            content = ""
            
            if isinstance(m, dict):
                role = m.get("role", "user").lower()
                content = m.get("content", m.get("text", ""))
            else:
                content = str(m)
            
            # Normalize common alternative roles
            if role in ["ai", "assistant"]: role = "assistant"
            if role in ["user", "human"]: role = "user"
            if role not in allowed_roles: role = "user" # Strict fallback
            
            # Ensure content is string and NOT empty
            content_str = str(content).strip()
            if not content_str:
                content_str = "..." # Minimal content to avoid 400
            
            final_messages.append({"role": role, "content": content_str})

        if not final_messages:
             raise Exception("No valid messages found for Ollama call.")

        payload = {
            "model": model, 
            "messages": final_messages, 
            "stream": False,
            "keep_alive": "10m",
            "options": {
                "num_ctx": 2048,
                "temperature": 0.3
            }
        }
        
        try:
            # DO NOT USE json=payload if we already have it formatted? 
            # Actually json=payload is correct as it does json.dumps.
            resp = requests.post(url, json=payload, timeout=(10, 600))
            if resp.status_code != 200:
                err_msg = f"Ollama Error ({resp.status_code}): {resp.text[:500]}"
                logger.error(err_msg)
                raise Exception(err_msg)
                
            res_json = resp.json()
            # Double check the response structure
            content = res_json.get("message", {}).get("content", "")
            if not content:
                 logger.warning(f"Ollama returned empty content. Full response: {res_json}")
            
            return content
        except Exception as e:
            logger.error(f"Ollama Connection Failed: {e}")
            raise e

    def __call__(self, messages, **kwargs):
        return self.invoke(messages, **kwargs)
