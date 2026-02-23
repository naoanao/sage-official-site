import logging
import json
import time
from typing import List, Dict, Any
try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

from backend.pipelines.notebooklm_pipeline import notebooklm

logger = logging.getLogger(__name__)

class NotebookLMIntegration:
    """
    Sage Intelligence (NotebookLM replacement).
    Combines Deep Research (Search) + Synthesis (Gemini).
    """
    def __init__(self):
        self.pipeline = notebooklm
        self.name = "Sage Intelligence (NotebookLM)"
        if not DDGS:
            logger.warning("duckduckgo_search not installed using mocked search/fallback.")

    def research_topic(self, topic: str, depth: int = 3) -> Dict[str, Any]:
        """
        Conducts deep research on a topic using Search + Summarization.
        """
        logger.info(f"🔍 Starting Deep Research on: {topic}")
        
        # 1. Search Web
        urls = self._search_web(topic, max_results=depth)
        
        aggregated_content = f"# Research Topic: {topic}\n\n"
        valid_sources = []

        if urls:
            logger.info(f"🔗 Found {len(urls)} sources: {urls}")
            # 2. Extract & Aggregate Content
            for url in urls:
                try:
                    # Use pipeline's extraction (basic URL text extraction)
                    logger.info(f"📄 Processing: {url}")
                    text = self.pipeline._extract_text(url, 'url')
                    if text and len(text) > 100: # Filter empty/short
                        aggregated_content += f"## Source: {url}\n{text[:8000]}\n\n" # Limit per source
                        valid_sources.append(url)
                    else:
                        logger.warning(f"⏩ Skipped (no text): {url}")
                except Exception as e:
                    logger.error(f"❌ Failed to process {url}: {e}")
        else:
            logger.warning("⚠️ Search returned no results. Falling back to Internal Knowledge.")
            aggregated_content += "## Note: Web Search Failed. Report based on AI Internal Knowledge.\n\n"

        # Fallback if extraction failed (or search failed)
        if not valid_sources:
             aggregated_content += f"## Internal Knowledge Analysis\n(The agent successfully switched to internal synthesis mode for '{topic}')\n"
             valid_sources = ["Internal Knowledge (Search Unavailable)"]

        logger.info(f"📝 Aggregated content for synthesis.")

        # 3. Generate NotebookLM-style Output (Summary + Podcast)
        try:
            results = self.pipeline.process_content(
                aggregated_content, 
                source_type='text', 
                tasks=['summary', 'podcast', 'keypoints']
            )
            
            # Format Final Report
            summary_data = results.get('summary', {})
            short_sum = summary_data.get('short', 'N/A') if isinstance(summary_data, dict) else str(summary_data)
            detailed_sum = summary_data.get('detailed', 'N/A') if isinstance(summary_data, dict) else str(summary_data)
            
            podcast_script = results.get('podcast_script', 'N/A')
            keypoints = results.get('keypoints', [])

            report = f"""# 🧠 Sage Intelligence Report: {topic}

## 📝 Executive Summary
{short_sum}

## 🔑 Key Points
{chr(10).join(['- ' + str(k) for k in keypoints])}

## 📖 Deep Dive
{detailed_sum}

## 🎙️ Podcast Script (Audio Overview)
{podcast_script}

## 🔗 Sources
{chr(10).join(['- ' + u for u in valid_sources])}
"""
            return {
                "status": "success",
                "topic": topic,
                "report": report,
                "podcast_script": podcast_script,
                "sources": valid_sources,
                "raw_results": results
            }

        except Exception as e:
            logger.error(f"❌ Synthesis Error: {e}")
            return {"status": "error", "message": f"Synthesis failed: {e}", "report": str(e)}

    def generate_podcast_script(self, text: str) -> str:
        """
        Directly generates a podcast script from provided text.
        """
        return self.pipeline._generate_podcast_script(text)

    def _search_web(self, query: str, max_results: int = 3) -> List[str]:
        """
        Searches the web using DuckDuckGo.
        """
        if not DDGS:
            return []
        
        try:
            with DDGS() as ddgs:
                # text() returns generator of dicts {'href':..., 'title':..., 'body':...}
                results = [r['href'] for r in ddgs.text(query, max_results=max_results)]
                return results
        except Exception as e:
            logger.error(f"Search API Error: {e}")
            return []

    def generate_master_brain_markdown(self, memory_module) -> str:
        """
        Export ALL Sage Memories into a single structured Markdown file.
        This file is intended to be uploaded to Google NotebookLM.
        """
        logger.info("🧠 Generatng SAGE_MASTER_BRAIN.md...")
        
        content = "# 🧠 SAGE MASTER BRAIN KNOWLEDGE BASE\n\n"
        content += f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        
        # 1. Fetch from ChromaDB (Semantic Memory)
        try:
            if memory_module and memory_module.collection:
                # Fetch all (limit to 2000 for now to be safe)
                results = memory_module.collection.get(limit=2000)
                
                documents = results.get('documents', [])
                metadatas = results.get('metadatas', [])
                ids = results.get('ids', [])
                
                content += "## 📚 Semantic Memories (Long Term)\n\n"
                
                if documents:
                    for i, doc in enumerate(documents):
                        meta = metadatas[i] if i < len(metadatas) else {}
                        doc_id = ids[i] if i < len(ids) else "unknown"
                        timestamp = meta.get('timestamp', 'unknown')
                        category = meta.get('type', 'general')
                        
                        content += f"### Memory {doc_id} ({category})\n"
                        content += f"**Time**: {timestamp}\n\n"
                        content += f"{doc}\n\n"
                        content += "---\n\n"
                else:
                    content += "(No semantic memories found)\n\n"
            else:
                 content += "⚠️ Memory Module not connected or empty.\n\n"

        except Exception as e:
            content += f"⚠️ Error fetching memories: {e}\n\n"
            
        return content

# Singleton
notebooklm_integration = NotebookLMIntegration()

if __name__ == "__main__":
    # Self-test
    logging.basicConfig(level=logging.INFO)
    print("Testing Sage Intelligence...")
    res = notebooklm_integration.research_topic("Latest breakthroughs in nuclear fusion 2024", depth=2)
    print("\n--- REPORT ---\n")
    print(res['report'][:500] + "...")
