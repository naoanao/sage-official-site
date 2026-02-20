"""
Course Production Pipeline
Automated online course generation with AI

Features:
- Outline generation (Ollama)
- Section content creation (Ollama)
- Slide image generation (ImageAgent)
- Obsidian note saving
"""
import logging
import os
import json
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class CourseProductionPipeline:
    """
    Online course auto-generation pipeline
    
    1-command course creation:
    - Table of contents
    - Section content
    - Slide images
    - Sales page generation
    - Obsid ian storage
    """
    
    def __init__(self, ollama_client=None, image_agent=None, obsidian=None, gumroad_generator=None, fish_audio=None, groq_client=None, gemini_client=None, brain=None, **kwargs):
        """
        Initialize with existing components
        
        Args:
            ollama_client: Ollama LLM client (from orchestrator)
            image_agent: ImageAgent instance
            obsidian: ObsidianConnector instance
            gumroad_generator: GumroadPageGenerator instance
            fish_audio: FishAudioIntegration instance
            groq_client: Groq LLM client
            gemini_client: Gemini LLM client
            brain: Brain instance
        """
        self.ollama = ollama_client
        self.groq = groq_client
        self.gemini = gemini_client
        self.image_agent = image_agent
        self.obsidian = obsidian
        self.gumroad = gumroad_generator
        self.fish_audio = fish_audio
        self.brain = brain
        logger.info("CourseProductionPipeline initialized (Unified Version)")
    
    def generate_course(self, topic: str, num_sections: int = 5, customer_request: str = "", quality_tier: str = None, request_id: str = "unknown", **kwargs) -> Dict:
        """
        Generate complete course
        
        Args:
            topic: Course topic
            num_sections: Number of sections (default: 5)
            customer_request: Specific user instructions/context
            quality_tier: Target quality level
            request_id: Unique ID
        """
        logger.info(f"🚀 [PIPELINE] Starting generation for: {topic} (Req: {customer_request[:30]}...)")
        
        try:
            # Step 0: Knowledge Context Injection (Brain RAG)
            knowledge_context = ""
            if self.brain:
                try:
                    kb_res = self.brain.query(topic, n_results=3)
                    if isinstance(kb_res, dict):
                        if 'documents' in kb_res and kb_res['documents'] and kb_res['documents'][0]:
                            knowledge_context = "\n".join(kb_res['documents'][0])
                        elif 'response' in kb_res and kb_res['response']:
                            knowledge_context = kb_res['response']
                except Exception as e:
                    logger.warning(f"Brain query failed: {e}")

            # Step 0.1: Paper Knowledge Injection (Research Guard)
            if any(k in topic.lower() for k in ["research", "論文", "調べて", "paper", "調べ"]):
                try:
                    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    path = os.path.join(base_dir, "brain", "paper_knowledge", "README.md")
                    logger.info(f"🧪 Checking Paper Knowledge path: {path}")
                    if os.path.exists(path):
                        with open(path, 'r', encoding='utf-8') as f:
                             knowledge_context += "\n\n[Sacred Paper Retrieval Guidelines]\n" + f.read()
                        logger.info("🧪 Paper Knowledge injected successfully.")
                    else:
                        logger.warning(f"🧪 Paper Knowledge path MISSING: {path}")
                except Exception as e:
                    logger.error(f"🧪 Paper Knowledge injection error: {e}")

            # Step 1: Generate outline
            outline = self._generate_outline(topic, num_sections)
            logger.info(f"✅ Outline generated: {len(outline)} sections")
            
            # Step 2: Generate section content (with Knowledge Context)
            sections = self._generate_sections(outline, knowledge_context=knowledge_context)
            logger.info(f"✅ Content generated: {len(sections)} sections")
            
            # Step 3: Generate slide images
            slides = self._generate_slides(sections)
            logger.info(f"✅ Slides generated: {len(slides)} images")
            
            # Step 4: Generate sales page
            sales_page = self._generate_sales_page(topic, outline, sections)
            if sales_page:
                logger.info(f"✅ Sales page generated ({len(sales_page)} chars)")
            
            # Step 5: Save to Obsidian
            note_path = self._save_to_obsidian(topic, outline, sections, slides, sales_page, knowledge_context=knowledge_context)
            logger.info(f"✅ Saved to Obsidian: {note_path}")
            
            return {
                "status": "success",
                "topic": topic,
                "outline": outline,
                "sections": sections,
                "slides": slides,
                "sales_page": sales_page,
                "obsidian_note": str(note_path)
            }
        
        except Exception as e:
            logger.error(f"❌ Course generation failed: {e}", exc_info=True)
            return {
                "status": "error",
                "message": str(e)
            }
    
    def _generate_outline(self,topic: str, num_sections: int) -> List[str]:
        """Generate course outline"""
        prompt = f"""Create a course outline for "{topic}".

Generate exactly {num_sections} section titles.
Format: Just the titles, one per line, no numbering.

Example:
Introduction to the Topic
Core Concepts
Practical Applications
Advanced Techniques
Conclusion and Next Steps
"""
        
        if self.ollama:
            try:
                response = self.ollama.invoke(prompt)
                content = response.content if hasattr(response, 'content') else str(response)
                outline = [line.strip() for line in content.split('\n') if line.strip()]
                return outline[:num_sections]
            except Exception as e:
                logger.warning(f"Ollama outline generation failed: {e}, using fallback")
        
        # Fallback outline
        return [
            f"{topic}: Introduction",
            f"{topic}: Core Concepts",
            f"{topic}: Practical Guide",
            f"{topic}: Advanced Topics",
            f"{topic}: Summary and Next Steps"
        ][:num_sections]
    
    def _generate_sections(self, outline: List[str], knowledge_context: str = "") -> List[Dict]:
        """Generate content for each section"""
        sections = []
        
        for i, title in enumerate(outline, 1):
            logger.info(f"📝 Generating section {i}/{len(outline)}: {title}")
            
            prompt = f"""Write detailed content for this course section:

Section Title: {title}

CONTEXT (SACRED KNOWLEDGE - USE THIS AS PRIMARY SOURCE):
{knowledge_context or 'No specific context provided. Use general knowledge.'}

Write 3-5 informative paragraphs explaining this topic clearly.
Include:
- Key concepts and definitions
- Practical examples or use cases
- Important points to remember

Force the output to reflect the specific details from the SACRED KNOWLEDGE provided above if relevant.
Keep it educational and engaging.

Content:"""
            
            content = ""
            if self.ollama:
                try:
                    response = self.ollama.invoke(prompt)
                    content = response.content if hasattr(response, 'content') else str(response)
                except Exception as e:
                    logger.warning(f"Ollama section generation failed: {e}")
            
            if not content:
                content = f"**{title}**\n\nThis section covers important aspects of {title}. Key concepts will be explained with practical examples and real-world applications."
            
            sections.append({
                "number": i,
                "title": title,
                "content": content
            })
        
        return sections
    
    def _generate_slides(self, sections: List[Dict]) -> List[Dict]:
        """Generate slide images"""
        slides = []
        
        for section in sections:
            logger.info(f"🖼️  Generating slide {section['number']}: {section['title']}")
            
            # Professional slide prompt
            prompt = f"Professional course slide with title '{section['title']}', minimal text, clean design, educational style, high quality"
            
            try:
                if self.image_agent:
                    result = self.image_agent.generate_image(prompt)
                    if result and result.get("status") == "success":
                        slides.append({
                            "section": section['number'],
                            "title": section['title'],
                            "image_path": result.get("path"),
                            "image_url": result.get("url")
                        })
                        continue
            except Exception as e:
                logger.error(f"Slide generation error: {e}")
            
            # If image generation fails, still record the section
            slides.append({
                "section": section['number'],
                "title": section['title'],
                "status": "image_generation_skipped"
            })
        
        return slides
    
    def _generate_sales_page(self, topic: str, outline: List[str], sections: List[Dict]) -> Optional[str]:
        """Generate Gumroad sales page"""
        
        if not self.gumroad:
            logger.warning("Gumroad generator not configured")
            return None
        
        try:
            course_info = {
                'topic': topic,
                'sections': sections,
                'num_sections': len(sections),
                'price': 49.99
            }
            
            sales_page = self.gumroad.generate_sales_page(course_info)
            return sales_page
        except Exception as e:
            logger.error(f"Sales page generation failed: {e}")
            return None
    
    def _save_to_obsidian(self, topic: str, outline: List[str], 
                          sections: List[Dict], slides: List[Dict], sales_page: Optional[str] = None,
                          knowledge_context: str = "") -> Optional[str]:
        """Save course to Obsidian"""
        
        if not self.obsidian:
            logger.warning("Obsidian not configured, skipping save")
            return None
        
        # Build Markdown content
        content = f"# {topic} - Course Content\n\n"
        content += f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        
        # Table of contents
        content += "## 📋 Course Outline\n\n"
        for i, title in enumerate(outline, 1):
            content += f"{i}. {title}\n"
        content += "\n"
        
        # Research Evidence Section
        if knowledge_context:
            content += "## 🧪 Research Context & Evidence\n\n"
            content += "> [!IMPORTANT] Integrated Knowledge\n"
            content += "> This course was generated using the following specialized knowledge:\n\n"
            content += f"{knowledge_context}\n\n"
        
        content += "---\n\n"
        
        # Section details
        for section in sections:
            content += f"## {section['number']}. {section['title']}\n\n"
            content += section['content']
            content += "\n\n"
            
            # Add slide image reference if available
            slide = next((s for s in slides if s['section'] == section['number']), None)
            if slide and 'image_path' in slide:
                content += f"**Slide**: `{slide['image_path']}`\n\n"
            
            content += "---\n\n"
        
        # Add sales page if available
        if sales_page:
            content += "## 💰 Sales Page\n\n"
            content += sales_page
            content += "\n\n---\n\n"
        
        try:
            note_path = self.obsidian.create_knowledge_note(
                content,
                {
                    "topic": topic,
                    "type": "course",
                    "status": "generated",
                    "generated_at": datetime.now().isoformat()
                }
            )
            return note_path
        except Exception as e:
            logger.error(f"Obsidian save failed: {e}")
            return None
