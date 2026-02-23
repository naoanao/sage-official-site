import sys
import os
from typing import Dict, Any, List

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__))))

from pipelines.notebooklm_pipeline import NotebookLMPipeline

class NotebookLMEnhanced(NotebookLMPipeline):
    """
    Enhanced NotebookLM for Sage.
    Inherits from NotebookLMPipeline.
    """
    def __init__(self):
        super().__init__()
        self.name = "Sage NotebookLM Enhanced"

    def upload_and_summarize(self, pdf_path: str) -> Dict[str, Any]:
        """
        Uploads a PDF (local path), extracts text, and generates a summary.
        """
        print(f"[Sage NotebookLM] Processing PDF: {pdf_path}")
        return self.process_content(pdf_path, source_type='pdf', tasks=['summary', 'keypoints'])

    def chat_with_document(self, question: str, context_text: str) -> str:
        """
        Chat with a document context.
        """
        print(f"[Sage NotebookLM] Chat Question: {question}")
        
        prompt = f"""
        Context:
        {context_text[:20000]}... (truncated)
        
        Question: {question}
        
        Answer based on the context provided. If the answer is not in the context, say so.
        """
        
        response = self.model.generate_content(prompt)
        return response.text

    def generate_study_guide(self, text: str) -> Dict[str, Any]:
        """
        Generates a study guide from text.
        """
        print(f"[Sage NotebookLM] Generating Study Guide...")
        
        prompt = """
        Create a study guide from the following text. Include:
        1. Key Concepts (Definitions)
        2. 5 Review Questions with Answers
        3. A brief summary
        
        Return JSON: {"concepts": [{"term": "...", "def": "..."}], "questions": [{"q": "...", "a": "..."}], "summary": "..."}
        """
        
        response = self.model.generate_content([prompt, text])
        return self._parse_json(response.text)

# Singleton
notebooklm_enhanced = NotebookLMEnhanced()
