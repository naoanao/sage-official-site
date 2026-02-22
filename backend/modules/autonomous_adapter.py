import threading
import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Safe actions whitelist (Phase 2 execution)
SAFE_ACTIONS = [
    'create_notion_summary',
    'send_telegram_notification',
    'log_milestone',
    'research_ai_trends',
    'optimize_monetization' # NEW: Content Loop Hook
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
            
            # Rule 1: Self-Improvement (Disabled for Quota Safety - Trigger manually or rarely)
            if loop == 9999: # loop % 5 == 0: 
                decision = {
                    "type": "research_ai_trends",
                    "reason": "Autonomous Self-Improvement Check",
                    "priority": "high",
                    "data": {"topic": "New AI Agent Capabilities 2025"}
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
                # Trigger Research Tool via Orchestrator Logic
                topic = decision['data'].get('topic', 'AI Trends')
                logger.info(f"   -> Researching '{topic}' via NotebookLM/Search...")
                
                # Simulate Orchestrator Step
                # Note: We can't easily call execute_node because it expects complex state.
                # But we can call the tool method directly if we find it, OR use the orchestrator's 'research_agent'
                
                # Check for NotebookLM Agent
                if hasattr(self.orchestrator, 'notebooklm_agent') and self.orchestrator.notebooklm_agent:
                     res = self.orchestrator.notebooklm_agent.research_topic(topic)
                     logger.info(f"   -> Research Result Status: {res.get('status')}")
                     
                     if res.get('status') == 'success':
                         # SAVE TO DESKTOP FOR USER VISIBILITY
                         desktop_path = r"C:\Users\nao\Desktop\Sage_Final_Unified\AI_TRENDS_REPORT.md"
                         with open(desktop_path, 'w', encoding='utf-8') as f:
                             f.write(res.get('report', 'No Data'))
                         logger.info(f"   -> 📝 Wrote report to {desktop_path}")
                     
                elif hasattr(self.orchestrator, 'browser_agent') and self.orchestrator.browser_agent:
                     # Fallback to simple browser search
                     res = self.orchestrator.browser_agent.navigate(f"https://www.google.com/search?q={topic}")
                     logger.info(f"   -> Browser Search Performed: {res}")
                else:
                     logger.warning("   -> No Research Agent available.")

            elif decision['type'] == 'log_milestone':
                 logger.info(f"   -> Milestone: {decision['data']}")
            
            elif decision['type'] == 'create_notion_summary':
                 logger.info("   -> Creating Notion summary (simulated)")

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
