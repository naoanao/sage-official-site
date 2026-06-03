#!/usr/bin/env python3
"""
AI Content Generator - No API Required
Version: 1.0
Generate high-quality content for DEV.to, Medium, Hashnode instantly.
No API keys needed - just run and go!
"""
import random
from datetime import datetime
class AIContentGenerator:
    """
    Simple content generator using proven templates.
    No API keys required - works offline!
    """
    DEFAULT_STRUCTURE = [
        "## Introduction",
        "## Main Point 1",
        "## Main Point 2",
        "## Conclusion"
    ]

    def __init__(self):
        self.language = self.select_language()
        self.templates = self.load_templates()
        self.prompts = self.load_prompts()
    def select_language(self):
        """Select language for generation"""
        print("\n🌐 Select Language / 言語選択 / 语言选择 / Selecione o idioma:")
        print("1. English (Default)")
        print("2. Japanese (日本語)")
        print("3. Chinese (中文)")
        print("4. Portuguese (Português)")
        choice = input("\nEnter number (1-4): ").strip()
        langs = {'1': 'en', '2': 'jp', '3': 'cn', '4': 'pt'}
        return langs.get(choice, 'en')
    def load_templates(self):
        """Multi-language templates"""
        templates = {
            "en": {
                "tutorial": {"title": "How to {topic} in {time}", "tags": ["tutorial", "howto"]},
                "listicle": {"title": "{number} {adjective} {topics}", "tags": ["list", "tips"]},
                "comparison": {"title": "{tool1} vs {tool2}: Comparison", "tags": ["comparison", "review"]}
            },
            "jp": {
                "tutorial": {"title": "【初心者向け】{time}で分かる {topic} 入門", "tags": ["チュートリアル", "入門"]},
                "listicle": {"title": "プロが教える！{topics} {number}選", "tags": ["まとめ", "おすすめ"]},
                "comparison": {"title": "{tool1} vs {tool2}：どっちを使うべき？", "tags": ["比較", "レビュー"]}
            },
            "cn": {
                "tutorial": {"title": "如何 {time} 学会 {topic}", "tags": ["教程", "入门"]},
                "listicle": {"title": "{number} 个 {topics} 技巧", "tags": ["清单", "技巧"]},
                "comparison": {"title": "{tool1} vs {tool2}：深度对比", "tags": ["对比", "测评"]}
            },
            "pt": {
                "tutorial": {"title": "Como {topic} em {time}", "tags": ["tutorial", "dicas"]},
                "listicle": {"title": "{number} {topics} Incríveis", "tags": ["lista", "dicas"]},
                "comparison": {"title": "{tool1} vs {tool2}: Qual escolher?", "tags": ["comparacao", "review"]}
            }
        }
        return templates.get(self.language, templates['en'])
    def load_prompts(self):
        """Multi-language prompts"""
        prompts = {
            "en": {
                "dev_tools": ["Build a CLI tool", "VS Code Extensions", "Docker Basics"],
                "productivity": ["Time Blocking", "Notion Setup", "Deep Work"]
            },
            "jp": {
                "dev_tools": ["PythonでCLIツール作成", "VS Codeおすすめ拡張機能", "Docker入門"],
                "productivity": ["時間管理術", "Notion活用法", "集中力を高める方法"]
            },
            "cn": {
                "dev_tools": ["Python CLI 工具开发", "VS Code 插件推荐", "Docker 基础"],
                "productivity": ["时间管理技巧", "Notion 设置", "深度工作"]
            },
            "pt": {
                "dev_tools": ["Criar ferramenta CLI", "Extensões VS Code", "Básico de Docker"],
                "productivity": ["Gestão de tempo", "Configuração Notion", "Trabalho focado"]
            }
        }
        return prompts.get(self.language, prompts['en'])
    def generate_idea(self, category=None):
        """Generate a content idea"""
        if not category:
            category = random.choice(list(self.prompts.keys()))
        idea = random.choice(self.prompts[category])
        template_type = random.choice(list(self.templates.keys()))
        template = self.templates[template_type]
        return {
            "category": category,
            "idea": idea,
            "template_type": template_type,
            "title_template": template["title"],
            "structure": template.get("structure", self.DEFAULT_STRUCTURE),
            "tags": template["tags"],
            "generated_at": datetime.now().isoformat()
        }
    def generate_article_outline(self, topic):
        """Generate complete article outline"""
        template = random.choice(list(self.templates.values()))
        # FIX: use .get() with default structure instead of direct key access
        structure = template.get("structure", self.DEFAULT_STRUCTURE)
        outline = f"""# {topic}
## Article Structure
"""
        for section in structure:
            outline += f"{section}\n"
            outline += "- [Write 2-3 paragraphs here]\n"
            outline += "- [Include code example if relevant]\n\n"
        outline += f"""
## Suggested Tags
{', '.join(template['tags'])}
## Estimated Reading Time
5-7 minutes
## Call to Action
- Ask for feedback
- Invite discussion
- Share related resources
"""
        return outline
    def generate_batch(self, count=10):
        """Generate multiple ideas"""
        ideas = []
        for _ in range(count):
            ideas.append(self.generate_idea())
        return ideas
def main():
    """Demo: Generate 10 content ideas"""
    print("AI Content Generator - Demo")
    print("=" * 60)
    generator = AIContentGenerator()
    # Generate ideas
    print("\n📝 Generating 10 Content Ideas...\n")
    ideas = generator.generate_batch(10)
    for i, idea in enumerate(ideas, 1):
        print(f"{i}. [{idea['category'].upper()}] {idea['idea']}")
        print(f"   Template: {idea['template_type']}")
        print(f"   Tags: {', '.join(idea['tags'])}\n")
    # Generate full outline for first idea
    print("\n" + "=" * 60)
    print("📄 Full Outline for Idea #1:")
    print("=" * 60)
    outline = generator.generate_article_outline(ideas[0]['idea'])
    print(outline)
    # Save to file
    filename = f"content_ideas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("# Content Ideas\n\n")
        for i, idea in enumerate(ideas, 1):
            f.write(f"## Idea {i}: {idea['idea']}\n")
            f.write(f"**Category:** {idea['category']}\n")
            f.write(f"**Template:** {idea['template_type']}\n")
            f.write(f"**Tags:** {', '.join(idea['tags'])}\n\n")
    print(f"\n✅ Saved to: {filename}")
if __name__ == "__main__":
    main()
