"""
Gumroad Sales Page Generator
Automatically generates sales page copy for online courses using AI
"""
import os
import logging
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

class GumroadPageGenerator:
    """
    Gumroad販売ページ自動生成
    
    機能:
    - テンプレート読み込み
    - AIでコピーライティング
    - 変数置換・カスタマイズ
    - Markdown出力
    """
    
    def __init__(self, ollama_client=None):
        """
        Initialize Gumroad Page Generator
        
        Args:
            ollama_client: Ollama LLM client for copywriting
        """
        self.ollama = ollama_client
        
        # Load template
        template_path = Path(__file__).parent.parent / "cognitive" / "Gumroad_Sales_Page_Copy.md"
        if template_path.exists():
            with open(template_path, 'r', encoding='utf-8') as f:
                self.template = f.read()
            logger.info(f"✅ Template loaded from {template_path}")
        else:
            logger.warning(f"Template not found at {template_path}, using default")
            self.template = self._get_default_template()
    
    def generate_sales_page(self, course_info: dict) -> str:
        """
        Generate sales page copy
        
        Args:
            course_info: Dictionary with:
                - topic: Course topic
                - sections: List of section dicts
                - num_sections: Number of sections
                - duration: Estimated duration
                - target_audience: Target audience (optional)
                - price: Price (optional, default: $49.99)
        
        Returns:
            str: Sales page in Markdown format
        """
        logger.info(f"📄 Generating Gumroad sales page for: {course_info.get('topic')}")
        
        try:
            # Generate AI copy for key sections
            headline = self._generate_headline(course_info)
            benefits = self._generate_benefits(course_info)
            testimonial = self._generate_testimonial(course_info)
            
            # Build sales page
            sales_page = f"""# {headline}

## What You'll Learn

{benefits}

## Course Content

**{course_info.get('num_sections', 5)} Comprehensive Modules**

"""
            
            # Add section titles
            for i, section in enumerate(course_info.get('sections', []), 1):
                title = section.get('title', f"Module {i}")
                sales_page += f"{i}. **{title}**\n"
            
            sales_page += f"""

## Why This Course?

✅ **Expert-Created Content** - Learn from industry professionals
✅ **Self-Paced Learning** - Study on your own schedule
✅ **Lifetime Access** - Keep the course forever
✅ **Practical Examples** - Real-world applications
✅ **High-Quality Production** - Professional slides and narration

## Student Testimonial

> {testimonial}

## Pricing

**Special Launch Price**: ${course_info.get('price', 49.99)}

🎁 **Bonus**: Get instant access to all {course_info.get('num_sections', 5)} modules



If you're not satisfied with the course, get a full refund within 30 days. No questions asked.

## Ready to Get Started?

Click the button below to enroll now and start your learning journey!

[Enroll Now →]

---

*Course created: {datetime.now().strftime('%B %Y')}*
"""
            
            logger.info(f"✅ Sales page generated ({len(sales_page)} characters)")
            return sales_page
            
        except Exception as e:
            logger.error(f"Sales page generation failed: {e}")
            return self._get_fallback_page(course_info)
    
    def _generate_headline(self, course_info: dict) -> str:
        """Generate compelling headline"""
        topic = course_info.get('topic ', 'This Topic')
        
        if self.ollama:
            try:
                prompt = f"Write a compelling, benefit-focused headline for an online course about '{topic}'. Make it exciting and professional. Just the headline, one sentence, no quotes."
                response = self.ollama.invoke(prompt)
                headline = response.content if hasattr(response, 'content') else str(response)
                return headline.strip().strip('"').strip("'")
            except:
                pass
        
        # Fallback
        return f"Master {topic}: The Complete Guide"
    
    def _generate_benefits(self, course_info: dict) -> str:
        """Generate benefits list"""
        topic = course_info.get('topic', 'this topic')
        sections = course_info.get('sections', [])
        
        if self.ollama and sections:
            try:
                section_titles = [s.get('title', '') for s in sections[:3]]
                prompt = f"Based on these course topics: {', '.join(section_titles)}, write 3-5 key benefits a student will gain. Format as bullet points starting with ✅. Be specific and results-focused."
                response = self.ollama.invoke(prompt)
                benefits = response.content if hasattr(response, 'content') else str(response)
                return benefits.strip()
            except:
                pass
        
        # Fallback
        return f"""✅ Understand the fundamentals of {topic}
✅ Apply concepts to real-world scenarios
✅ Build practical skills you can use immediately
✅ Gain confidence in your knowledge"""
    
    def _generate_testimonial(self, course_info: dict) -> str:
        """Generate realistic testimonial"""
        topic = course_info.get('topic', 'this course')
        
        if self.ollama:
            try:
                prompt = f"Write a realistic, enthusiastic testimonial from a student who completed a course on '{topic}'. 2-3 sentences. Sound authentic, mention specific benefits. No name needed."
                response = self.ollama.invoke(prompt)
                testimonial = response.content if hasattr(response, 'content') else str(response)
                return testimonial.strip().strip('"').strip("'")
            except:
                pass
        
        # Fallback
        return f"This course exceeded my expectations! The content is well-structured and easy to follow. I now feel confident applying {topic} in my own projects."
    
    def _get_default_template(self) -> str:
        """Default template if file not found"""
        return """# {headline}

## {benefits}

## Pricing: ${price}

[Enroll Now]
"""
    
    def _get_fallback_page(self, course_info: dict) -> str:
        """Fallback page if AI generation fails"""
        topic = course_info.get('topic', 'Course')
        return f"""# {topic} - Online Course

## Learn {topic} Step-by-Step

Complete course with {course_info.get('num_sections', 5)} modules.

## Price: ${course_info.get('price', 49.99)}

[Enroll Now]
"""

# For testing
if __name__ == "__main__":
    generator = GumroadPageGenerator()
    
    test_course = {
        'topic': 'Python Programming',
        'num_sections': 5,
        'sections': [
            {'title': 'Introduction to Python'},
            {'title': 'Data Structures'},
            {'title': 'Functions and Modules'},
            {'title': 'Object-Oriented Programming'},
            {'title': 'Real-World Projects'}
        ],
        'price': 49.99
    }
    
    page = generator.generate_sales_page(test_course)
    print(page)
