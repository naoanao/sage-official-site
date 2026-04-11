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
import time
from typing import Dict, List, Optional
import os
import json
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
    
    def __init__(self, ollama_client=None, image_agent=None, obsidian=None, gumroad_generator=None, fish_audio=None, brain=None, groq_client=None, memory=None, gemini_client=None, **kwargs):
        """
        Initialize with existing components

        Args:
            ollama_client: Primary LLM client (Groq/Ollama via orchestrator)
            image_agent: ImageAgent instance
            obsidian: ObsidianConnector instance
            gumroad_generator: GumroadPageGenerator instance
            fish_audio: FishAudioIntegration instance
            brain: NeuromorphicBrain instance
            groq_client: Groq LLM client (direct)
            gemini_client: Gemini LLM client (fallback when Groq 429)
            memory: SageMemory instance for semantic search and storage
        """
        self.ollama = ollama_client
        self.image_agent = image_agent
        self.obsidian = obsidian
        self.gumroad = gumroad_generator
        self.fish_audio = fish_audio
        self.brain = brain
        self.groq_client = groq_client
        self.gemini_client = gemini_client
        self.memory = memory
        self.identity = self._load_identity()
        logger.info(f"CourseProductionPipeline initialized with identity: {self.identity.get('role', 'Expert')}")

    def _invoke_llm(self, prompt: str) -> str:
        """Call primary LLM (Groq) with 429 retry, fall back to Gemini, then Ollama (local)."""
        _rate_limit_keywords = ("429", "rate_limit", "rate limit", "quota", "too many requests")

        # Tier 1: Groq (self.ollama = Groq LangChain client, legacy naming)
        if self.ollama:
            for attempt in range(2):
                try:
                    response = self.ollama.invoke(prompt)
                    content = response.content if hasattr(response, 'content') else str(response)
                    if content and content.strip():
                        return content
                    logger.warning(f"Primary LLM returned empty (attempt {attempt + 1})")
                except Exception as e:
                    err = str(e).lower()
                    is_rate_limit = any(k in err for k in _rate_limit_keywords)
                    if is_rate_limit and attempt == 0:
                        logger.warning("Groq TPM/quota limit — waiting 5s then retrying once")
                        time.sleep(5)
                        continue
                    logger.warning(f"Primary LLM failed (attempt {attempt + 1}): {e}")
                    break

        # Tier 2: Gemini
        if self.gemini_client:
            try:
                response = self.gemini_client.invoke(prompt)
                content = response.content if hasattr(response, 'content') else str(response)
                if content and content.strip():
                    logger.info("Gemini fallback LLM succeeded")
                    return content
            except Exception as e2:
                logger.warning(f"Gemini fallback also failed: {e2}")

        # Tier 3: Ollama (local, direct REST — 5s connect, 180s read max)
        # Truncate long prompts to 3000 chars so CPU inference stays within timeout
        try:
            import requests as _req, os as _os
            _ollama_url = f"{_os.getenv('OLLAMA_HOST', 'http://localhost:11434')}/api/chat"
            _ollama_prompt = prompt[:3000] if len(prompt) > 3000 else prompt
            _resp = _req.post(
                _ollama_url,
                json={
                    "model": "llama3",
                    "messages": [{"role": "user", "content": _ollama_prompt}],
                    "stream": False,
                    "options": {"num_ctx": 2048, "temperature": 0.3, "num_predict": 1500},
                },
                timeout=(5, 180),
            )
            if _resp.status_code == 200:
                result = _resp.json().get("message", {}).get("content", "")
                if result and result.strip():
                    logger.info("Ollama Tier-3 local fallback succeeded")
                    return result
        except Exception as e3:
            logger.warning(f"Ollama Tier-3 fallback also failed: {e3}")

        return ""
    
    def _load_identity(self) -> Dict:
        """Load character settings from backend/config/identity.json."""
        try:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'identity.json')
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load identity.json: {e}")
        return {
            "role": "Expert AI Agent",
            "niche": "Knowledge Automation",
            "tone": "Professional and Practical",
            "brand_name": "Sage AI"
        }

    def _get_identity_context(self) -> str:
        """Format identity into a prompt instruction."""
        role = self.identity.get('role', 'Expert')
        niche = self.identity.get('niche', 'Professional knowledge')
        tone = self.identity.get('tone', 'Helpful')
        brand = self.identity.get('brand_name', 'Sage AI')
        return (
            f"\n[AI IDENTITY]\n"
            f"You are {brand}, an {role} specializing in {niche}. "
            f"Your voice is {tone}. Write all content from this perspective."
        )

    def generate_course(self, topic: str, num_sections: int = 3, generate_narration: bool = False, reference_audio: str = None, language: str = 'auto', progress_callback=None, **kwargs) -> Dict:
        """
        Generate complete course

        Args:
            topic: Course topic
            num_sections: Number of sections (default: 5)
            language: 'auto' (detect from topic chars) | 'ja' | 'en'

        Returns:
            Dictionary with generation results
        """
        # Resolve language: auto-detect from topic characters
        if language == 'auto':
            language = 'ja' if any(ord(c) > 0x3000 for c in topic) else 'en'
        logger.info(f"🌐 Language resolved: {language}")

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
            
            def _cb(pct, label):
                if progress_callback:
                    try:
                        progress_callback(pct, label)
                    except Exception:
                        pass

            # Step 1: Generate outline
            _cb(15, '📋 Generating outline...')
            outline = self._generate_outline(safe_topic, num_sections, research_data, language=language)
            logger.info(f"✅ Outline generated: {len(outline)} sections")
            _cb(22, '✍️ Writing section content...')

            # Step 2: Generate section content
            sections = self._generate_sections(outline, safe_topic, language=language)
            logger.info(f"✅ Content generated: {len(sections)} sections")
            _cb(55, '🖼️ Processing visual assets...')

            # Step 3: Generate slide images
            slides = self._generate_slides(sections, topic=safe_topic)
            logger.info(f"✅ Slides generated: {len(slides)} images")

            # Step 3b: Generate image prompts and actual images
            target_market = kwargs.get('target_market', 'us')
            output_dir = self._get_output_dir(safe_topic)

            # Generate prompts and try to generate images
            image_results = self._generate_section_images(
                sections=sections,
                topic=safe_topic,
                target_market=target_market
            )

            # Save image prompts to a file for the purchaser
            self._write_image_prompts_file(image_results, output_dir)
            logger.info(f"✅ Visual assets processed: {len(image_results)} items")
            _cb(68, '💰 Building sales page...')

            # Step 4: Generate sales page
            sales_page = self._generate_sales_page(safe_topic, sections, research_data, language=language)
            if sales_page:
                logger.info(f"✅ Sales page generated ({len(sales_page)} chars)")
            else:
                logger.warning("⚠️ Sales page generation returned None — using fallback template")
                section_titles = "\n".join(f"- {s['title']}" for s in sections)
                if language == "ja":
                    sales_page = (
                        f"# {safe_topic} — 完全ガイド\n\n"
                        f"## このガイドで学べること\n\n{section_titles}\n\n"
                        f"## こんな人におすすめ\n\n"
                        f"- {safe_topic}を体系的に学びたい方\n"
                        f"- 実践的なノウハウを身につけたい方\n"
                        f"- 成果を出すための具体的な手順を知りたい方\n\n"
                        f"## 価格・購入\n\n"
                        f"このガイドは現在販売準備中です。詳細は近日公開予定です。\n"
                    )
                else:
                    sales_page = (
                        f"# {safe_topic} — Complete Guide\n\n"
                        f"## What You'll Learn\n\n{section_titles}\n\n"
                        f"## Who This Is For\n\n"
                        f"- Anyone who wants to master {safe_topic} systematically\n"
                        f"- People looking for practical, actionable knowledge\n"
                        f"- Those who want specific steps to get results fast\n\n"
                        f"## Pricing\n\n"
                        f"This guide is currently in preparation. Details coming soon.\n"
                    )
            
            _cb(78, '💾 Saving data...')
            # Step 5: Save to Obsidian
            note_path = self._save_to_obsidian(safe_topic, outline, sections, slides, sales_page, research_data)
            logger.info(f"✅ Saved to Obsidian: {note_path}")
            _cb(84, '📝 Generating blog post...')

            # Step 6: Generate blog post (SEO article from course content)
            blog_post = self._generate_blog_post(safe_topic, sections, language=language)
            if blog_post:
                logger.info(f"✅ Blog post generated ({len(blog_post)} chars)")
            _cb(92, '🎁 Creating product extras...')

            # Step 7: Generate product package extras (bonus stack, product hook, launch checklist)
            product_extras = self._generate_product_extras(safe_topic, sections, language=language)
            logger.info(f"✅ Product extras generated")
            _cb(97, '🔍 Quality check...')

            result = {
                "status": "success",
                "topic": topic,
                "outline": outline,
                "sections": sections,
                "slides": slides,
                "images": image_results,
                "sales_page": sales_page,
                "blog_post": blog_post,
                "research_source": research_data['filename'] if research_data else None,
                "obsidian_note": str(note_path),
                "bonus_stack": product_extras.get("bonus_stack", []),
                "product_hook": product_extras.get("product_hook", ""),
                "launch_checklist": product_extras.get("launch_checklist", []),
                "sns_captions": _build_sns_captions(topic, sections, sales_page or ""),
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

            # NotionLogger: コース生成完了を記録
            try:
                from backend.integrations.notion_logger import notion_logger
                image_urls = [
                    v.get("url") for v in image_results.values()
                    if isinstance(v, dict) and v.get("url")
                ]
                notion_logger.log_course_generation(
                    topic=safe_topic,
                    sections_count=len(sections),
                    image_urls=image_urls,
                    sales_page_len=len(sales_page) if sales_page else 0,
                    has_bonus="48-Hour" in (sales_page or "") or "48時間" in (sales_page or ""),
                )
            except Exception as _nle:
                logger.warning(f"[NOTION_LOG] Course log failed (non-critical): {_nle}")

            return result

        except Exception as e:
            logger.error(f"❌ Course generation failed: {e}", exc_info=True)
            try:
                from backend.integrations.notion_logger import notion_logger
                notion_logger.log_error(f"course generation: {topic}", str(e))
            except Exception:
                pass
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
            
            # Match topic keywords — min length 4 to avoid stop-words like "for","in","the"
            _stop = {"and","for","the","with","from","that","this","are","its","per"}
            keywords = [k.lower() for k in topic.split() if len(k) >= 4 and k.lower() not in _stop]
            if not keywords: keywords = [topic.lower()]

            # UFO/cross-topic contamination markers for research file guard
            _ufo_markers = [
                "roswell", "ロズウェル", "disclosure", "uap", " ufo", "grusch",
                "trump", "大統領令", "内部告発", "極秘", "classified", "whistleblower",
                "top secret", "insider", "リーク", "暴露", "機密", "intelligence report",
                "pentagon confirmed", "breaking:", "[breaking]",
            ]
            ufo_topic = any(kw in topic.lower() for kw in ["ufo", "uap", "alien", "宇宙人", "未確認", "disclosure"])

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

                    # Cross-topic UFO guard: skip UFO research files for non-UFO topics
                    content_head = content.lower()[:3000]
                    ufo_in_file = any(m in content_head for m in _ufo_markers)
                    if ufo_in_file and not ufo_topic:
                        logger.warning(f"[GUARD] UFO research file blocked for non-UFO topic '{topic}': {latest_file.name}")
                        MonetizationMeasure.log_event("contamination_blocked", {"file": latest_file.name, "reason": "ufo_cross_topic"})
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
                    brain_text = brain_recall["response"]
                    # Guard: skip brain context if it contains UFO-specific references
                    # but the current topic is NOT UFO-related (cross-topic contamination)
                    ufo_markers = [
                        "roswell", "ロズウェル", "disclosure", "uap", "ufo", "grusch", "nuccetelli",
                        "trump", "大統領令", "内部告発", "極秘", "classified", "whistleblower",
                        "top secret", "insider", "leak", "リーク", "暴露", "機密",
                    ]
                    ufo_in_brain = any(m in brain_text.lower() for m in ufo_markers)
                    ufo_topic = any(kw in topic.lower() for kw in ["ufo", "uap", "alien", "宇宙人", "未確認", "disclosure"])
                    if ufo_in_brain and not ufo_topic:
                        logger.warning(f"[KNOWLEDGE] Brain recall contains UFO content but topic='{topic}' is not UFO — skipping to prevent contamination")
                    else:
                        context["brain"] = brain_text
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
        
    def _generate_outline(self, topic: str, num_sections: int, research_data=None, target_market: str = "us", language: str = "en") -> List[str]:
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

        lang_instruction = "\n## OUTPUT LANGUAGE\n日本語でセクションタイトルを書いてください。" if language == "ja" else ""

        # Topic-specific structure hints
        structure_hint = ""
        topic_lower = topic.lower()
        if any(kw in topic_lower for kw in ["ufo", "uap", "alien", "extraterrestrial", "disclosure", "宇宙人", "未確認"]):
            structure_hint = """
## CRITICAL STRUCTURE FOR UFO/UAP CONTENT (English Market Best-Sellers Pattern):
Use this proven structure that top-selling UFO products on Amazon/Gumroad follow:

1. "What's Been Officially Confirmed" — Facts only (Pentagon admissions, AARO reports, Congressional testimony) — builds credibility. NO speculation.
2. "The Timeline They Don't Show You" — Key events from 1947 Roswell → 2026 Trump disclosure order — narrative hook. Ensure the reader understands the sequence of events.
3. "The Witnesses: Names, Ranks, and What They Saw" — Jeffrey Nuccetelli (Air Force), David Grusch (Intelligence), Karl Nell (Army/Northrop) with specific quotes, dates, and locations.
4. "Why Now: The Political and Economic Forces Behind Disclosure" — Defense budget ($900B/yr), "The Age of Disclosure" film breaking Amazon records = mainstream shift.
5. "Your Action Plan: How to Stay Ahead of This Story" — Where to watch congressional hearings, government databases (AARO.mil), communities, how to monetize knowledge.

Adapt section titles to match the topic language and tone.
"""
        elif any(kw in topic_lower for kw in ["釣り", "fishing", "angling"]):
            structure_hint = """
## STRUCTURE HINT FOR FISHING CONTENT:
1. 場所・時間・条件の選び方 (When/Where/Conditions)
2. 必要な道具と準備 (Gear & Preparation)
3. 実際の釣り方・テクニック (Techniques)
4. よくある失敗とその回避法 (Common Mistakes)
5. 上達のための次のステップ (Next Steps)
"""

        prompt = f"""Create a targeted course outline for "{topic}".
{context_block}
{structure_hint}
INSTRUCTION:
1. ALL {num_sections} section titles MUST be directly and specifically about "{topic}".
   - Do NOT apply narrative structures, dates, names, or events from unrelated topics.
   - SAGE BRAIN patterns are for STRUCTURAL INSPIRATION only — replace any topic-specific details with "{topic}" equivalents.
2. If PRIMARY RESEARCH is provided, prioritize specific findings, dates, and evidence-based trends about "{topic}".
3. If SEMANTIC MEMORY is provided, incorporate only knowledge directly relevant to "{topic}".
4. Ground the course in 2026 commercial reality.
{lang_instruction}
Generate exactly {num_sections} section titles.
Format: Just the titles, one per line, no numbering.
"""
        
        import re
        content = self._invoke_llm(prompt)
        if content:
            try:
                # Filter out garbage lines
                lines = [line.strip() for line in content.split('\n') if line.strip()]
                # Remove numbering and markdown markers
                outline = []
                for line in lines:
                    clean = re.sub(r'^\d+[\)\.]\s*', '', line)
                    clean = re.sub(r'[*#]', '', clean).strip()
                    if clean and len(clean) > 3:
                        outline.append(clean)
                # Apply TitleOptimizer to strengthen section titles
                try:
                    from backend.modules.title_optimizer import TitleOptimizer
                    optimizer = TitleOptimizer(topic=topic, language=language)
                    outline = optimizer.optimize_outline(outline[:num_sections])
                except Exception as _te:
                    logger.warning(f"TitleOptimizer skipped: {_te}")
                    outline = outline[:num_sections]
                return outline
            except Exception as e:
                logger.warning(f"Outline parse failed: {e}, using fallback")

        # Fallback outline
        return [
            f"{topic}: Introduction",
            f"{topic}: Core Concepts",
            f"{topic}: Practical Guide",
            f"{topic}: Advanced Topics",
            f"{topic}: Summary and Next Steps"
        ][:num_sections]
    
    def _generate_sections(self, outline: List[str], topic: str = "", research_data=None, language: str = "en") -> List[Dict]:
        """Generate content for each section using unified knowledge context"""
        sections = []

        kc = self._get_knowledge_context(topic) if topic else {"research": "", "brain": "", "semantic": "", "evidence_status": "NONE"}

        research_context = f"\n--- PRIMARY RESEARCH SOURCE (D1) ---\n{kc['research']}\n" if kc["research"] else ""
        brain_context = f"\n--- BRAIN SUCCESSFUL PATTERN ---\n{kc['brain']}\n" if kc["brain"] else ""
        semantic_context = f"\n--- SEMANTIC MEMORY ---\n{kc['semantic']}\n" if kc["semantic"] else ""
        identity_context = self._get_identity_context()

        if language == "ja":
            lang_instruction = (
                "\n6. 日本語で本文を書いてください（Write all content in Japanese）。"
                "\n7. 文体: 購入者が「買ってよかった」と思える実践的な内容にする。"
                "\n   - 「〜かもしれません」「〜と言われています」などの曖昧表現を避ける"
                "\n   - 具体的な数字・事例・地名・人物名・期間を積極的に使う"
                "\n   - 理論より手順を優先する（「まず〇〇、次に〇〇」形式）"
                "\n8. 【統計・数値ルール（厳守）】"
                "\n   - PRIMARY RESEARCH SOURCE (D1) に数値がある場合のみ、その数値を引用する"
                "\n   - D1にデータがない場合: 具体的な数値を作造しないこと"
                "\n     NG例: 「約70%のユーザーが〜」「75%が〜と回答」（根拠なし）"
                "\n     OK例: 「多くの実践者が報告している」「研究でも確認されている傾向だ」"
                "\n   - 数値を使う場合: 総務省・厚生労働省・MMD研究所・矢野経済研究所等の"
                "\n     実在する日本の調査機関名を付けるか、D1の一次ソースを引用すること"
                "\n9. 【差別化ルール】このセクションには以下を必ず1箇所以上含める:"
                "\n   - 一般のnote/Qiita無料記事にはない「AIリサーチで発見した実践的フレームワーク」"
                "\n   - 「なぜこの手順なのか」という因果関係の説明（理由のない手順は差別化にならない）"
                "\n   - 読者が「これは自分では調べられなかった」と感じる具体的な実例・ツール名・数値"
            )
            section_structure = """## REQUIRED STRUCTURE:
**導入（2-3文）**: このセクション固有の「読者が今まさに直面している課題」を具体的に述べる。汎用的な「重要です」は禁止。
**メインコンテンツ**: 具体的なデータ・日本の事例・実行可能な方法を含む3-4段落。架空ではなく現実的な例を使う。
**今すぐできること**:
1. [具体的なAction] — 所要時間: X分 — 成功の目安: [measurable outcome]
2. [具体的なAction] — 所要時間: X分 — 成功の目安: [measurable outcome]
3. [具体的なAction] — 所要時間: X分 — 成功の目安: [measurable outcome]
**よくある失敗と対策**:
- 失敗1: [日本の文脈に合った具体的なmistake] → 対策: [具体的なfix]
- 失敗2: [日本の文脈に合った具体的なmistake] → 対策: [具体的なfix]"""
        else:
            lang_instruction = (
                "\n6. Write all content in English. Use English section headers only."
                "\n7. TONE: Write like a smart, direct mentor — conversational, not academic."
                "\n   - Use contractions (you're, it's, don't, here's)"
                "\n   - Replace 'Furthermore/Moreover/In addition' with 'And here's the thing / And get this / Plus'"
                "\n   - No passive voice. No corporate-speak."
                "\n   - Max 1 formal citation per paragraph (e.g., '1.3B tons wasted annually' — no 'According to the 2019 UN report...' preamble)"
            )
            section_structure = """## REQUIRED STRUCTURE:
**Introduction (2-3 sentences)**: Hook with a specific pain point or surprising fact — no "In this section we will cover..." openers.
**Core Content**: 3-4 paragraphs. Mix short punchy sentences with medium ones. Data comes with context, not as a list of citations.
**Take Action Now**:
1. [Action] — Time required: X minutes
2. [Action] — Time required: X minutes
3. [Action] — Time required: X minutes
**Common Mistakes**:
- Mistake 1: [specific mistake] → Fix: [specific fix]
- Mistake 2: [specific mistake] → Fix: [specific fix]"""

        # Static banned openers that sound identical across sections
        if language == "ja":
            STATIC_FORBIDDEN = [
                "このセクションを読み終えると",
                "このセクションでは",
                "このセクションを終えると",
                "このセクションが終わると",
                "このセクションの終わりには",
                "このセクションを読むと",
                "はじめに",
            ]
        else:
            STATIC_FORBIDDEN = [
                "By the end of this section",
                "In this section",
                "This section will",
                "This section covers",
                "Welcome to",
                "In this chapter",
            ]

        prompts = []
        for i, title in enumerate(outline, 1):
            # Section-position-aware opening rule
            if i == 1:
                if language == "ja":
                    opening_rule = (
                        f'0. 冒頭（第1セクション）: 「このセクションを読み終えると、[具体的な達成事項]ができるようになります」'
                        f'という一文で始めてください。「わかる」「理解できる」は禁止。「できる」「作れる」「稼げる」など行動動詞を使う。'
                    )
                else:
                    opening_rule = (
                        '0. OPENER (section 1): Start with "By the end of this section, you will [one specific, measurable outcome]." '
                        'Make the outcome concrete and verifiable — not vague like "understand" or "learn about".'
                    )
            else:
                if language == "ja":
                    opening_rule = (
                        f'0. 冒頭フック（第{i}セクション / 全{len(outline)}セクション）: '
                        f'「このセクションでは〜」「はじめに〜」は前のセクションで使用済みなので禁止。'
                        f'代わりに以下のどれかで始めてください:\n'
                        f'   a) このテーマに関する驚くべき数字・事実（例: 「日本の〇〇利用者の87%が〜」）\n'
                        f'   b) 場面設定（「あなたが今〇〇の状況にいるとします...」）\n'
                        f'   c) 常識を覆す主張（「多くの人は〜と思っているが、実は逆です」）\n'
                        f'   d) 緊急性を生む具体的な金額・期間（「この1つの判断で月〇万円の差が出ます」）\n'
                        f'   2〜3文目で「このセクションを読むと〇〇ができる」という達成事項を入れてください。'
                    )
                else:
                    opening_rule = (
                        f'0. UNIQUE OPENER (section {i} of {len(outline)}): '
                        'Do NOT open with "By the end of this section" or "In this section" — '
                        'those were used earlier. Instead open with ONE of:\n'
                        '   a) A surprising statistic or counter-intuitive fact specific to this section topic\n'
                        '   b) A vivid scenario: "Imagine you just [specific situation]..."\n'
                        '   c) A provocative question that challenges a common assumption\n'
                        '   d) A specific dollar amount, percentage, or time-frame that creates urgency\n'
                        '   Then in sentences 2-3, state the outcome: what the reader will be able to DO by the end.'
                    )

            forbidden_hint = (
                "\n\nCRITICAL — FORBIDDEN OPENING PHRASES (never start with these):\n"
                + "\n".join(f'- "{p}"' for p in STATIC_FORBIDDEN)
                + "\nEach section must open with a DISTINCT hook. Readers see all sections — identical openers kill engagement."
            )

            prompts.append(f"""You are writing one section of a high-converting digital course. The reader paid money for this — give them immediately usable, specific knowledge that justifies the purchase.
{identity_context}

COURSE TOPIC: {topic}
SECTION {i} of {len(outline)}: {title}
{brain_context}
{research_context}
{semantic_context}

## CONTENT RULES (strictly enforced)

### What TO include:
{opening_rule}
1. RESEARCH MATCH: If PRIMARY RESEARCH covers "{title}", cite specific data, dates, and place names from it directly.
   If research is off-topic, ignore it and use your own expertise.
2. REAL NUMBERS: Include at least 2 specific data points (percentages, times, prices, distances, counts).
3. ACTIONABLE STEPS: A numbered action list (3-5 items), each with estimated time required.
4. COMMON MISTAKES: List 2-3 mistakes beginners make and how to avoid them.
5. QUICK WIN: One thing the reader can do in under 10 minutes to see immediate progress.
6. SPECIFIC EXAMPLES: Name at least one real tool (e.g. Notion, Airtable, ChatGPT, Canva), a real company, or a specific dollar amount. Generic advice without concrete names/numbers is rejected.
7. SECTION IDENTITY: This section must be clearly distinct from the others. The opening paragraph must NOT be paraphraseable as "here is an introduction to {title}."

### What NOT to include:
- Generic statements like "important", "essential", "you should know..."
- Filler paragraphs without specific information
- Theoretical content without practical application{lang_instruction}{forbidden_hint}

{section_structure}

Content:""")

        # Parallel generation — English uses 1 worker to avoid Groq TPM rate limits
        # (English prompts are longer → hit rate limits faster when parallel)
        from concurrent.futures import ThreadPoolExecutor, as_completed
        results = [None] * len(outline)
        _workers = 1 if language == "en" else 3

        def _gen(idx_prompt):
            idx, prompt = idx_prompt
            # Inter-section cooldown for English: allow Groq TPM (rolling 60s window) to recover.
            # Section 1 often exhausts ~50% of TPM; waiting 20s before sections 2+ lets the
            # window recover enough for the next request to succeed on the first attempt.
            if idx > 0 and language == "en":
                logger.info(f"⏳ English TPM cooldown: waiting 20s before section {idx+1}")
                time.sleep(20)
            logger.info(f"📝 Generating section {idx+1}/{len(outline)}: {outline[idx]}")
            content = self._invoke_llm(prompt)
            # Retry if content is too short (LLM truncated or rate-limited)
            if content and len(content) < 300:
                logger.warning(f"⚠️ Section {idx+1} too short ({len(content)} chars), retrying with length hint")
                retry_prompt = prompt + "\n\n[IMPORTANT: The response must be at minimum 600 characters. Be detailed and comprehensive. Do not truncate.]"
                retry_content = self._invoke_llm(retry_prompt)
                if retry_content and len(retry_content) > len(content):
                    content = retry_content
            if not content:
                title = outline[idx]
                if language == "en":
                    content = (
                        f"## {title}\n\n"
                        f"By the end of this section, you will have 3 actionable steps to apply {title} immediately.\n\n"
                        f"Most people spend 80% of their time on the wrong 20% of {title}. Here's the fix: focus on what moves the needle in under 30 minutes.\n\n"
                        f"**Take Action Now**:\n"
                        f"1. Step 1: Audit your current approach — Time required: 10 minutes\n"
                        f"2. Step 2: Identify the 1 bottleneck blocking progress — Time required: 15 minutes\n"
                        f"3. Step 3: Implement the fix and measure results — Time required: 20 minutes\n\n"
                        f"**Common Mistakes**:\n"
                        f"- Mistake 1: Skipping the audit step → Fix: Always start with a 10-minute review\n"
                        f"- Mistake 2: Trying to fix everything at once → Fix: Focus on 1 bottleneck at a time"
                    )
                else:
                    content = f"**{title}**\n\nこのセクションでは{title}の重要なポイントを解説します。実践的な例と行動ステップを参考にしてください。"
            return idx, self._reduce_data_overload(content, language)

        with ThreadPoolExecutor(max_workers=_workers) as pool:
            futures = {pool.submit(_gen, (i, p)): i for i, p in enumerate(prompts)}
            for future in as_completed(futures):
                idx, content = future.result()
                results[idx] = {"number": idx + 1, "title": outline[idx], "content": content}

        sections = [r for r in results if r is not None]
        return sections

    @staticmethod
    def _reduce_data_overload(content: str, language: str = "en") -> str:
        """Limit formal citation phrases to max 2 per paragraph to avoid stat-dump fatigue."""
        import re as _re
        if language == "ja":
            # 「XXXX年の〇〇調査によると」「XXXX年、〇〇省が」などの書き出しパターン
            stat_pattern = _re.compile(r'\d{4}年[のにの]?[^\s]{0,10}(調査|研究|報告|統計|データ|省|庁|機関|大学)[^\s。]*[によると、：:は]?')
        else:
            # "According to a 2019 X report" / "A 2020 study by X shows" / "In 2018, X found"
            stat_pattern = _re.compile(
                r'(According to (a |the )?\d{4}[^\.]{0,70}[,\.]|'
                r'[Aa] \d{4} [^\.]{0,20}(study|survey|report|analysis|research)[^\.]{0,60}[,\.]|'
                r'In \d{4}[^\.]{0,50}(found|showed|revealed|reported|published)[^\.]{0,60}[,\.])',
                _re.IGNORECASE
            )

        paragraphs = content.split('\n\n')
        cleaned = []
        for para in paragraphs:
            matches = stat_pattern.findall(para)
            # findall returns tuples for groups — count unique full match positions
            all_spans = list(stat_pattern.finditer(para))
            if len(all_spans) > 2:
                # Keep first 2, remove the rest
                for m in reversed(all_spans[2:]):
                    para = para[:m.start()] + para[m.end():]
            cleaned.append(para)
        return '\n\n'.join(cleaned)
    
    def _generate_slides(self, sections: List[Dict], topic: str = "") -> List[Dict]:
        """Generate slide images using image_gen_enhanced (HF Flux → Gemini → LoremFlickr)"""
        from backend.integrations.image_generation import image_gen_enhanced
        slides = []
        topic_kw = self._get_topic_visual_keywords(topic) if topic else None

        for i, section in enumerate(sections):
            logger.info(f"🖼️  Generating slide {section['number']}: {section['title']}")

            # Per-section keywords: more specific than topic-level fallback
            section_kw = self._get_section_visual_keywords(section['title'], topic_kw)
            # Seed prompt: include topic so same section titles across different topics get distinct images
            prompt = f"{topic} | {section['title']} — slide {i + 1}"

            try:
                url = image_gen_enhanced.generate_social_media_image(
                    prompt, platform="twitter", topic_keywords=section_kw, section_index=i
                )
                slides.append({
                    "section": section['number'],
                    "title": section['title'],
                    "image_url": url,
                    "image_path": None
                })
                logger.info(f"[SLIDE] Generated: {section['title'][:40]} → {url[:60] if url else 'None'}")
            except Exception as e:
                logger.warning(f"[SLIDE] Generation failed ({e}), skipping")
                slides.append({
                    "section": section['number'],
                    "title": section['title'],
                    "status": "image_generation_skipped"
                })

        return slides
    
    # ──────────────────────────────────────────────────────────────────────────
    # IMAGE PROMPT GENERATION (works without image_agent — always produces prompts)
    # ──────────────────────────────────────────────────────────────────────────

    def _get_topic_visual_keywords(self, topic: str) -> str:
        """Return LoremFlickr-friendly English keywords based on topic category."""
        t = topic.lower()
        if any(k in t for k in ["npo","ngo","nonprofit","非営利","ボランティア","社会貢献","チャリティ","charity","volunteer","community","コミュニティ","市民","civic"]):
            return "volunteer community nonprofit charity teamwork"
        # Publishing / e-book / Kindle — check BEFORE generic "money" to get relevant images
        if any(k in t for k in ["kindle","kdp","出版","ebook","e-book","電子書籍","著作","ロイヤルティ","royalty","publish","publishing","amazon publish","book","writing","author","著者","執筆","manuscript","原稿"]):
            return "book publishing author writing kindle ebook"
        if any(k in t for k in ["コンテンツ","content marketing","sns","ソーシャルメディア","ブログ","blog","youtube","インフルエンサー","influencer","マーケティング","marketing","creator","クリエイター"]):
            return "content creator media digital marketing"
        if any(k in t for k in ["japan","japanese","日本","tokyo","osaka","kyoto","和","日本語","nippon"]):
            return "japan tokyo society culture community"
        if any(k in t for k in ["money","finance","invest","revenue","profit","income","sales","business","startup","entrepreneur","お金","投資","収益","マネー","利益","資産","売上","稼"]):
            return "money finance business success wealth"
        if any(k in t for k in ["health","cbd","wellness","supplement","diet","yoga","meditation","fitness","exercise","gym","weight","muscle","protein","健康","サプリ","ダイエット","筋肉","ヨガ"]):
            return "health wellness nature lifestyle green"
        # AI/Tech — sub-categories for more relevant images
        if any(k in t for k in ["robot","ロボット","humanoid","autonomous car","自動運転","drone","ドローン"]):
            return "robot technology futuristic machine automation"
        if any(k in t for k in ["social media","ソーシャルメディア","instagram","tiktok","twitter","x.com","facebook","viral","viral content","バイラル"]):
            return "social media smartphone screen influencer viral"
        if any(k in t for k in ["monetize","monetization","収益化","passive income","passive","副業","side hustle","make money","稼ぐ"]):
            return "money laptop entrepreneur business success"
        if any(k in t for k in ["automation","自動化","workflow","automate","bot","rpa","zapier","make.com","自動"]):
            return "automation workflow office screen dashboard"
        if any(k in t for k in ["generative ai","generate","generation","生成ai","生成","image generation","midjourney","stable diffusion","llm","chatgpt","gpt","claude","openai"]):
            return "artificial intelligence screen data futuristic"
        if any(k in t for k in ["data","analytics","analysis","dashboard","chart","graph","統計","データ分析","ビッグデータ","big data"]):
            return "data analytics chart graph statistics"
        if any(k in t for k in ["programming","code","software","developer","engineering","コーディング","プログラミング","開発","エンジニア"]):
            return "programming code laptop developer screen"
        if any(k in t for k in ["ai","artificial intelligence","machine learning","deep learning","neural","人工知能","テクノロジー","tech","computer","digital"]):
            return "artificial intelligence technology innovation future"
        if any(k in t for k in ["real estate","property","house","apartment","rent","mortgage","不動産","物件","マンション","住宅"]):
            return "architecture building home urban modern"
        if any(k in t for k in ["travel","trip","vacation","journey","adventure","旅行","観光","旅"]):
            return "travel adventure landscape nature tourism"
        if any(k in t for k in ["food","cooking","recipe","restaurant","cuisine","料理","食","グルメ","レシピ"]):
            return "food cooking recipe kitchen cuisine"
        if any(k in t for k in ["beauty","fashion","makeup","skincare","cosmetic","美容","ファッション","スキンケア"]):
            return "beauty fashion lifestyle cosmetic elegant"
        if any(k in t for k in ["learn","study","course","teach","education","skill","training","学習","スキル","教育","学ぶ"]):
            return "education study books knowledge learning"
        if any(k in t for k in ["environment","eco","green","climate","sustainable","環境","エコ","サステナ","地球","自然","森"]):
            return "nature environment green sustainable outdoor"
        if any(k in t for k in ["mental","mindset","psychology","stress","anxiety","well-being","メンタル","心理","ストレス","マインド","瞑想"]):
            return "mindfulness wellness calm peaceful meditation"
        return "people working team collaboration success"

    def _get_section_visual_keywords(self, section_title: str, topic_kw: str) -> str:
        """Derive per-section LoremFlickr keywords from section title, falling back to topic_kw."""
        t = section_title.lower()
        # Section-level keyword map: title pattern → LoremFlickr keywords
        _section_map = [
            (["introduction","intro","overview","はじめに","概要","what is","とは"],       "introduction concept overview idea"),
            (["history","origin","background","歴史","起源","背景"],                       "history timeline archive vintage documentary"),
            (["benefit","advantage","merit","メリット","利点","why","なぜ"],               "success achievement benefit result positive"),
            (["risk","danger","problem","warning","注意","リスク","問題","デメリット"],     "warning risk danger caution problem"),
            (["strategy","plan","method","how to","方法","戦略","手順","ステップ","step"], "strategy plan whiteboard business steps"),
            (["tool","software","app","platform","ツール","アプリ","ソフト"],              "tools software technology laptop screen"),
            (["case study","example","success story","事例","ケーススタディ","実例"],       "success story case example result"),
            (["monetize","revenue","income","earn","収益","稼ぐ","マネタイズ"],             "money laptop entrepreneur success income"),
            (["automation","automate","workflow","自動化","自動"],                         "automation workflow office dashboard screen"),
            (["social media","instagram","tiktok","sns","viral","バイラル"],               "social media smartphone influencer screen"),
            (["content","blog","post","write","コンテンツ","ブログ","投稿"],               "content creation writing laptop desk"),
            (["data","analytics","metric","chart","データ","分析","統計"],                 "data analytics chart graph statistics"),
            (["ai","robot","machine learning","artificial","人工知能","生成ai"],           "artificial intelligence technology futuristic"),
            (["future","next","trend","将来","未来","トレンド","forecast"],                "future technology innovation modern city"),
            (["community","network","connect","コミュニティ","ネットワーク","つながり"],    "community network people teamwork connect"),
            (["conclusion","summary","wrap","まとめ","結論","next step","次のステップ"],    "success achievement goal finish accomplish"),
        ]
        for keywords, lf_kw in _section_map:
            if any(k in t for k in keywords):
                return lf_kw
        return topic_kw

    def _generate_image_prompt(self, section_title: str, topic: str, target_market: str = "us") -> str:
        """セクションタイトルから最適な画像プロンプトを生成（複数バリエーションからランダム選択）"""
        import random as _random

        # UFO/UAP トピックのみ UFO ビジュアルマップを使用
        _is_ufo = any(kw in topic.lower() for kw in ["ufo", "uap", "alien", "extraterrestrial", "disclosure", "宇宙人", "未確認"])
        
        if not _is_ufo:
            # Non-UFO: トピック関連キーワード + セクション番号で異なる構図
            _kw = self._get_topic_visual_keywords(topic)
            
            # Use visual_style from Identity if available
            visual_style = self.identity.get('visual_style', 'professional photography, bright modern background')
            
            _styles = [
                f"{_kw}, {visual_style}, editorial",
                f"{_kw}, {visual_style}, soft lighting",
                f"{_kw}, {visual_style}, high contrast",
                f"{_kw}, {visual_style}, clean composition",
                f"{_kw}, {visual_style}, natural lighting",
            ]
            _idx = hash(section_title) % len(_styles)
            prompt_base = "high quality, 16:9 aspect ratio"
            # Include section title so each section gets a unique MD5 seed in LoremFlickr
            return f"{_styles[_idx]}, subject: {section_title[:40]}, {prompt_base}"

        ufo_visual_map = {
            "基礎知識":   [
                "documentary-style infographic showing UFO sighting timeline from 1940s to 2026, clean dark background, data visualization, government seals",
                "Pentagon classified documents with redacted text, dramatic lighting, photorealistic, 4K",
            ],
            "最新":       [
                "US Congress hearing room, officials testifying, C-SPAN style photography, overhead lighting, serious atmosphere",
                "Military officer testifying at Congressional hearing, serious expression, wide angle lens, photorealistic",
            ],
            "議会":       [
                "US Capitol building at night with dramatic lighting, official government seal overlays, newspaper headline style",
                "Senate chamber during UAP disclosure vote, wide angle, dramatic overhead lighting, photorealistic",
            ],
            "真実":       [
                "declassified document aesthetic, redacted text visible, official stamps, freedom of information act style",
                "classified file folder labeled TOP SECRET with UAP evidence photos partially visible, cinematic lighting",
            ],
            "影響":       [
                "world map with UAP incident markers, globe perspective, dark blue background, data points glowing",
                "global news broadcast studio showing UAP disclosure announcement, multiple screens, photorealistic",
            ],
            "役割":       [
                "person looking at night sky through telescope, stars and one mysterious light, cinematic mood",
                "citizen journalist filming glowing orb in night sky with smartphone, authentic documentary style",
            ],
            "商品化":     [
                "digital creator workspace, laptop showing UFO research content, professional desk setup, warm lighting",
                "online course dashboard with UFO topic thumbnails, modern UI, laptop screen close-up",
            ],
            "証拠":       [
                "radar screen with unidentified blip, military control room aesthetic, green phosphor display",
                "Navy FLIR thermal camera footage style showing UAP orb, authentic military video overlay, grainy",
            ],
            "証人":       [
                "press conference microphone in front of blurred official, dramatic side lighting, documentary style",
                "whistleblower silhouette in front of window, backlit dramatic lighting, anonymous interview aesthetic",
            ],
            "公開":       [
                "government file boxes being opened, sunlight streaming in, official seal visible",
                "National Archives reading room, researchers examining declassified UFO files, photorealistic",
            ],
            "timeline":   [
                "dramatic infographic timeline on dark background, military green and white text, 1947-2026",
                "historical newspaper montage showing UFO headlines from 1947 to 2026, sepia to color transition",
            ],
            "confirmed":  [
                "official government seal and document overlay, high contrast black and white photography",
                "Pentagon press briefing room, official at podium confirming UAP existence, photorealistic",
            ],
            "witnesses":  [
                "silhouette of person against starfield, documentary interview style lighting",
                "group of military veterans seated at congressional hearing table, serious atmosphere, wide shot",
            ],
            "political":  [
                "Capitol building reflection in water, twilight blue hour, political drama aesthetic",
                "bipartisan congressional committee meeting on UAP transparency, overhead angle, documentary style",
            ],
            "action":     [
                "person at desk with multiple screens showing government data, focused determination",
                "researcher pinning UAP evidence to investigation board, thriller movie aesthetic, dramatic lighting",
            ],
            "Yemen":      [
                "military ship radar room at night, operators watching screens, green glow, photorealistic",
                "Navy vessel in combat zone, night operations, radar display showing unidentified contact",
            ],
            "orb":        [
                "glowing spherical UAP hovering over ocean at night, military vessel in background, authentic footage style",
                "FLIR thermal camera view of luminous sphere UAP, authentic military overlay graphics",
            ],
            "disclosure": [
                "government facility with classified files being transferred to public archives, sunlight, hopeful",
                "press conference with 'DECLASSIFIED' stamp overlay, officials announcing UAP transparency, wide shot",
            ],
        }
        prompt_base = "photorealistic, high quality, editorial style, 16:9 aspect ratio"
        if target_market == "us":
            prompt_base += ", American documentary style, professional journalism photography"
        for keyword, visuals in ufo_visual_map.items():
            if keyword in section_title:
                return f"{_random.choice(visuals)}, {prompt_base}"
        return f"dramatic documentary photography related to: {section_title}, dark moody atmosphere, cinematic, {prompt_base}"

    def _generate_section_images(self, sections: list, topic: str, 
                                   target_market: str = "us") -> dict:
        """
        各セクションに対応するAI画像プロンプトを生成し、
        画像ファイルをZIPに含める準備をする。
        
        Returns: {section_title: {type, path, prompt}}
        """
        import os as _os
        from backend.integrations.image_generation import image_gen_enhanced
        image_results = {}
        output_dir = self._get_output_dir(topic)

        topic_kw = self._get_topic_visual_keywords(topic) if topic else None

        for sec_idx, section in enumerate(sections):
            title = section.get("title", "")

            # 画像プロンプト生成（英語）
            prompt = self._generate_image_prompt(title, topic, target_market)

            # Per-section LoremFlickr keywords (avoids identical keyword pool across sections)
            section_kw = self._get_section_visual_keywords(title, topic_kw) if topic_kw else None

            # Gemini → Imgur → LoremFlickr の既存パイプラインで画像生成
            try:
                public_url = image_gen_enhanced.generate_social_media_image(
                    prompt, platform="twitter",
                    topic_keywords=section_kw,
                    section_index=sec_idx
                )
                image_results[title] = {
                    "type": "generated",
                    "url": public_url,
                    "prompt": prompt
                }
                logger.info(f"[IMAGE] Generated for: {title[:50]} → {public_url[:60]}")
            except Exception as e:
                logger.warning(f"[IMAGE] Generation failed ({e}), saving prompt only")
                image_results[title] = {
                    "type": "prompt_only",
                    "prompt": prompt
                }

        return image_results

    def _write_image_prompts_file(self, image_results: dict, output_dir: str):
        """
        画像生成できなかった場合でも、
        購入者がMidjourney/DALL-Eで生成できるよう
        プロンプト集をimage_prompts.mdとして出力する。
        """
        import os as _os
        content = "# AI Image Prompts for This Product\n\n"
        content += "Use these prompts with Midjourney, DALL-E 3, or Stable Diffusion to generate visuals.\n\n"
        
        for section_title, data in image_results.items():
            content += f"## {section_title}\n"
            content += f"```\n{data['prompt']}\n```\n\n"
        
        filepath = _os.path.join(output_dir, "image_prompts.md")
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info(f"[IMAGE] Prompts saved: {filepath}")
        except Exception as e:
            logger.warning(f"[IMAGE] Could not save prompts file: {e}")

    def _get_output_dir(self, topic: str) -> str:
        """生成物の出力ディレクトリ（ZIP用の一時フォルダ）を管理"""
        import os as _os
        import re
        # Normalize whitespace (strip newlines/tabs), remove invalid chars, truncate
        normalized = ' '.join(topic.split())  # collapse all whitespace incl. \n
        safe_name = re.sub(r'[^\w\s-]', '', normalized.lower()).replace(' ', '_')
        safe_name = safe_name[:80] or 'course'  # Windows MAX_PATH guard
        output_dir = _os.path.join("output", safe_name)
        if not _os.path.exists(output_dir):
            _os.makedirs(output_dir, exist_ok=True)
        return output_dir

    def _generate_bonuses(self, topic: str, price: int = 27, language: str = "en") -> str:
        """
        特典セクション（希少性・緊急性）を生成してセールスページに追加する。
        価格帯に応じた特典価値設定で購買動機を強化する。
        """
        import random as _random
        remaining = _random.randint(40, 48)
        bonus_value_1 = round(price * 1.5)
        bonus_value_2 = round(price * 3)

        if language == "ja":
            return f"""
---

## 🎁 48時間限定ボーナス（先着30名様）

今すぐ購入された方に、以下の3点を無料でプレゼントします：

1. **【独占PDF】{topic} 完全調査レポート（50ページ）** — 通常価格 ¥{bonus_value_1 * 150:,} 相当
2. **【永久アクセス】専門家インタビュー書き起こし集** — 通常価格 ¥{bonus_value_2 * 150:,} 相当
3. **【VIP招待】プライベートコミュニティへのアクセス** — プライスレス

⏰ **販売数：50部限定** / 残り：**{remaining}部**
⚠️ 48時間経過またはSOLD OUTで終了。再販なし。

---
"""
        else:
            return f"""
---

## 🎁 48-Hour Bonus Package (First 30 Buyers Only)

Order right now and you'll also receive these 3 exclusive bonuses — FREE:

1. **[Exclusive PDF] {topic} Deep Dive Report (50 pages)** — Valued at ${bonus_value_1}
2. **[Lifetime Access] Expert Interview Transcripts** — Valued at ${bonus_value_2}
3. **[VIP Invite] Private Community Access** — Priceless

⏰ **Limited to 50 copies** / Remaining: **{remaining} copies**
⚠️ Offer expires in 48 hours or when sold out. No re-release.

---
"""

    def _generate_sales_page(self, topic: str, sections: List[Dict], research_data: Optional[Dict] = None, language: str = "ja") -> Optional[str]:
        """
        Generate sales page framed as 'battle log as an asset'.

        Positioning: The buyer is not purchasing a course.
        They are purchasing the actual operational log — the raw intelligence
        that Sage produced during a live research-and-execution run.
        Proof-of-work is the product itself.
        """

        if not self.ollama and not self.gemini_client:
            logger.warning("No LLM available for sales page generation")
            return None

        try:
            import os as _os
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

            lang_line = "- 執筆言語：日本語" if language == "ja" else "- Output language: English"

            identity_context = self._get_identity_context()
            if language == "ja":
                prompt = f"""あなたはGumroadで実績を持つプロのコピーライターです。
{identity_context}

読者の「痛み→欲望→解決策→信頼→行動」の流れで販売ページを書きます。

【商品情報】
テーマ: {topic}
章立て:
{ops_log}

【根拠・一次証拠】
{evidence_block}
{lang_line}

---

以下の構成でGumroad販売ページ（Markdown）を生成してください。
重要: 読者目線で書く。「AIが生成した」より「あなたが得られる価値」を前面に出す。

## 1. キャッチコピー（1行）

「{topic}で〇〇を実現したい人へ」の方向で、読者の欲望に直接刺さる1文。
例: 「日本のNPOがコンテンツで支持者を3倍にする方法、全部ここにある。」

## 2. あなたの悩みはこれではないですか？（2-3点、箇条書き）

「情報はあるけど何から始めればいいかわからない」「続かない」「成果が見えない」など、
このテーマで読者が実際に感じている具体的な悩みを書く。

## 3. このガイドが解決すること（3-4文）

上の悩みに対して、このコンテンツが何をどう解決するかを明快に述べる。
具体的なアクション・数値・期間を含める。

## 4. 収録内容（章タイトルを自然な日本語で紹介）

各章を「〇〇 → あなたはここで〇〇を手に入れる」形式で価値説明する。

## 5. このガイドが他と違う理由（3点）

* 理論ではなく実行可能なステップ（「まず〇〇、次に〇〇」の手順書形式）
* 〇〇（トピック固有の専門性・具体性）
* AIが自動収集した最新リサーチをベースに構築 — 無料記事では調べきれない深さ

## 5.5. 価格について — なぜ¥4,500か

類似の情報をまとめるには: コンサルタントに依頼→30万円〜 / フリーランスに外注→5万円〜 / 自分で調査→20時間以上
このガイドは「すでに検証済みの手順書」として提供するため、時間と費用を90%削減できる。

## 6. こんな人に最適（具体的な人物像、2-3点）

読者が「これ私のことだ」と感じる人物描写。職業・状況・目標を含める。

## 7. CTA

[今すぐ購入して資産を手に入れる]({_os.getenv('GUMROAD_PAY_URL', 'https://your-gumroad-url.com')})

出力はMarkdownのみ。余分な前置き、解説、挨拶などは一切不要。
"""
            else:
                # English sales page — reader-centric, problem → solution → value
                prompt = f"""You are a professional copywriter with Gumroad sales experience.
{identity_context}

Write a high-converting sales page using the Pain → Desire → Solution → Proof → CTA flow.

PRODUCT: {topic}
CHAPTERS:
{ops_log}

EVIDENCE:
{evidence_block}

Write a Gumroad sales page in Markdown with these sections:

## 1. Headline (1 line)
Hook with the reader's desired outcome. "Get [result] even if [obstacle]."

## 2. Does this sound familiar? (2-3 bullets)
Specific frustrations the target reader feels about this topic.

## 3. What this guide does for you (3-4 sentences)
Concrete results, actions, and timeframes. Specific and measurable.

## 4. What's inside (list each chapter with its value)
Format: "Chapter X: [Title] → You'll learn [specific benefit]"

## 5. Why this is different (3 bullets)
Focus on specificity, actionability, and AI-backed research over generic advice.

## 6. Who this is for (2-3 reader profiles)
Specific job roles, situations, and goals. Make readers say "that's me."

## 7. CTA
[Get instant access →]({_os.getenv('GUMROAD_PAY_URL', 'https://your-gumroad-url.com')})

Output Markdown only. No preamble, explanations, or greetings.
"""

            sales_page = self._invoke_llm(prompt)
            if not sales_page:
                raise RuntimeError("All LLMs returned empty for sales page")

            # Inject bonus section before the final CTA (section 7)
            try:
                import os as _os2
                price = int(_os2.getenv("GUMROAD_DEFAULT_PRICE", "27"))
                bonus_block = self._generate_bonuses(topic, price=price, language=language)
                # Insert before the last ## heading (CTA section) if it exists
                import re as _re
                cta_match = _re.search(r'\n## [67]\.', sales_page)
                if cta_match:
                    insert_pos = cta_match.start()
                    sales_page = sales_page[:insert_pos] + bonus_block + sales_page[insert_pos:]
                else:
                    sales_page = sales_page + bonus_block
            except Exception as _be:
                logger.warning(f"Bonus section injection failed: {_be}")

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
            if slide and slide.get('image_url'):
                content += f"**Slide**: {slide['image_url']}\n\n"
            
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

    def _generate_blog_post(self, topic: str, sections: List[Dict], language: str = "en") -> Optional[str]:
        """Generate a SEO blog post from course content. Returns Markdown string or None."""
        import os as _os
        # Use first 3 sections as source material
        section_summaries = "\n".join(
            f"- {s['title']}: {s['content'][:300].strip()}"
            for s in sections[:3]
        )
        gumroad_url = _os.getenv("GUMROAD_PAY_URL", "https://your-gumroad-url.com")

        if language == "ja":
            prompt = f"""あなたはSEOに強いブログライターです。以下のオンラインコース情報をもとに、読者が「読んでよかった」と感じる日本語ブログ記事を書いてください。

トピック: {topic}

コースの主なセクション:
{section_summaries}

## 記事の構成（必須）:
1. **タイトル** (H1): SEO最適化済み、クリック率を高める
2. **導入** (150字): 読者の悩みに共感し、解決策を予告
3. **本文** (3見出し×300字): 各セクションから実用的な知識を抽出
4. **まとめ** (100字): 学んだことの要約
5. **CTA**: [コースで詳しく学ぶ →]({gumroad_url})

出力はMarkdownのみ。
"""
        else:
            prompt = f"""You are an SEO blog writer. Write a high-value English blog post based on the online course below.

Topic: {topic}

Key course sections:
{section_summaries}

## Article structure (required):
1. **Title** (H1): SEO-optimized, high click-through
2. **Intro** (100 words): Empathize with the reader's problem, preview the solution
3. **Body** (3 H2 sections × 200 words): Extract actionable insights from each course section
4. **Conclusion** (80 words): Summarize key takeaways
5. **CTA**: [Get the full course →]({gumroad_url})

Output Markdown only.
"""
        try:
            blog_post = self._invoke_llm(prompt)
            if blog_post:
                logger.info(f"✅ Blog post generated ({len(blog_post)} chars)")
            return blog_post
        except Exception as e:
            logger.warning(f"Blog post generation failed: {e}")
            return None

    def _generate_product_extras(self, topic: str, sections: List[Dict], language: str = "en") -> dict:
        """Generate bonus_stack, product_hook, and launch_checklist to complete the product package."""
        section_titles = [s['title'] for s in sections[:5]]
        titles_str = "\n".join(f"- {t}" for t in section_titles)

        if language == "ja":
            prompt = f"""以下のデジタル商品のボーナススタック・製品フック・ローンチチェックリストをJSONで生成してください。

トピック: {topic}
セクション:
{titles_str}

以下のJSON形式で出力してください（コードブロックなし・JSONのみ）:
{{
  "product_hook": "1文の強力なオファー概要（ベネフィット明示、具体的な数値を含む）",
  "bonus_stack": [
    {{"title": "ボーナス1タイトル", "description": "20字以内の説明", "value": "¥3,000相当"}},
    {{"title": "ボーナス2タイトル", "description": "20字以内の説明", "value": "¥2,000相当"}},
    {{"title": "ボーナス3タイトル", "description": "20字以内の説明", "value": "¥1,500相当"}}
  ],
  "launch_checklist": [
    "Gumroadページの商品説明を更新",
    "ブログ記事を公開してGumroadへリンク",
    "Blueskyに告知ポストを投稿",
    "Instagramにキャプションを投稿",
    "価格を確認して公開"
  ]
}}"""
        else:
            prompt = f"""Generate a bonus stack, product hook, and launch checklist for this digital product as JSON.

Topic: {topic}
Sections:
{titles_str}

Output valid JSON only (no code blocks):
{{
  "product_hook": "One powerful sentence summarizing the offer — include a specific benefit and number",
  "bonus_stack": [
    {{"title": "Bonus 1 title", "description": "Under 15 words", "value": "$29 value"}},
    {{"title": "Bonus 2 title", "description": "Under 15 words", "value": "$19 value"}},
    {{"title": "Bonus 3 title", "description": "Under 15 words", "value": "$15 value"}}
  ],
  "launch_checklist": [
    "Update Gumroad product description",
    "Publish blog post with Gumroad link",
    "Post to Bluesky with hook",
    "Post to Instagram with caption",
    "Verify price and go live"
  ]
}}"""

        try:
            import json as _json
            raw = self._invoke_llm(prompt)
            if not raw:
                raise ValueError("Empty LLM response")
            # Strip markdown code fences if present
            raw = raw.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:])
            if raw.endswith("```"):
                raw = "\n".join(raw.split("\n")[:-1])
            return _json.loads(raw.strip())
        except Exception as e:
            logger.warning(f"Product extras generation failed: {e}")
            # Return safe defaults so the pipeline never breaks
            if language == "ja":
                return {
                    "product_hook": f"「{topic}」で成果を出すための完全ガイド — 今すぐ実践できる手順付き",
                    "bonus_stack": [
                        {"title": "クイックスタートチェックリスト", "description": "すぐ使える実践チェックリスト", "value": "¥2,000相当"},
                        {"title": "キャプションスワイプファイル", "description": "SNS投稿用コピペテンプレート集", "value": "¥1,500相当"},
                        {"title": "ローンチデイ投稿プラン", "description": "初日に何を投稿するかの計画書", "value": "¥1,000相当"},
                    ],
                    "launch_checklist": ["Gumroadを更新", "ブログ記事を公開", "Blueskyに告知", "Instagramに投稿", "価格を確認して公開"],
                }
            return {
                "product_hook": f"Master {topic} with this complete step-by-step guide — actionable results guaranteed",
                "bonus_stack": [
                    {"title": "Quick-Start Checklist", "description": "Get results from day one", "value": "$29 value"},
                    {"title": "Caption Swipe File", "description": "Copy-paste social captions ready to post", "value": "$19 value"},
                    {"title": "Launch Day Posting Plan", "description": "Your first 24 hours mapped out", "value": "$15 value"},
                ],
                "launch_checklist": ["Update Gumroad listing", "Publish blog post", "Post to Bluesky", "Post to Instagram", "Verify price & go live"],
            }


def _build_sns_captions(topic: str, sections: list, sales_page: str = "") -> list:  # noqa: ARG001
    """Generate ready-to-post SNS captions from course content.
    Returns 5 captions: [bluesky, instagram, twitter_x, facebook, japanese] (max chars per platform).
    """
    titles = [s.get('title', '') for s in sections[:5]]
    bullet_lines = "\n".join(f"✅ {t}" for t in titles[:4])

    bluesky = (
        f"🚀 New product just built: \"{topic}\"\n\n"
        + "\n".join(f"📌 {t}" for t in titles[:3]) +
        "\n\n💡 AI-generated · Ready to sell\n\n"
        "#AI #DigitalProduct #PassiveIncome #SolopreNeur"
    )[:280]

    instagram = (
        f"🚀 Just created: \"{topic}\"\n\n"
        f"What's inside:\n{bullet_lines}\n\n"
        f"💰 Available as a digital download · Link in bio 👆\n\n"
        f"#AItools #PassiveIncome #DigitalProduct #Automation #OnlineBusiness #SolopreNeur #AIcourse"
    )

    twitter_x = (
        f"Just built \"{topic}\" with AI in 90 seconds 🚀\n\n"
        f"{'📌 ' + titles[0] if titles else topic}\n\n"
        f"Full guide · Ready to sell · Link in bio\n\n"
        f"#AI #DigitalProducts #SolopreNeur #PassiveIncome"
    )[:280]

    facebook = (
        f"Excited to share my latest digital product: \"{topic}\" 🚀\n\n"
        f"This guide covers:\n{bullet_lines}\n\n"
        f"Whether you're just starting out or looking to level up, this resource walks you through every step.\n\n"
        f"Drop a comment if you'd like to know more! 👇"
    )

    japanese = (
        f"【新作】「{topic}」のデジタル商品を作りました🚀\n\n"
        + "\n".join(f"📌 {t}" for t in titles[:3]) +
        f"\n\nAIで90秒生成・すぐに販売可能です✨\n\n"
        f"#AI #副業 #デジタル商品 #自動化 #AIビジネス"
    )[:280]

    return [bluesky, instagram, twitter_x, facebook, japanese]
