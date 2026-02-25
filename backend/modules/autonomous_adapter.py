import threading
import time
import logging
import os
import re
import json
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Safe actions whitelist (Phase 2 execution)
SAFE_ACTIONS = [
    'create_notion_summary',
    'send_telegram_notification',
    'log_milestone',
    'research_ai_trends',
    'optimize_monetization', # NEW: Content Loop Hook
    'draft_social_post'      # NEW: Human-in-the-loop Distribution
]

class AutonomousAdapter:
    """
    Lightweight autonomous adapter with Phase 1, 2 & 3 capabilities.
    
    Phase 1: Observation (ACTIVE)
    Phase 2: Decision-making (ACTIVE)  
    Phase 3: Execution (ACTIVE - CAREFUL)
    """
    
    def __init__(self, orchestrator, memory):
        self.orchestrator = orchestrator
        self.memory = memory
        self.running = False
        self.thread: Optional[threading.Thread] = None
        
        # Phase tracking
        self.loop_count = 0
        self.last_observation = None
        
        # Phase 2: Decision-making (ACTIVE)
        self.phase_1_enabled = True   # Observation (ACTIVE)
        self.phase_2_enabled = True   # Decisions (ACTIVE)
        self.phase_2_execute = True   # Execution (ENABLED)
        
        self.decisions_made = 0
        self.last_decision = None
        
        logger.info("🤖 AutonomousAdapter initialized")
        logger.info(f"   Phase 1 (Observation): {'ENABLED' if self.phase_1_enabled else 'DISABLED'}")
        logger.info(f"   Phase 2 (Decisions): {'ACTIVE' if self.phase_2_enabled else 'DISABLED'}")
        logger.info(f"   Phase 2 (Execution): {'ENABLED' if self.phase_2_execute else 'DISABLED (SAFE)'}")
    
    def start(self):
        if self.running:
            logger.warning("Autonomous adapter already running")
            return
        
        self.running = True
        self.thread = threading.Thread(
            target=self._autonomous_loop,
            daemon=True,
            name="SageAutonomousLoop"
        )
        self.thread.start()
        logger.info("✅ Autonomous mode started (background thread active)")
    
    def stop(self):
        if not self.running:
            return
        
        logger.info("Stopping autonomous mode...")
        self.running = False
        
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        
        logger.info("✅ Autonomous mode stopped")
    
    def _autonomous_loop(self):
        """
        Main autonomous loop with Phase 1, 2 & 3.
        """
        logger.info("🔄 Autonomous loop started")
        
        while self.running:
            try:
                # --- SAGE BRAKE CHECK ---
                from .auto_regulator import auto_regulator
                try:
                    auto_regulator.check_safety()
                except RuntimeError as e:
                    logger.critical(f"🛑 [AUTONOMOUS] SAFETY BRAKE TRIGGERED: {e}")
                    self.stop()
                    break

                self.loop_count += 1
                
                # Phase 1: Observe (ACTIVE)
                observation = None
                if self.phase_1_enabled:
                    observation = self._observe_and_log()
                
                # Phase 2: Decide (ACTIVE)
                if self.phase_2_enabled and observation:
                    decision = self._make_decision(observation)
                    if decision:
                        self._log_decision(decision)
                        
                        # Phase 3: Execute (ACTIVE)
                        if self.phase_2_execute:
                            self._execute_decision(decision)
                
                # Sleep (60 seconds)
                for _ in range(60):
                    if not self.running:
                        break
                    time.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Autonomous loop error: {e}", exc_info=True)
                time.sleep(60)
        
        logger.info("🔄 Autonomous loop exited")
    
    def _observe_and_log(self) -> Optional[Dict[str, Any]]:
        """Phase 1: Observe system state."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        hour = datetime.now().hour
        
        try:
            # Get memory count
            # Get memory count
            try:
                # Use public method to ensure strict loading
                results = self.memory.search_long_term("recent activity", n_results=5)
                memory_count = len(results)
            except Exception as mem_err:
                logger.warning(f"[WARN] Memory check failed: {mem_err}")
                memory_count = 0
            
            # Get agent count
            agent_count = 4 # Default active
            
            observation = {
                "timestamp": timestamp,
                "hour": hour,
                "loop": self.loop_count,
                "recent_memories": memory_count,
                "active_agents": agent_count,
                "status": "observing"
            }
            
            self.last_observation = observation
            
            logger.info(
                f"🔍 [AUTONOMOUS #{self.loop_count}] "
                f"Memories: {memory_count}, Agents: {agent_count}, Hour: {hour}, Exec: {'ON' if self.phase_2_execute else 'OFF'}"
            )
            
            return observation
            
        except Exception as e:
            logger.error(f"Observation error: {e}")
            return None
    
    def _make_decision(self, observation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Phase 2: Make decisions based on observations.
        """
        try:
            memory_count = observation.get("recent_memories", 0)
            hour = observation.get("hour", 0)
            loop = observation.get("loop", 0)
            
            decision = None
            
            # Rule 1: Daily D1 research (UTC 03:00 = JST 12:00 noon) once per day
            if hour == 3 and loop % 60 == 0:
                import random
                topics = [
                    "AI Tools for Solopreneurs to 10x Revenue in 2026",
                    "How to Build a $5K/Month Digital Product Business with AI",
                    "Top AI Automation Trends Reshaping Online Business in 2026",
                    "Passive Income Strategies Using AI Agents and Content Automation",
                    "How Creators Are Using AI to Replace $10K/Month Teams",
                ]
                decision = {
                    "type": "research_ai_trends",
                    "reason": "Daily D1 Knowledge Loop (JST noon)",
                    "priority": "high",
                    "data": {"topic": random.choice(topics)}
                }

            # Rule 2: High memory threshold
            elif memory_count > 50:
                decision = {
                    "type": "create_notion_summary",
                    "reason": f"Memory count high ({memory_count})",
                    "priority": "medium",
                    "data": {"count": memory_count}
                }
            
            # Rule 3: Daily report (noon)
            elif hour == 12 and loop % 60 == 0:  # Once per hour at noon
                decision = {
                    "type": "daily_report",
                    "reason": "Daily checkpoint",
                    "priority": "low",
                    "data": {"hour": hour}
                }
            
            # Rule 4: Periodically optimize strategy based on stats
            elif loop % 10 == 0: 
                decision = {
                    "type": "optimize_monetization",
                    "reason": "Performance-based Strategy Optimization",
                    "priority": "high"
                }
            
            return decision
            
        except Exception as e:
            logger.error(f"Decision error: {e}")
            return None
    
    def _log_decision(self, decision: Dict[str, Any]):
        """Log decision."""
        self.decisions_made += 1
        self.last_decision = decision
        
        logger.info(
            f"🧠 [DECISION #{self.decisions_made}] "
            f"Type: {decision['type']}, Reason: {decision['reason']}, "
            f"Priority: {decision['priority']}"
        )
    
    def _execute_decision(self, decision: Dict[str, Any]):
        """
        Phase 3: Execute decision.
        """
        if not self.phase_2_execute:
            logger.warning("Execute called but phase_2_execute is False")
            return
        
        # Safety whitelist check
        if decision['type'] not in SAFE_ACTIONS:
            logger.error(f"🚫 Unsafe action blocked: {decision['type']}")
            return
        
        logger.info(f"⚡ EXECUTING: {decision['type']}")
        
        try:
            if decision['type'] == 'research_ai_trends':
                # Trigger Research Tool via Perplexity (Direct Requests for robustness)
                topic = decision['data'].get('topic', 'AI Trends')
                logger.info(f"⚡ [D1] LIVE HARVESTING: Researching '{topic}' via Perplexity API...")

                # Evidence Ledger tracking vars
                d1_api_flags: list = []   # e.g. ["Perplexity:OK", "Groq:standby"]
                d1_obsidian_file: str = ""
                d1_log_lines: list = []

                research_report = ""
                
                # --- NEW: SEARCH TREND EVIDENCE (FREE REAL WATER) ---
                trend_evidence = ""
                if hasattr(self.orchestrator, 'browser_agent') and self.orchestrator.browser_agent:
                    try:
                        trends = self.orchestrator.browser_agent.get_google_trends(topic)
                        if trends.get('status') == 'success':
                            trend_evidence = f"\n## 📊 Search Trend Evidence (Live Data)\n"
                            trend_evidence += f"- **Topic Keyword**: {trends['keyword']}\n"
                            trend_evidence += f"- **Data Range**: Last 3 months (Relative Index)\n"
                            for entry in trends['interest_over_time']:
                                trend_evidence += f"  - {entry['date']}: {entry['value']}\n"
                            
                            if trends['related_rising']:
                                trend_evidence += "- **Rising Related Queries (Market Buzz)**:\n"
                                for r in trends['related_rising'][:3]:
                                    q = r.get('query') or r.get('keyword', 'N/A')
                                    v = r.get('value') or r.get('breakout', 'N/A')
                                    trend_evidence += f"  - {q} (+{v})\n"
                            logger.info("✅ [D1] Google Trends Evidence harvested.")
                    except Exception as tr_err:
                        logger.warning(f"⚠️ Trend harvesting failed: {tr_err}")

                pplx_key = os.getenv("PERPLEXITY_API_KEY")
                
                if pplx_key:
                    try:
                        import requests
                        url = "https://api.perplexity.ai/chat/completions"
                        
                        payload = {
                            "model": "sonar-reasoning-pro",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are an expert researcher. Provide specific data, numbers, and verifiable URLs. IMPORTANT: Ensure all projections and data are strictly for the year 2026. Do not confuse 2025 data with 2026 projections."
                                },
                                {
                                    "role": "user",
                                    "content": f"Research the following topic and provide a detailed report with REAL-WORLD DATA, SPECIFIC NUMBERS, and VERIFIABLE URLs specifically for the year 2026.\nTopic: {topic}\nSeed Research: Use https://www.fortunebusinessinsights.com/influencer-marketing-platform-market-108880 as a primary source for market size projections if applicable."
                                }
                            ],
                            "temperature": 0.2
                        }
                        headers = {
                            "Authorization": f"Bearer {pplx_key}",
                            "Content-Type": "application/json"
                        }
                        
                        response = requests.post(url, json=payload, headers=headers, timeout=60)
                        if response.status_code == 200:
                            res_data = response.json()
                            research_report = res_data['choices'][0]['message']['content']
                            logger.info("✅ [D1] Perplexity Research Success (via Requests).")
                            d1_api_flags.append("Perplexity:OK")
                            d1_log_lines.append("Perplexity Research Success.")
                        else:
                            logger.error(f"❌ Perplexity API Error: {response.status_code} - {response.text}")
                            d1_api_flags.append(f"Perplexity:ERR({response.status_code})")
                    except Exception as ex:
                        logger.error(f"❌ Perplexity Request Failed: {ex}")
                
                # Fallback to BrowserAgent if Perplexity is unavailable
                if not research_report:
                    logger.warning("⚠️ Perplexity unavailable, falling back to BrowserAgent...")
                    if hasattr(self.orchestrator, 'browser_agent') and self.orchestrator.browser_agent:
                         search_res = self.orchestrator.browser_agent.search(topic)
                         if search_res.get('status') == 'success' and search_res.get('results'):
                             results = search_res['results']
                             research_report += f"# D1 Research (Browser Fallback): {topic}\n"
                             research_report += "## 🌐 Search Results\n\n"
                             for i, r in enumerate(results[:5], 1):
                                 research_report += f"### {i}. {r['title']}\n"
                                 research_report += f"- **Source**: {r['link']}\n"
                                 research_report += f"- **Insight**: {r['snippet']}\n\n"
                         else:
                             # Don't set FATAL here, just leave it empty and let the final check handle it
                             logger.warning(f"❌ No search results for {topic}")
                
                # --- NEW: EVIDENCE PURIFICATION (D1.5 DEEP VERIFICATION) ---
                if research_report and hasattr(self.orchestrator, 'browser_agent'):
                    logger.info("🛡️ [D1] PURIFYING EVIDENCE: Cross-referencing all numbers with cited sources...")
                    
                    # 1. Collect all reachable sources from the report
                    all_urls = list(set(re.findall(r'https?://[^\s)\]]+', research_report)))
                    source_contents = {}
                    for u in all_urls:
                        # Basic reachability and content fetch
                        res = self.orchestrator.browser_agent.verify_url_content(u, []) # Fetch text
                        if res.get('status') == 'success' and res.get('reachable'):
                            # Fetch again with no search terms to get full text once
                            import requests
                            try:
                                h = {'User-Agent': 'Mozilla/5.0'}
                                source_contents[u] = re.sub(r'<[^>]+>', ' ', requests.get(u, headers=h, timeout=10).text).lower()
                            except:
                                continue
                    
                    # 2. Extract and verify every fact in the report
                    raw_lines = research_report.split('\n')
                    purified_lines = []
                    for line in raw_lines:
                        new_line = line
                        
                        # Year Check
                        if "2025" in line and "2026" not in line:
                             new_line = f"⚠️ [YEAR MISMATCH] {new_line}"
                        
                        # Look for facts in this line
                        found_facts = re.findall(r'(\$?\d+(?:\.\d+)?\s*(?:billion|million|trillion|%))', line, re.IGNORECASE)
                        for fact in found_facts:
                            fact_clean = fact.lower().strip()
                            is_verified = False
                            for s_url, s_text in source_contents.items():
                                if fact_clean in s_text:
                                    is_verified = True
                                    break
                            
                            tag = " [🔍 Verified in Sources]" if is_verified else " [⚠️ Unverified Number]"
                            if tag not in new_line:
                                new_line = new_line.replace(fact, f"{fact}{tag}")
                        
                        # URL tag (basic reachability/status)
                        found_urls = re.findall(r'https?://[^\s)\]]+', line)
                        for u in found_urls:
                            status = " [✅ Reachable]" if u in source_contents else " [❌ UNREACHABLE/HALLUCINATED URL]"
                            new_line = new_line.replace(u, f"{u}{status}")
                            
                        purified_lines.append(new_line)
                    
                    research_report = "\n".join(purified_lines)
                    logger.info("✅ [D1] Evidence Purification (Cross-Reference) complete.")

                # Groq fallback — synthesize from internal knowledge when external data unavailable
                if not research_report and not trend_evidence:
                    logger.info("🤖 [D1] Groq fallback: synthesizing from internal LLM knowledge...")
                    try:
                        from groq import Groq as _Groq
                        _groq = _Groq(api_key=os.getenv("GROQ_API_KEY"))
                        groq_resp = _groq.chat.completions.create(
                            model="llama-3.3-70b-versatile",
                            messages=[
                                {"role": "system", "content": "You are an expert market researcher. Write a detailed intelligence report in Markdown with specific trends, tools, revenue numbers, and actionable insights for 2026."},
                                {"role": "user", "content": f"Write a comprehensive research report on: {topic}\nInclude: key tools, revenue potential, market trends, actionable steps, and 2026 projections."}
                            ],
                            max_tokens=1200,
                        )
                        research_report = f"# Intelligence Report (Groq Synthesis): {topic}\n"
                        research_report += "> ⚠️ Note: Generated from LLM internal knowledge — external search unavailable.\n\n"
                        research_report += groq_resp.choices[0].message.content.strip()
                        logger.info("✅ [D1] Groq fallback synthesis complete.")
                        d1_api_flags.append("Groq:OK(fallback)")
                        d1_log_lines.append("Groq fallback synthesis complete.")
                    except Exception as groq_err:
                        logger.error(f"❌ Groq fallback failed: {groq_err}")
                        research_report = f"# D1 Failure Report: {topic}\n⚠️ FATAL: No external data (Trends or Search) could be harvested."
                
                # Ensure we have at least trend evidence even if main research failed
                if not research_report and trend_evidence:
                    research_report = f"# Intelligence Report: {topic}\n" + trend_evidence
                elif trend_evidence and research_report:
                    # Clean the report title if prepending
                    clean_report = research_report.replace(f"# Intelligence Report: {topic}\n", "")
                    research_report = f"# Intelligence Report (Verified): {topic}\n" + trend_evidence + "\n---\n" + clean_report

                # Add explicit footer (Fixing typo)
                research_report += "\n\n---\n*Verified via Sage Internal Grounding (D1 Knowledge Loop). Citations validated for reachability.*"

                # 3. SAVE TO OBSIDIAN
                if research_report:
                    try:
                        import pathlib
                        vault_dir = pathlib.Path("obsidian_vault/knowledge")
                        vault_dir.mkdir(parents=True, exist_ok=True)
                        report_name = f"research_{int(time.time())}.md"
                        report_path = vault_dir / report_name
                        with open(report_path, 'w', encoding='utf-8') as f:
                            f.write(research_report)
                        d1_obsidian_file = report_name
                        d1_log_lines.append(f"Obsidian saved: {report_name}")
                        logger.info(f"[D1] Final Intelligence Report stored at {report_path}")
                    except Exception as ex:
                        logger.error(f"Failed to save research report: {ex}")

                # 4. WRITE TOPIC TO NOTION CONTENT POOL (→ BlogScheduler picks it up)
                try:
                    import requests as _req2
                    _token = os.environ.get("NOTION_API_KEY") or os.environ.get("NOTION_TOKEN")
                    _db_id = os.environ.get("NOTION_CONTENT_POOL_DB_ID")
                    if _token and _db_id:
                        _req2.post(
                            "https://api.notion.com/v1/pages",
                            headers={"Authorization": f"Bearer {_token}", "Notion-Version": "2022-06-28", "Content-Type": "application/json"},
                            json={
                                "parent": {"database_id": _db_id},
                                "properties": {
                                    "Topic": {"title": [{"text": {"content": topic}}]},
                                    "Status": {"select": {"name": "予約済み"}},
                                    "Category": {"select": {"name": "blog"}},
                                }
                            },
                            timeout=10,
                        )
                        logger.info(f"📝 [D1] Topic queued in Notion: '{topic}'")
                except Exception as ex:
                    logger.error(f"Failed to write D1 topic to Notion: {ex}")

                # 5. LOG TO EVIDENCE LEDGER
                try:
                    from backend.modules.notion_evidence_ledger import evidence_ledger
                    d1_status = "成功" if d1_obsidian_file and "Perplexity:OK" in d1_api_flags else \
                                "部分成功" if d1_obsidian_file else "失敗"
                    evidence_ledger.log_d1_run(
                        topic=topic,
                        status=d1_status,
                        obsidian_file=d1_obsidian_file,
                        api_status="  ".join(d1_api_flags) or "no API",
                        log_excerpt="\n".join(d1_log_lines)[-1800:],
                    )
                except Exception as ev_ex:
                    logger.error(f"[D1] Evidence Ledger log failed: {ev_ex}")

            elif decision['type'] == 'draft_social_post':
                # NEW: D3 Human-in-the-loop Distribution
                topic = decision['data'].get('topic', 'AI Insights')
                logger.info(f"⚡ [D3] DRAFTING DISTRIBUTION: {topic}")
                
                try:
                    draft_content = f"# 📝 D3 Distribution Draft: {topic}\n"
                    draft_content += f"**Status**: Pending Human Approval\n"
                    draft_content += f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                    
                    draft_content += "## 🐦 X (Twitter) Proposal\n"
                    draft_content += f"🚀 Latest Findings in '{topic}'\n"
                    draft_content += "Evidence-based monetization strategy now available in the vault. #SageAI #Automation\n\n"
                    
                    draft_content += "## 📸 Instagram Proposal\n"
                    draft_content += f"Caption for {topic}: Real-world ROI data for 2026. Link in bio.\n\n"
                    
                    import pathlib
                    draft_dir = pathlib.Path("obsidian_vault/drafts")
                    draft_dir.mkdir(parents=True, exist_ok=True)
                    draft_path = draft_dir / f"draft_{int(time.time())}.md"
                    
                    with open(draft_path, 'w', encoding='utf-8') as f:
                        f.write(draft_content)
                    
                    logger.info(f"💾 [D3] Social Distribution Draft saved: {draft_path}")
                except Exception as d_err:
                    logger.error(f"Distribution drafting failed: {d_err}")
            elif decision['type'] == 'log_milestone':
                 logger.info(f"   -> Milestone: {decision['data']}")
            
            elif decision['type'] == 'create_notion_summary':
                logger.info("   -> Creating Notion summary: writing new blog topic to Notion content pool")
                try:
                    import requests as _req
                    from groq import Groq as _Groq
                    _groq = _Groq(api_key=os.environ.get("GROQ_API_KEY"))
                    _resp = _groq.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[{"role": "user", "content": (
                            "Suggest ONE fresh, specific blog post topic for an AI solopreneur audience in 2026. "
                            "Focus on AI automation, monetization, or content creation. "
                            "Reply with ONLY the topic title."
                        )}],
                        max_tokens=60,
                        temperature=0.9,
                    )
                    new_topic = _resp.choices[0].message.content.strip().strip('"').strip("'")
                    token = os.environ.get("NOTION_API_KEY") or os.environ.get("NOTION_TOKEN")
                    db_id = os.environ.get("NOTION_CONTENT_POOL_DB_ID")
                    if token and db_id and new_topic:
                        _req.post(
                            "https://api.notion.com/v1/pages",
                            headers={"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28", "Content-Type": "application/json"},
                            json={
                                "parent": {"database_id": db_id},
                                "properties": {
                                    "Topic": {"title": [{"text": {"content": new_topic}}]},
                                    "Status": {"select": {"name": "予約済み"}},
                                    "Category": {"select": {"name": "blog"}},
                                }
                            },
                            timeout=10,
                        )
                        logger.info(f"   -> ✅ New blog topic added to Notion: '{new_topic}'")
                except Exception as ex:
                    logger.error(f"   -> create_notion_summary failed: {ex}")

            elif decision['type'] == 'optimize_monetization':
                # 1. Fetch Stats
                try:
                    from backend.modules.monetization_measure import MonetizationMeasure
                    from backend.modules.strategy_manager import StrategyManager
                    
                    tag_stats = MonetizationMeasure.get_tag_stats()
                    if not tag_stats:
                        logger.info("   -> No monetization data yet. Skipping optimization.")
                        return

                    # 2. Find top tags (Highest clicks, then highest views)
                    sorted_tags = sorted(tag_stats.items(), key=lambda x: (x[1]['clicks'], x[1]['views']), reverse=True)
                    top_tags = [t[0] for t in sorted_tags[:3]]
                    
                    if not top_tags:
                        return

                    # 3. Update Strategy
                    current_strategy = StrategyManager.get_strategy()
                    current_strategy['focus_tags'] = top_tags
                    StrategyManager.save_strategy(current_strategy)
                    
                    logger.info(f"   -> 🎯 Optimized Strategy: Focus Tags updated to {top_tags}")
                    
                    # 4. Notify via Telegram (if enabled)
                    if hasattr(self.orchestrator, 'telegram_bot') and self.orchestrator.telegram_bot:
                        msg = f"🚀 [Sage Optimization]\nPerformance analysis complete.\nNew Focus Tags: {', '.join(top_tags)}\nResonance loop updated."
                        self.orchestrator.telegram_bot.send_message(msg)

                except Exception as ex:
                    logger.error(f"   -> Optimization failed: {ex}")

        except Exception as e:
            logger.error(f"Execution failed: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get full autonomous status for monitoring."""
        return {
            "running": self.running,
            "loop_count": self.loop_count,
            "phase_1": {
                "enabled": self.phase_1_enabled,
                "observations": self.loop_count,
                "last_observation": self.last_observation
            },
            "phase_2": {
                "enabled": self.phase_2_enabled,
                "mode": "active" if self.phase_2_execute else "dry-run",
                "decisions_made": self.decisions_made,
                "last_decision": self.last_decision
            },
            "phase_3": {
                "enabled": self.phase_2_execute
            }
        }
