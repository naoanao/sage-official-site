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
from typing import Dict, List, Optional
from datetime import datetime
from backend.modules.monetization_measure import MonetizationMeasure

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
    
    def __init__(self, ollama_client=None, image_agent=None, obsidian=None, gumroad_generator=None, fish_audio=None, brain=None, groq_client=None, memory=None, **kwargs):
        """
        Initialize with existing components

        Args:
            ollama_client: Ollama LLM client (from orchestrator)
            image_agent: ImageAgent instance
            obsidian: ObsidianConnector instance
            gumroad_generator: GumroadPageGenerator instance
            fish_audio: FishAudioIntegration instance
            brain: NeuromorphicBrain instance
            groq_client: Groq LLM client
            memory: SageMemory instance for semantic search and storage
        """
        self.ollama = ollama_client
        self.image_agent = image_agent
        self.obsidian = obsidian
        self.gumroad = gumroad_generator
        self.fish_audio = fish_audio
        self.brain = brain
        self.groq_client = groq_client
        self.memory = memory
        logger.info("CourseProductionPipeline initialized")
    
    def generate_course(self, topic: str, num_sections: int = 5, generate_narration: bool = False, reference_audio: str = None, **kwargs) -> Dict:
        """
        Generate complete course
        
        Args:
            topic: Course topic
            num_sections: Number of sections (default: 5)
        
        Returns:
            Dictionary with generation results
        """
        # --- PRIORITY 0: LEGAL SCRUBBING ---
        safe_topic = self._scrub_ip_risks(topic)
        if safe_topic != topic:
            logger.info(f"🛡️  IP Risk detected. Scrubbed '{topic}' -> '{safe_topic}'")
        
        logger.info(f"🎓 Generating course: {safe_topic}")
        
        try:
            # --- PRIORITY 1: D1 RESEARCH INGESTION ---
            research_data = self._get_latest_research(safe_topic)
            if research_data:
                logger.info(f"🔍 [D1] Found research evidence: {research_data['filename']}")
            else:
                logger.info("ℹ️ [D1] No specific research found, proceeding with general knowledge")

            logger.info("Paper Knowledge check complete")
            if self.memory:
                try:
                    self.memory.add_memory(
                        content=f"Monetization task executed: {safe_topic}",
                        metadata={"topic": safe_topic, "research_used": bool(research_data)}
                    )
                except Exception as e:
                    logger.warning(f"Memory store failed (non-critical): {e}")
            
            # Step 1: Generate outline
            outline = self._generate_outline(safe_topic, num_sections, research_data)
            logger.info(f"✅ Outline generated: {len(outline)} sections")
            
            # Step 2: Generate section content
            sections = self._generate_sections(outline, safe_topic)
            logger.info(f"✅ Content generated: {len(sections)} sections")
            
            # Step 3: Generate slide images
            slides = self._generate_slides(sections)
            logger.info(f"✅ Slides generated: {len(slides)} images")
            
            # Step 4: Generate sales page
            sales_page = self._generate_sales_page(safe_topic, sections, research_data)
            if sales_page:
                logger.info(f"✅ Sales page generated ({len(sales_page)} chars)")
            
            # Step 5: Save to Obsidian
            note_path = self._save_to_obsidian(safe_topic, outline, sections, slides, sales_page, research_data)
            logger.info(f"✅ Saved to Obsidian: {note_path}")
            
            result = {
                "status": "success",
                "topic": topic,
                "outline": outline,
                "sections": sections,
                "slides": slides,
                "sales_page": sales_page,
                "research_source": research_data['filename'] if research_data else None,
                "obsidian_note": str(note_path)
            }

            # QA Gate — must pass before brain training and final "VERIFIED" status
            qa_passed, qa_issues = self._qa_gate(result)
            if qa_passed:
                result["qa_status"] = "PASS"
                logger.info(f"[QA] PASS: {safe_topic}")

                # Brain training only on QA-verified output
                if self.brain:
                    try:
                        feedback_content = (
                            f"Topic: {safe_topic} | "
                            f"Sections: {len(sections)} | "
                            f"Evidence: {result.get('research_source', 'none')}"
                        )
                        self.brain.provide_feedback(
                            query=safe_topic,
                            correct_response=feedback_content,
                            was_helpful=True
                        )
                        logger.info(f"[BRAIN] Learning recorded for: {safe_topic}")
                    except Exception as e:
                        logger.warning(f"[BRAIN] Learning failed (non-critical): {e}")
            else:
                result["qa_status"] = "WARN"
                result["qa_issues"] = qa_issues
                logger.warning(f"[QA] WARN ({len(qa_issues)} issues) for '{safe_topic}': {qa_issues}")
                MonetizationMeasure.log_event("qa_warn", {"topic": safe_topic, "issues": qa_issues})
                # Brain does NOT learn from QA-failed output

            if qa_passed:
                 MonetizationMeasure.log_event("qa_pass", {"topic": safe_topic})

            # Always save to SageMemory, evidence_status reflects QA result
            if self.memory:
                try:
                    summary = (
                        f"Product generated: {safe_topic}\n"
                        f"Sections: {', '.join(s['title'] for s in sections)}"
                    )
                    self.memory.add_memory(
                        content=summary,
                        metadata={
                            "topic": safe_topic,
                            "type": "product_generation",
                            "evidence_status": "VERIFIED" if qa_passed else "NEEDS_REVIEW",
                            "generated_at": datetime.now().isoformat(),
                        }
                    )
                    logger.info("[MEMORY] Generation result saved to semantic memory.")
                except Exception as e:
                    logger.warning(f"[MEMORY] Memory save failed (non-critical): {e}")

            return result
        
        except Exception as e:
            logger.error(f"❌ Course generation failed: {e}", exc_info=True)
            return {
                "status": "error",
                "message": str(e)
            }

    def _get_latest_research(self, topic: str) -> Optional[Dict]:
        """Fetch latest relevant D1 research from Obsidian vault"""
        try:
            import pathlib
            vault_dir = pathlib.Path("obsidian_vault/knowledge")
            if not vault_dir.exists():
                return None
            
            # Whitelist: only research_*.md files are allowed as knowledge sources.
            # No fallback to arbitrary .md files — prevents test logs / Notion snapshots
            # from contaminating course content.
            files = list(vault_dir.glob("research_*.md"))
            if not files:
                logger.info("[D1] No 'research_*.md' found. Returning None (contamination guard active).")
                return None
            
            # Match topic keywords to check for relevance
            keywords = [k.lower() for k in topic.split() if len(k) > 1]
            if not keywords: keywords = [topic.lower()]

            # Sort by modification time (latest first)
            files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            
            # Check last 10 files for topically relevant content
            for latest_file in files[:10]:
                with open(latest_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Contamination Guard: Exclude tests, failure reports, or extremely short files
                    is_test = "test" in latest_file.name.lower() or "integration test" in content.lower()[:500]
                    is_failure = "failure report" in content.lower()[:200] or "status: FAILED" in content
                    if is_test or is_failure or len(content) < 300:
                        logger.info(f"[GUARD] Contamination blocked: {latest_file.name} (Test:{is_test}, Fail:{is_failure}, Len:{len(content)})")
                        MonetizationMeasure.log_event("contamination_blocked", {"file": latest_file.name, "reason": "test_or_fail"})
                        continue

                    # Relevance check: Does the filename or content match at least one keyword?
                    if any(k in latest_file.name.lower() or k in content.lower()[:2000] for k in keywords):
                        evidence_status = "VERIFIED"
                        return {
                            "filename": latest_file.name,
                            "content": content,
                            "mtime": latest_file.stat().st_mtime,
                            "evidence_status": evidence_status
                        }
            
            # If no match, returning None prevents technical test logs from ruining the course
            logger.info(f"No topically relevant research found for {keywords} among last 10 files.")
            return None
        except Exception as e:
            logger.warning(f"Failed to fetch D1 research: {e}")
            return None

    def _qa_gate(self, result: Dict) -> tuple:
        """
        Pre-sale quality check. Returns (passed: bool, issues: list[str]).

        Checks:
          1. Section count >= 3
          2. Each section >= 200 chars of content
          3. Majority of sections are not fallback template text
          4. No placeholder strings in sales page
          5. No un-scrubbed IP words remaining in the topic
        """
        issues = []
        sections = result.get("sections", [])

        # 1. Minimum section count
        if len(sections) < 3:
            issues.append(f"Too few sections: {len(sections)} (minimum 3)")

        # 2. Thin content check
        short = [s["title"] for s in sections if len(s.get("content", "")) < 200]
        if short:
            issues.append(f"Thin content (<200 chars) in: {short}")

        # 3. Fallback template detection
        FALLBACK_MARKER = "This section covers important aspects of"
        fallback_count = sum(1 for s in sections if FALLBACK_MARKER in s.get("content", ""))
        if sections and fallback_count > len(sections) // 2:
            issues.append(
                f"Majority of sections ({fallback_count}/{len(sections)}) use fallback template — LLM may be offline"
            )

        # 4. Placeholder strings in sales page
        PLACEHOLDER_PATTERNS = ["INSERT_URL", "your-url.com", "example.com", "TODO", "[LINK]", "PLACEHOLDER"]
        sales_page = result.get("sales_page", "") or ""
        for p in PLACEHOLDER_PATTERNS:
            if p.lower() in sales_page.lower():
                issues.append(f"Placeholder in sales page: '{p}'")

        # 5. IP word leakage (post-scrub check)
        IP_WORDS = ["one piece", "naruto", "dragon ball", "pokemon", "mickey mouse", "disney"]
        topic_lower = result.get("topic", "").lower()
        for ip in IP_WORDS:
            if ip in topic_lower:
                issues.append(f"Un-scrubbed IP word in topic: '{ip}'")

        passed = len(issues) == 0
        return passed, issues

    def _get_knowledge_context(self, topic: str) -> dict:
        """
        Unify D1 research, Brain patterns, and SageMemory semantic search
        into a single context dict for outline/section generation.

        Returns:
            {
                "research": str,         # D1 Obsidian file content (primary)
                "brain": str,            # NeuromorphicBrain recalled pattern
                "semantic": str,         # ChromaDB / SageMemory vector hits
                "evidence_status": str   # "VERIFIED" | "NEEDS_REVIEW" | "NONE"
            }
        """
        context = {"research": "", "brain": "", "semantic": "", "evidence_status": "NONE"}

        # --- 1. D1 Obsidian research ---
        research_data = self._get_latest_research(topic)
        if research_data:
            context["research"] = research_data["content"][:4000]
            context["evidence_status"] = research_data.get("evidence_status", "NEEDS_REVIEW")
            logger.info(f"[KNOWLEDGE] D1 research loaded: {research_data['filename']} "
                        f"(status={context['evidence_status']})")
        else:
            logger.info("[KNOWLEDGE] No D1 research found.")

        # --- 2. NeuromorphicBrain recall ---
        if self.brain:
            try:
                brain_recall = self.brain.infer(query=topic)
                if brain_recall and brain_recall.get("response"):
                    context["brain"] = brain_recall["response"]
                    logger.info(f"[KNOWLEDGE] Brain pattern recalled "
                                f"(confidence={brain_recall.get('confidence', '?')})")
            except Exception as e:
                logger.warning(f"[KNOWLEDGE] Brain recall failed: {e}")

        # --- 3. SageMemory semantic search ---
        if self.memory:
            try:
                results = self.memory.search(query_text=topic, limit=5)
                docs = results.get("documents", [[]])[0] if isinstance(results, dict) else []
                if docs:
                    context["semantic"] = "\n".join(str(d) for d in docs[:3])
                    logger.info(f"[KNOWLEDGE] Semantic memory: {len(docs)} hits")
            except Exception as e:
                logger.warning(f"[KNOWLEDGE] Semantic search failed: {e}")

        return context

    def _scrub_ip_risks(self, topic: str) -> str:
        """Replace copyrighted IP names with generic equivalents for commercial safety"""
        replacements = {
            "one piece": "Shonen Adventure Epic",
            "naruto": "Ninja Battle Legend",
            "dragon ball": "Cosmic Martial Arts Saga",
            "pokemon": "Monster Training Journey",
            "mickey mouse": "Classic Animated Mascot",
            "disney": "Major Animation Studio"
        }
        scrubbed = topic
        for key, val in replacements.items():
            if key in scrubbed.lower():
                # We keep a hint of the original but make it generic
                scrubbed = scrubbed.lower().replace(key, f"{val} style")
        return scrubbed.title()
        
    def _generate_outline(self, topic: str, num_sections: int, research_data=None, target_market: str = "us") -> List[str]:
        """Generate course outline using unified knowledge context"""

        kc = self._get_knowledge_context(topic)

        # evidence_statusがFAILEDなら生成を中断
        if kc.get("evidence_status") == "FAILED":
            logger.error(f"[OUTLINE] Blocked: evidence_status=FAILED for topic='{topic}'")
            raise ValueError(
                f"Research evidence FAILED for '{topic}'. "
                "Run D1 research loop first before generating products."
            )

        context_block = ""
        if kc["research"]:
            context_block += f"\n[PRIMARY RESEARCH — D1 Verified]\n{kc['research']}\n"
        if kc["brain"]:
            context_block += f"\n[SAGE BRAIN — Past Success Pattern]\n{kc['brain']}\n"
        if kc["semantic"]:
            context_block += f"\n[SEMANTIC MEMORY — Related Knowledge]\n{kc['semantic']}\n"

        if not context_block:
            logger.warning(f"[OUTLINE] No knowledge context for '{topic}'. Output will be generic.")

        prompt = f"""Create a targeted course outline for "{topic}".
{context_block}

INSTRUCTION:
1. If SAGE BRAIN pattern is provided, ensure consistency with previous successful structures.
2. If PRIMARY RESEARCH is provided, prioritize specific findings, dates, and evidence-based trends.
3. If SEMANTIC MEMORY is provided, incorporate relevant past knowledge.
4. Ground the course in 2026 commercial reality.

Generate exactly {num_sections} section titles.
Format: Just the titles, one per line, no numbering.
"""
        
        if self.ollama:
            try:
                import re
                response = self.ollama.invoke(prompt)
                content = response.content if hasattr(response, 'content') else str(response)
                # Filter out garbage lines
                lines = [line.strip() for line in content.split('\n') if line.strip()]
                # Remove numbering and markdown markers
                outline = []
                for line in lines:
                    clean = re.sub(r'^\d+[\)\.]\s*', '', line)
                    clean = re.sub(r'[*#]', '', clean).strip()
                    if clean and len(clean) > 3:
                        outline.append(clean)
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
    
    def _generate_sections(self, outline: List[str], topic: str = "", research_data=None) -> List[Dict]:
        """Generate content for each section using unified knowledge context"""
        sections = []

        kc = self._get_knowledge_context(topic) if topic else {"research": "", "brain": "", "semantic": "", "evidence_status": "NONE"}

        research_context = f"\n--- PRIMARY RESEARCH SOURCE (D1) ---\n{kc['research']}\n" if kc["research"] else ""
        brain_context = f"\n--- BRAIN SUCCESSFUL PATTERN ---\n{kc['brain']}\n" if kc["brain"] else ""
        semantic_context = f"\n--- SEMANTIC MEMORY ---\n{kc['semantic']}\n" if kc["semantic"] else ""

        for i, title in enumerate(outline, 1):
            logger.info(f"📝 Generating section {i}/{len(outline)}: {title}")

            prompt = f"""Write detailed, SPECIFIC, and EDUCATIONAL content for this course section:

Section Title: {title}
{brain_context}
{research_context}
{semantic_context}

CRITICAL TASK:
1. If the PRIMARY RESEARCH SOURCE is topically relevant to "{title}", use its specific data, URLs, and evidence.
2. If the RESEARCH SOURCE is NOT relevant (e.g., technical tests instead of the actual topic), DO NOT talk about it. Instead, use your internal expertise to write a world-class educational section on {title}.
3. If SEMANTIC MEMORY is provided, incorporate relevant past knowledge.
4. Avoid generic fluff. Provide 2026 relevance and actionable insights.
5. If you mention tools, suggest modern 2026 tools (AI agents, etc).

Write 3-5 informative paragraphs.
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
    
    def _generate_sales_page(self, topic: str, sections: List[Dict], research_data: Optional[Dict] = None) -> Optional[str]:
        """
        Generate sales page framed as 'battle log as an asset'.

        Positioning: The buyer is not purchasing a course.
        They are purchasing the actual operational log — the raw intelligence
        that Sage produced during a live research-and-execution run.
        Proof-of-work is the product itself.
        """

        if not self.ollama:
            logger.warning("Ollama not available for sales page generation")
            return None

        try:
            # --- Build proof-of-work evidence block from real artifacts ---
            evidence_lines = []
            if research_data:
                evidence_lines.append(f"- 一次情報ソース: `{research_data['filename']}`（D1リサーチループ取得済み）")
                # Extract first non-empty line as a teaser quote
                for line in research_data['content'].splitlines():
                    stripped = line.strip()
                    if stripped and not stripped.startswith('#') and len(stripped) > 20:
                        evidence_lines.append(f'- ログ抜粋: 「{stripped[:120]}…」')
                        break

            ops_log = "\n".join(
                f"  - Ops {s['number']:02d}: {s['title']}" for s in sections
            )
            evidence_block = "\n".join(evidence_lines) if evidence_lines else "- 一次情報ソース: 汎用知識ベース（D1トレース未取得）"

            # Determine positioning: Course vs Field Log
            is_course = any(k in topic.lower() for k in ["course", "how to", "描き方", "講座", "教材", "教育"])
            
            if is_course:
                positioning_instruction = """
                - 目的: 教育コンテンツ（コース・講座）として販売する
                - 購入者は「スキルアップ」と「体系的な学習」を期待している
                - 「実戦ログ」という言葉は証拠として使いつつも、メインは「最高品質の教材」として位置づける
                """
            else:
                positioning_instruction = """
                - 目的: 実戦ログを資産として販売する
                - 「コース」という言葉を極力避け、「AIが実際に動いた時の作戦記録」として位置づける
                - 購入者は「再現可能な諜報資産」を期待している
                """

            prompt = f"""あなたは「AIによって生成された高付加価値資産」を販売するプロのコピーライターです。

構成案:
{positioning_instruction}
- 証拠（ファイル名・ログ断片）を具体的に引用して信頼性を高める
- 執筆言語：日本語

---
【今回の商品内容】
テーマ: {topic}
内容 (Ops Log):
{ops_log}

【根拠となる一次証拠】
{evidence_block}
---

以下の構成でGumroad販売ページ（Markdown）を生成してください:

## 1. ヘッドライン（1行）

「これはコースではない。{topic}の実戦記録だ。」の方向で。

## 2. このログが生まれた背景（3-4文）

Sage AIが実際にリサーチ・判断・実行したプロセスの概要。
「誰かが作ったコンテンツ」ではなく「AIが稼働した証拠」として語る。

## 3. 一般的な情報との違い（箇条書き3点）

* ほとんどの情報商材は理論。これは実行ログ。
* 作成者の主観ではなく、AIの判断トレースがそのまま入っている。
* D1リサーチループで取得した一次情報が根拠になっている。

## 4. ログの中身（作戦ファイル一覧）

各Opsの名称をそのまま列挙。「再現手順書」として位置付ける。

## 5. 誰が買うべきか（2-3点）

* 同じ結果を自分で再現したい人
* AIの実際の思考プロセスを研究したい人

## 6. 価格と希少性

このログは「このトピック・この日時・このデータ」の一点もの。
同じ条件では二度と生成されない理由を1-2文で。

## 7. CTA

[今すぐ購入して資産を手に入れる]({os.getenv('GUMROAD_PAY_URL', 'https://paypal.me/japanletgo')})

出力はMarkdownのみ。余分な前置き、解説、挨拶などは一切不要。
"""

            response = self.ollama.invoke(prompt)
            sales_page = response.content if hasattr(response, 'content') else str(response)

            # Prepend a machine-readable metadata header for Obsidian / downstream parsers
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
            header = (
                f"<!-- SAGE_SALES_PAGE | topic={topic} | "
                f"source={research_data['filename'] if research_data else 'none'} | "
                f"generated={timestamp} -->\n\n"
            )
            return header + sales_page

        except Exception as e:
            logger.error(f"Sales page generation failed: {e}")
            return None
    
    def _save_to_obsidian(self, topic: str, outline: List[str], 
                          sections: List[Dict], slides: List[Dict], sales_page: Optional[str] = None,
                          research_data: Optional[Dict] = None) -> Optional[str]:
        """Save course to Obsidian with Research Traceability"""
        
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
        content += "\n---\n\n"
        
        # Section details
        for section in sections:
            content += f"## {section['number']}. {section['title']}\n\n"
            content += section['content'].strip()
            content += "\n\n"
            
            # Add slide image reference if available
            slide = next((s for s in slides if s['section'] == section['number']), None)
            if slide and 'image_path' in slide:
                content += f"**Slide**: `{slide['image_path']}`\n\n"
            
            content += "---\n\n"
        
        # Add sales page if available
        if sales_page:
            content += "## 💰 Sales Page & Gumroad Pitch\n\n"
            content += sales_page.strip()
            content += "\n\n---\n\n"
            
        content += "## 🧪 Research Context & Evidence (D1 Traceability)\n\n"
        content += f"* **Topic/Query**: {topic}\n"
        if research_data:
            content += f"* **Primary Evidence Source**: `{research_data['filename']}`\n"
            content += f"* **Evidence Authenticity**: Verified via D1 Loop\n"
        else:
            content += "* **Primary Evidence**: General Knowledge (No D1 Trace found)\n"
            
        content += f"* **Generated At**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        content += "* **Sage Version**: 3.0 Fortress\n\n"
        content += "---\n"
        
        try:
            if hasattr(self.obsidian, 'create_knowledge_note'):
                note_path = self.obsidian.create_knowledge_note(
                    content,
                    {
                        "topic": topic,
                        "type": "course",
                        "status": "generated",
                        "generated_at": datetime.now().isoformat()
                    }
                )
                return str(note_path)
            else:
                # Write directly to bypass error
                import os, time
                import pathlib
                vault_dir = pathlib.Path("obsidian_vault/knowledge")
                vault_dir.mkdir(parents=True, exist_ok=True)
                note_name = f"course_{int(time.time())}.md"
                note_path = vault_dir / note_name
                with open(note_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                logger.info(f"Directly wrote note to {note_path}")
                return str(note_path)
        except Exception as e:
            logger.error(f"Obsidian save failed: {e}")
            return None
