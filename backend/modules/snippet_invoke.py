    def invoke_llm_safe(self, messages, fallback_to_ollama: bool = True):
        """
        Safely invokes the LLM with automatic fallback to Ollama on Quota/Error.
        """
        response_content = None
        
        # 1. Try Gemini (Primary)
        if self.llm:
            try:
                # Direct invocation if messages is list, or formatted instructions
                logger.info("🧠 Invoking Gemini...")
                res = self.llm.invoke(messages)
                response_content = res.content
                
                # Check for Content-based Quota Errors (sometimes returned as text)
                if "quota" in str(response_content).lower() or "429" in str(response_content):
                    raise Exception(f"Quota Error in Content: {response_content}")
                    
            except Exception as e:
                logger.warning(f"⚠️ Gemini Failed: {e}")
                response_content = None # Force fallback
        
        # 2. Fallback to Ollama
        if not response_content and fallback_to_ollama and self.ollama_llm:
            try:
                logger.info("🔄 Falling back to Ollama...")
                res = self.ollama_llm.invoke(messages)
                response_content = res.content
                logger.info("✅ Ollama Responded.")
            except Exception as e:
                logger.error(f"❌ Ollama Fallback Failed: {e}")
        
        if not response_content:
            logger.error("☠️ Both LLMs failed.")
            raise Exception("All LLMs failed to respond.")
            
        return AIMessage(content=response_content)
