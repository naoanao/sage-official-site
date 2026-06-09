# -*- coding: utf-8 -*-
import sys
import os

# Force UTF-8 for Windows console
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import numpy
import logging
import json
import re
import shutil
import threading
import time
import pathlib
import uuid
from datetime import datetime, timezone
from typing import Tuple, Optional, List, Dict
from flask import Flask, request, jsonify, send_from_directory, redirect, g
from flask_cors import CORS
from pathlib import Path
from werkzeug.exceptions import BadRequest

# Load .env file (CRITICAL: Must be before other imports that use env vars)
from dotenv import load_dotenv
# Get project root (one level up from backend/)
project_root = Path(__file__).parent.parent
env_path = project_root / '.env'
load_dotenv(dotenv_path=env_path, override=True)  # Explicitly load .env from project root

# --- SAGE CONFIG & STARTUP GUARD (TRUTH IN AI) ---
sys.path.append(os.path.dirname(os.path.abspath(__file__))) # Ensure modules are importable
config_load_msg = []
try:
    from backend.modules.sage_config import config
    config_load_msg.append("==================================================")
    config_load_msg.append("   Sage Ultimate: Startup Guard Check")
    config_load_msg.append("==================================================")
    config_load_msg.append(f"[CONFIG] Telemetry Disabled: {config.get('privacy', 'disable_telemetry')}")
    config_load_msg.append(f"[CONFIG] Offline Mode:       {config.get('privacy', 'offline_mode')}")
    config_load_msg.append(f"[CONFIG] Self-Healing:       {config.get('features', 'enable_self_healing')}")
    config_load_msg.append(f"[CONFIG] ENV[ANONYMIZED_TELEMETRY]: {os.environ.get('ANONYMIZED_TELEMETRY', 'Not Set')}")
    config_load_msg.append("==================================================")
except ImportError:
    config_load_msg.append("[CRITICAL] Could not import SageConfig. Running in unsafe default mode.")

# Print to stdout immediately for CLI user
for msg in config_load_msg:
    print(msg)

print(f"[INFO] Loading .env from: {env_path}")
print(f"[KEY] NOTION_API_KEY={'SET' if os.getenv('NOTION_API_KEY') else 'NOT SET'}")
print(f"[KEY] TELEGRAM_BOT_TOKEN={'SET' if os.getenv('TELEGRAM_BOT_TOKEN') else 'NOT SET'}")
print(f"[KEY] BLUESKY_HANDLE={'SET' if os.getenv('BLUESKY_HANDLE') else 'NOT SET'}")
print(f"[KEY] PERPLEXITY_API_KEY={'SET (' + os.getenv('PERPLEXITY_API_KEY', '')[:8] + '...)' if os.getenv('PERPLEXITY_API_KEY') else 'NOT SET ⚠️'}")

# EnvGuardian: バックアップ & API Key検証 → NotionLogger に結果を記録
try:
    from backend.utils.env_guardian import env_guardian
    _missing_keys = env_guardian.run()
    try:
        from backend.integrations.notion_logger import notion_logger
        notion_logger.log_startup_health(_missing_keys)
    except Exception as _nl_err:
        print(f"[WARN] NotionLogger startup log failed: {_nl_err}")
except Exception as _eg_err:
    print(f"[WARN] EnvGuardian failed: {_eg_err}")

# パス設定 (モジュールが見つかるように)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# --- LOGGING SETUP (CRITICAL: Must be before other imports) ---
# Ensure logs directory exists
CURRENT_DIR = Path(__file__).parent.resolve()
LOG_DIR = CURRENT_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "sage_ultimate.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    force=True, # Python 3.8+ Feature to override existing handlers
    handlers=[
        logging.FileHandler(str(LOG_FILE), encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
logger.info("🚀 [SYSTEM] logging initialized: Writing to backend/logs/sage_ultimate.log")

# Log Startup Flags (Transparency)
import os
logger.info(f"🚀 [CONFIG] OFFLINE_MODE: {os.getenv('SAGE_OFFLINE_MODE', 'False')}")
logger.info(f"🚀 [CONFIG] SAGE_BYPASS_CHROMA: {os.getenv('SAGE_BYPASS_CHROMA', '0')}")
logger.info(f"🚀 [CONFIG] SAGE_BRAIN_STDP_ENABLED: {os.getenv('SAGE_BRAIN_STDP_ENABLED', '0')}")

# === IDENTITY LOADER ===
_IDENTITY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config', 'identity.json')

_IDENTITY_DEFAULTS = {
    "role": "AI monetization expert",
    "niche": "AI-powered side income and automation for solopreneurs",
    "tone": "professional yet approachable",
    "visual_style": "clean minimalist tech aesthetic",
    "language": "en",
    "brand_name": "Sage AI",
    "target_audience": "English-speaking solopreneurs who want passive income with AI tools"
}

def load_identity():
    """identity.jsonを読み込む。存在しない場合はデフォルト値を返す"""
    try:
        with open(_IDENTITY_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return dict(_IDENTITY_DEFAULTS)

IDENTITY = load_identity()
logger.info(f"[IDENTITY] Loaded: role={IDENTITY.get('role')}, niche={IDENTITY.get('niche')}")
# === END IDENTITY LOADER ===


logger.info(f"[INFO] Logging initialized. Writing to: {LOG_FILE}")

# --- FLUSH STARTUP GUARD TO LOG FILE ---
for msg in config_load_msg:
    logger.info(msg)


# Global reference for Healer Service (for API access)
healer_service_instance = None

# --- SAGE 3.0 MODULES (Global State) ---
LangGraphOrchestrator = None
SageMemory = None
AutonomousAdapter = None
StrategyManager = None
MonetizationMeasure = None

try:
    # Use absolute project root
    abs_project_root = str(Path(__file__).parent.parent.resolve())
    if abs_project_root not in sys.path:
        sys.path.insert(0, abs_project_root)
    
    # Import using absolute package path
    import backend.modules.langgraph_orchestrator_v2 as orchestrator_mod
    import backend.modules.sage_memory as memory_mod
    import backend.modules.autonomous_adapter as auto_mod
    import backend.modules.strategy_manager as strategy_mod
    import backend.modules.monetization_measure as money_mod
    import backend.modules.api_monitor as api_monitor_mod
    from backend.modules.consultative_generator import ConsultativeGenerator
    from backend.pipelines.course_production_pipeline import CourseProductionPipeline
    
    LangGraphOrchestrator = orchestrator_mod.LangGraphOrchestrator
    SageMemory = memory_mod.SageMemory
    AutonomousAdapter = auto_mod.AutonomousAdapter
    StrategyManager = strategy_mod.StrategyManager
    MonetizationMeasure = money_mod.MonetizationMeasure
    
    msg = "[SUCCESS] Sage 3.0 Modules Loaded Successfully."
    print(msg)
    logger.info(msg)
    
    # --- SNS SCHEDULER & WORKER IMPORTS ---
    try:
        from backend.scheduler.sns_daily_scheduler import SNSDailyScheduler
        from backend.scripts.job_runner import SageJobRunner
        from backend.scheduler.blog_scheduler import BlogScheduler
        from backend.scheduler.gumroad_scheduler import GumroadScheduler
        from backend.scheduler.notion_sync_scheduler import NotionSyncScheduler
        from backend.scheduler.market_scan_scheduler import MarketScanScheduler
        logger.info("[SUCCESS] SNS, Blog, Gumroad, Notion, and MarketScan schedulers imported.")
    except Exception as e:
        logger.error(f"[ERROR] SNS Startup Import Failure: {e}")

except Exception as e:
    import traceback
    error_msg = f"[ERROR] CRITICAL MODULE LOAD FAILURE: {e}\n{traceback.format_exc()}"
    print(error_msg)
    logger.error(error_msg)

# Logger is already configured above
# logging.basicConfig(...) 
# logger = logging.getLogger(__name__)

# [SAGE 3.0] Define Absolute Static Folder for SPA Stability
FRONTEND_DIST = (project_root / "dist").resolve()
if not FRONTEND_DIST.exists():
    logger.warning(f"[WARNING] Frontend dist folder not found at: {FRONTEND_DIST}")

app = Flask(__name__, static_folder=str(FRONTEND_DIST), static_url_path=None)

# Shared app state for system Blueprint (populated during init)
app.config['PROJECT_ROOT'] = str(project_root)
app.config['LOG_DIR'] = str(LOG_DIR)
app.config['ORCHESTRATOR'] = None
app.config['AUTONOMOUS'] = None
app.config['HEALER_SERVICE'] = None
app.config['LANGGRAPH_ORCHESTRATOR_CLS'] = LangGraphOrchestrator
app.config['MONETIZATION_MEASURE'] = MonetizationMeasure

# Shared state for productize Blueprint (populated during init)
app.config['TONE_PROMPTS_EN'] = None
app.config['TONE_PROMPTS_JA'] = None
app.config['IDENTITY'] = IDENTITY
app.config['GET_OR_INIT_PIPELINE'] = None
app.config['MEMORY'] = None
app.config['CONSULTATIVE_GEN'] = None
app.config['COURSE_GEN_GLOBAL'] = None
app.config['SAGE_SCHOLAR'] = None
app.config['CONTENT_MGR'] = None

# ── note.com uploader blueprint ──────────────────────────────────────────────
try:
    from backend.routes.note_routes import note_bp
    app.register_blueprint(note_bp)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"note_routes not loaded: {_e}")

# ── system blueprint (health, stats, brake) ───────────────────────────────────
try:
    from backend.routes.system import system_bp
    app.register_blueprint(system_bp)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"system routes not loaded: {_e}")

# ── store blueprint (stripe checkout, store crud, stripe webhook) ────────────
try:
    from backend.routes.store import store_bp
    app.register_blueprint(store_bp)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"store routes not loaded: {_e}")

# ── publish blueprint (sns status, monetization stats, engagement) ──────────
try:
    from backend.routes.publish import publish_bp
    app.register_blueprint(publish_bp)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"publish routes not loaded: {_e}")

# ── productize blueprint (productize, rewrite, images, finalize, monetization) ─
try:
    from backend.routes.productize import productize_bp
    app.register_blueprint(productize_bp)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"productize routes not loaded: {_e}")

# ── content blueprint (knowledge, content CRUD, files, PDF, video) ──────────
try:
    from backend.routes.content import content_bp
    app.register_blueprint(content_bp)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"content routes not loaded: {_e}")

# ── brain blueprint (brain stats, memory, research, browser, computer) ────
try:
    from backend.routes.brain import brain_bp, _TONE_PROMPTS_EN, _TONE_PROMPTS_JA
    app.register_blueprint(brain_bp)
    app.config['TONE_PROMPTS_EN'] = _TONE_PROMPTS_EN
    app.config['TONE_PROMPTS_JA'] = _TONE_PROMPTS_JA
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"brain routes not loaded: {_e}")

# ── automations blueprint (automation status, toggle, logs, trigger) ──────
try:
    from backend.routes.automations import automation_bp
    app.register_blueprint(automation_bp)
    from backend.routes.automations import (
        _automation_stop_events, _is_automation_active, _get_last_run_time, _record_run
    )
    app.config['AUTOMATION_STOP_EVENTS'] = _automation_stop_events
    app.config['RECORD_RUN'] = _record_run
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"auto routes not loaded: {_e}")
    _automation_stop_events = {}
    def _is_automation_active(_id): return True
    def _get_last_run_time(_id): return "Never"
    def _record_run(_id): pass

# ── misc blueprint (command/execute, admin/strategy, SPA catch-all) ──────
try:
    from backend.routes.misc import misc_bp
    app.register_blueprint(misc_bp)
    app.config['STRATEGY_MANAGER'] = StrategyManager
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"misc routes not loaded: {_e}")

# ── sns_writer blueprint (blog/gumroad run-now, bilingual posting, SNS sync) ──
try:
    from backend.routes.sns_writer import sns_writer_bp
    app.register_blueprint(sns_writer_bp)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"sns_writer routes not loaded: {_e}")

# ── chat / pilot blueprint (chat, pilot/chat, pilot/generate) ──────────
try:
    from backend.routes.chat import chat_bp
    app.register_blueprint(chat_bp)
except Exception as _e:
    import logging as _logging
    _logging.getLogger(__name__).warning(f"chat routes not loaded: {_e}")

# ── Background job store (pipeline async jobs) ───────────────────────────────
_jobs: Dict[str, dict] = {}        # job_id → {status, result, error, created_at}
_jobs_lock = threading.Lock()

def _job_get(job_id: str) -> Optional[dict]:
    with _jobs_lock:
        return _jobs.get(job_id)

def _job_set(job_id: str, **kwargs):
    with _jobs_lock:
        if job_id not in _jobs:
            _jobs[job_id] = {}
        _jobs[job_id].update(kwargs)

# Cleanup jobs older than 1 hour to avoid unbounded growth
def _jobs_gc():
    import time as _time
    cutoff = _time.time() - 3600
    with _jobs_lock:
        stale = [k for k, v in _jobs.items() if v.get('created_at', 0) < cutoff]
        for k in stale:
            del _jobs[k]
# ─────────────────────────────────────────────────────────────────────────────

# CORS — manual handler (flask-cors 4.x uses WSGI middleware which conflicts)
_DEV_ORIGINS = {
    "http://localhost:3000", "http://localhost:5000", "http://localhost:5001",
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
    "http://localhost:8000", "http://localhost:8001",  # LearnAI local server
    "http://127.0.0.1:3000", "http://127.0.0.1:5000", "http://127.0.0.1:5001",
    "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
    "http://127.0.0.1:8000", "http://127.0.0.1:8001",  # LearnAI local server
}

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    if origin in _DEV_ORIGINS or not origin:
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-ID"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# --- OBSERVABILITY & STRUCTURED LOGGING (Fortress Rotation) ---
STRUCTURED_LOG = LOG_DIR / "structured_access.jsonl"
from logging.handlers import RotatingFileHandler

# Configure a dedicated logger for structured (JSONL) data
# This ensures we have rotation (10MB per file, 5 backups) and thread-safety
struct_logger = logging.getLogger("sage_structured")
struct_logger.setLevel(logging.INFO)
struct_logger.propagate = False # Don't send to main sage_ultimate.log
if not struct_logger.handlers:
    s_handler = RotatingFileHandler(str(STRUCTURED_LOG), maxBytes=10*1024*1024, backupCount=5, encoding='utf-8')
    struct_logger.addHandler(s_handler)

def log_structured(event, data=None):
    """Helper to write 1 line JSON to access log with rotation"""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "request_id": getattr(g, 'request_id', 'unknown'),
        "event": event
    }
    if data:
        entry.update(data)
    try:
        struct_logger.info(json.dumps(entry))
    except Exception as e:
        logger.error(f"Failed to log structured event: {e}")

@app.before_request
def start_request_tracking():
    g.start_time = time.time()
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
    # Initial access log
    log_structured("http_request_start", {
        "method": request.method,
        "path": request.path,
        "ip": request.remote_addr,
        "agent": request.headers.get('User-Agent')
    })

@app.after_request
def finalize_request_tracking(response):
    duration = time.time() - getattr(g, 'start_time', time.time())
    response.headers['X-Request-ID'] = getattr(g, 'request_id', 'unknown')
    
    log_structured("http_request_end", {
        "method": request.method,
        "path": request.path,
        "status": response.status_code,
        "duration_ms": round(duration * 1000, 2)
    })
    return response

@app.errorhandler(BadRequest)
def handle_bad_request(e):
    # Global handler for malformed JSON or other BadRequests
    rid = getattr(g, "request_id", "unknown")
    resp = jsonify({
        "status": "error",
        "reason_code": "BAD_REQUEST",
        "message": str(e),
        "request_id": rid
    })
    resp.status_code = 400
    resp.headers["X-Request-ID"] = rid
    return resp



# Static serving is now handled by the catch-all

# (moved to routes/system.py)

# (moved to routes/system.py)


# (moved to routes/system.py)

# --- AUDIT LOGGING ---
try:
    from backend.modules.sage_audit import audit_logger
    print("[SUCCESS] SageAudit integration enabled.")
except ImportError:
    print("[WARNING] SageAudit module not found, audit logging disabled.")
    audit_logger = None

@app.after_request
def audit_log_request(response):
    # Log every request to audit.jsonl
    if not audit_logger:
        return response
        
    try:
        # Only log API calls to reduce noise
        # FILTER: Exclude frequent polling endpoints
        if request.path.startswith("/api/") and \
           request.path not in ["/api/system/healing-status", "/api/brain/stats/detailed", "/api/system/health"]:
            request_data = {}
            # Try to grab JSON body safely if interesting
            if request.is_json and request.content_length and request.content_length < 1000:
                request_data = request.get_json(silent=True) or {}
                
            details = {
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "ip": request.remote_addr,
                "input_snippet": str(request_data)[:100] if request_data else None
            }
            audit_logger.log_event("API_ACCESS", "user", details)
    except Exception as e:
        logger.error(f"Audit log failed: {e}")
    return response


# --- IDENTITY API ---
@app.route('/api/identity', methods=['GET'])
def get_identity():
    """現在のidentity設定を返す"""
    return jsonify(load_identity())

@app.route('/api/identity', methods=['POST'])
def save_identity():
    """identity.jsonを上書き保存する"""
    try:
        data = request.json
        required_keys = ['role', 'niche', 'tone', 'visual_style']
        for key in required_keys:
            if key not in data:
                return jsonify({'error': f'Missing key: {key}'}), 400

        os.makedirs(os.path.dirname(_IDENTITY_PATH), exist_ok=True)
        with open(_IDENTITY_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        global IDENTITY
        IDENTITY = data
        logger.info(f"[IDENTITY] Saved: role={data.get('role')}, niche={data.get('niche')}")
        return jsonify({'status': 'saved', 'identity': data})
    except Exception as e:
        logger.error(f"[IDENTITY] Save error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/identity/default', methods=['GET'])
def get_identity_default():
    """デフォルトのidentity設定を返す（ファイルは変更しない）"""
    return jsonify(_IDENTITY_DEFAULTS)

@app.route('/api/identity/reset', methods=['POST'])
def reset_identity():
    """identity.jsonをデフォルト値にリセットする"""
    try:
        os.makedirs(os.path.dirname(_IDENTITY_PATH), exist_ok=True)
        with open(_IDENTITY_PATH, 'w', encoding='utf-8') as f:
            json.dump(_IDENTITY_DEFAULTS, f, ensure_ascii=False, indent=2)
        global IDENTITY
        IDENTITY = dict(_IDENTITY_DEFAULTS)
        logger.info("[IDENTITY] Reset to defaults")
        return jsonify({'status': 'reset', 'identity': _IDENTITY_DEFAULTS})
    except Exception as e:
        logger.error(f"[IDENTITY] Reset error: {e}")
        return jsonify({'error': str(e)}), 500

# (moved to routes/publish.py)

# (moved to routes/publish.py)

# (moved to routes/publish.py)

# (moved to routes/publish.py)

# --- INITIALIZATION ---
orchestrator = None
memory = None
autonomous = None  # Phase 1: Autonomous adapter
consultative_gen = None # Consultative Content Generator
course_gen_global = None # Course Production Pipeline (Renamed from course_gen to fix caching)
sage_scholar = None # Sage Scholar (Legal Infinite Library)

_pipeline_init_lock = threading.Lock()

def init_course_pipeline(orchestrator_obj):
    global course_gen_global
    try:
        if CourseProductionPipeline is None:
             logger.error("[INIT] CourseProductionPipeline class is not imported.")
             return None
             
        course_gen_global = CourseProductionPipeline(
            ollama_client=getattr(orchestrator_obj, 'llm', None),
            groq_client=getattr(orchestrator_obj, 'groq_llm', None),
            gemini_client=getattr(orchestrator_obj, 'gemini_llm', None),
            image_agent=getattr(orchestrator_obj, 'image_agent', None),
            obsidian=getattr(orchestrator_obj, 'memory_agent', None),
            brain=getattr(orchestrator_obj, 'neuromorphic_brain', None)
        )
        app.config['COURSE_GEN_GLOBAL'] = course_gen_global
        logger.info("[INIT] Course Production Pipeline Ready.")
        return course_gen_global
    except Exception as e:
        logger.exception(f"[INIT] Course Production Pipeline init failed: {e}")
        course_gen_global = None
        app.config['COURSE_GEN_GLOBAL'] = None
        return None

def init_brain():
    global orchestrator, memory, autonomous, consultative_gen, course_gen_global, sage_scholar
    if LangGraphOrchestrator:
        try:
            memory = SageMemory() # ChromaDB / Unified Memory
            app.config['MEMORY'] = memory
            orchestrator = LangGraphOrchestrator() # The Master Brain
            app.config['ORCHESTRATOR'] = orchestrator
            
            # Initialize Consultative Generator with orchestrator's LLM
            if orchestrator and getattr(orchestrator, 'llm', None):
                consultative_gen = ConsultativeGenerator(llm=orchestrator.llm)
                app.config['CONSULTATIVE_GEN'] = consultative_gen
                logger.info("[INIT] Consultative Generator Ready.")
            else:
                consultative_gen = None
                logger.warning("[INIT] Consultative Generator skipped (orchestrator.llm is None)")
                
            # Decoupled initialization of Course Pipeline
            init_course_pipeline(orchestrator)

            # Initialize Sage Scholar (Legal Infinite Library)
            try:
                from backend.modules.sage_scholar import SageScholar
                sage_scholar = SageScholar()
                app.config['SAGE_SCHOLAR'] = sage_scholar
                logger.info("[INIT] Sage Scholar (arXiv/OpenAlex) Ready.")
            except Exception as e:
                logger.error(f"Sage Scholar Init Failed: {e}")
            
            logger.info("[BRAIN] Sage 3.0 Brain Initialized Successfully.")
            
            # Phase 1: Initialize autonomous adapter
            if AutonomousAdapter:
                # --- SAGE_AUTONOMOUS_ENABLED Check (Force Stop) ---
                import os
                def env_truthy(name: str, default="1") -> bool:
                    return str(os.getenv(name, default)).lower() in ("1", "true", "on", "yes")

                if env_truthy("SAGE_AUTONOMOUS_ENABLED", "1"):
                    try:
                        autonomous = AutonomousAdapter(orchestrator, memory)
                        app.config['AUTONOMOUS'] = autonomous
                        autonomous.start() # RESTORED: Enable autonomous loops
                        logger.info("[AUTO] Autonomous mode STARTED.")
                        
                        # --- Phase 1.5: SNS AUTOMATION RESTORATION ---
                        def run_sns_loops():
                            logger.info("[SNS] Starting SNS Automation Loops...")
                            
                            # Scheduler (Queuer)
                            def run_scheduler():
                                try:
                                    sched = SNSDailyScheduler()
                                    last_run_date = None
                                    while True:
                                        if not _automation_stop_events.get('bluesky', threading.Event()).is_set():
                                            now_utc = datetime.now(timezone.utc)
                                            # Run once per day at 23:00 UTC = 08:00 JST
                                            if now_utc.hour == 23 and now_utc.minute < 5 and last_run_date != now_utc.strftime('%Y-%m-%d'):
                                                logger.info("[SNS] SNS Scheduler: Checking for Ready content...")
                                                sched.run_cycle()
                                                _record_run("bluesky")
                                                last_run_date = now_utc.strftime('%Y-%m-%d')
                                        time.sleep(60)
                                except Exception as e:
                                    logger.error(f"[ERROR] SNS Scheduler Thread Error: {e}")

                            # Worker (Poster)
                            def run_worker():
                                try:
                                    runner = SageJobRunner()
                                    logger.info("[JOB] SNS Job Runner: Worker Active.")
                                    # SageJobRunner's run() method has its own sleep loop.
                                    # We inject a check inside its loop if possible, or just wrap it.
                                    while True:
                                        if not _automation_stop_events.get('sns_poster', threading.Event()).is_set():
                                            runner.run_once() # Assuming runner has run_once or we just let it run
                                        time.sleep(300)
                                except Exception as e:
                                    logger.error(f"[ERROR] SNS Job Runner Thread Error: {e}")

                            # Blog scheduler (JST 09:00 = UTC 00:00)
                            def run_blog_scheduler():
                                try:
                                    blog_sched = BlogScheduler()
                                    last_run_date = None

                                    # ── Catch-up on startup ──────────────────────────────────
                                    # Run immediately if no post exists yet for today (UTC)
                                    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
                                    posts_dir = "src/blog/posts"
                                    already_posted = (
                                        os.path.isdir(posts_dir) and
                                        any(f.startswith(today_str) for f in os.listdir(posts_dir) if f.endswith('.mdx'))
                                    )
                                    if already_posted:
                                        logger.info(f"[BLOG] Catch-up skipped: post already exists for {today_str}.")
                                    else:
                                        logger.info(f"[BLOG] Catch-up: no post for {today_str}, running now.")
                                        try:
                                            blog_sched.run_once()
                                            _record_run("blog")
                                        except Exception as ce:
                                            logger.error(f"[BLOG] Catch-up error: {ce}")
                                    last_run_date = today_str

                                    # ── Daily loop: fire at UTC 00:00 (JST 09:00) ────────────
                                    while True:
                                        if not _automation_stop_events.get('blog', threading.Event()).is_set():
                                            now_utc = datetime.now(timezone.utc)
                                            today_str = now_utc.strftime('%Y-%m-%d')
                                            if now_utc.hour == 0 and now_utc.minute < 5 and last_run_date != today_str:
                                                logger.info(f"[BLOG] Scheduled run for {today_str}.")
                                                try:
                                                    blog_sched.run_once()
                                                    _record_run("blog")
                                                except Exception as se:
                                                    logger.error(f"[BLOG] Scheduled run error: {se}")
                                                last_run_date = today_str
                                        time.sleep(60)
                                except Exception as e:
                                    logger.error(f"[ERROR] Blog Scheduler Thread Error: {e}")

                            # Gumroad scheduler (JST 10:00 = UTC 01:00)
                            def run_gumroad_scheduler():
                                try:
                                    gumroad_sched = GumroadScheduler()
                                    last_run_date = None

                                    # ── Catch-up on startup ──────────────────────────────────
                                    today_str = datetime.now().strftime('%Y-%m-%d')
                                    last_stored = _get_last_run_time("gumroad")
                                    if last_stored == "Never" or not last_stored.startswith(today_str):
                                        logger.info(f"[GUMROAD] Catch-up: last_run='{last_stored}', running now.")
                                        try:
                                            gumroad_sched.run_once()
                                            _record_run("gumroad")
                                        except Exception as ce:
                                            logger.error(f"[GUMROAD] Catch-up error: {ce}")
                                    else:
                                        logger.info(f"[GUMROAD] Catch-up skipped: already ran today ({last_stored}).")
                                    last_run_date = today_str

                                    # ── Daily loop: fire at UTC 01:00 (JST 10:00) ────────────
                                    while True:
                                        if not _automation_stop_events.get('gumroad', threading.Event()).is_set():
                                            now_utc = datetime.now(timezone.utc)
                                            today_str = datetime.now().strftime('%Y-%m-%d')
                                            if now_utc.hour == 1 and now_utc.minute < 5 and last_run_date != today_str:
                                                logger.info(f"[GUMROAD] Scheduled run for {today_str}.")
                                                try:
                                                    gumroad_sched.run_once()
                                                    _record_run("gumroad")
                                                except Exception as se:
                                                    logger.error(f"[GUMROAD] Scheduled run error: {se}")
                                                last_run_date = today_str
                                        time.sleep(60)
                                except Exception as e:
                                    logger.error(f"[ERROR] Gumroad Scheduler Thread Error: {e}")

                            def run_notion_scheduler():
                                try:
                                    notion_sched = NotionSyncScheduler()
                                    while True:
                                        if not _automation_stop_events.get('notion_sync', threading.Event()).is_set():
                                            notion_sched.run_git_sync()
                                            _record_run("notion_sync")
                                        time.sleep(3600)
                                except Exception as e:
                                    logger.error(f"[ERROR] Notion Sync Scheduler Thread Error: {e}")

                            # Engagement Bot (like-back + AI reply — 3x/day)
                            def run_engagement_bot():
                                try:
                                    from backend.integrations.engagement_bot import EngagementBot
                                    from backend.integrations.bluesky_agent import BlueskyAgent
                                    _bs_client = BlueskyAgent()
                                    _groq = getattr(orchestrator, 'groq_llm', None) or getattr(orchestrator, 'llm', None)
                                    eb = EngagementBot(
                                        bluesky_client=_bs_client,
                                        groq_client=_groq,
                                    )
                                    while True:
                                        if not _automation_stop_events.get('engagement', threading.Event()).is_set():
                                            if eb.should_run_now():
                                                eb.run_cycle()
                                                _record_run("engagement")
                                        time.sleep(600)  # Check every 10 min
                                except Exception as e:
                                    logger.error(f"[ERROR] Engagement Bot Thread Error: {e}")

                            # Market Scan Scheduler (JST 06:00 = UTC 21:00)
                            def run_market_scan_scheduler():
                                try:
                                    market_sched = MarketScanScheduler()
                                    market_sched.run()
                                except Exception as e:
                                    logger.error(f"[ERROR] Market Scan Scheduler Thread Error: {e}")

                            # Dream Scheduler (03:00 JST = UTC 18:00)
                            def run_dream_scheduler():
                                try:
                                    from backend.scheduler.dream_scheduler import DreamScheduler
                                    DreamScheduler().run_loop()
                                except Exception as e:
                                    logger.error(f"[ERROR] Dream Scheduler Thread Error: {e}", exc_info=True)

                            # Note.com Scheduler (10:00 JST daily)
                            def run_note_scheduler():
                                try:
                                    from backend.scheduler.note_scheduler import SageNoteScheduler
                                    note_sched = SageNoteScheduler()
                                    note_sched.start()
                                    # Keep thread alive while scheduler runs
                                    while note_sched.running:
                                        import time as _time
                                        _time.sleep(60)
                                except Exception as e:
                                    logger.error(f"[ERROR] Note Scheduler Thread Error: {e}", exc_info=True)

                            # Initialize events (IDはUIのautomation IDと一致させる)
                            for auto in ['bluesky', 'blog', 'gumroad', 'notion_sync', 'engagement', 'market_scan', 'self_test', 'dream_mode']:
                                if auto not in _automation_stop_events:
                                    _automation_stop_events[auto] = threading.Event()

                            # SNS Performance Tracker (JST 22:00 = UTC 13:00)
                            # Bluesky投稿のエンゲージメントを取得 → NeuromorphicBrainに学習させる
                            def run_sns_performance_tracker():
                                import time as _time
                                from datetime import datetime as _dt, timezone as _tz, timedelta as _td
                                JST = _tz(_td(hours=9))
                                logger.info("[SNS_TRACKER] Performance tracker thread started.")
                                while True:
                                    if os.path.exists("SAGE_STOP"):
                                        logger.warning("[SNS_TRACKER] SAGE_STOP detected. Exiting.")
                                        return
                                    now_jst = _dt.now(JST)
                                    target = now_jst.replace(hour=22, minute=0, second=0, microsecond=0)
                                    if now_jst >= target:
                                        target += _td(days=1)
                                    wait_sec = (target - now_jst).total_seconds()
                                    logger.info(f"[SNS_TRACKER] Next sync at {target.strftime('%Y-%m-%d %H:%M JST')} (in {wait_sec/3600:.1f}h)")
                                    elapsed = 0
                                    while elapsed < wait_sec:
                                        if os.path.exists("SAGE_STOP"):
                                            return
                                        _time.sleep(min(60, wait_sec - elapsed))
                                        elapsed += 60
                                    try:
                                        from backend.modules.sns_performance_tracker import SNSPerformanceTracker
                                        result = SNSPerformanceTracker().sync_and_learn()
                                        logger.info(f"[SNS_TRACKER] Done: learned={result.get('learned',0)} posts")
                                        _record_run("sns_performance")
                                    except Exception as e:
                                        logger.error(f"[SNS_TRACKER] Error: {e}", exc_info=True)
                                    _time.sleep(60)

                            threading.Thread(target=run_scheduler, daemon=True, name="SageSNSScheduler").start()
                            # threading.Thread(target=run_worker, daemon=True, name="SageSNSWorker").start() # Need to adapt JobRunner
                            threading.Thread(target=run_blog_scheduler, daemon=True, name="SageBlogScheduler").start()
                            threading.Thread(target=run_gumroad_scheduler, daemon=True, name="SageGumroadScheduler").start()
                            threading.Thread(target=run_notion_scheduler, daemon=True, name="SageNotionSyncScheduler").start()
                            # threading.Thread(target=run_engagement_bot, daemon=True, name="SageEngagementBot").start()
                            # EngagementBot DISABLED 2026-05-21: generating off-brand AI replies (e.g. "I'm a Trello fan")
                            # that damage credibility. Re-enable only after rewriting reply persona + adding topic filter.
                            threading.Thread(target=run_market_scan_scheduler, daemon=True, name="SageMarketScanScheduler").start()
                            threading.Thread(target=run_dream_scheduler, daemon=True, name="SageDreamScheduler").start()
                            threading.Thread(target=run_sns_performance_tracker, daemon=True, name="SageSNSPerformanceTracker").start()

                            # Self-Test Scheduler (JST 07:00 = UTC 22:00)
                            def run_self_test_scheduler():
                                try:
                                    from backend.scheduler.self_test_scheduler import SelfTestScheduler
                                    SelfTestScheduler().run()
                                except Exception as e:
                                    logger.error(f"[ERROR] Self Test Scheduler Thread Error: {e}")

                            threading.Thread(target=run_self_test_scheduler, daemon=True, name="SageSelfTestScheduler").start()
                            threading.Thread(target=run_note_scheduler, daemon=True, name="SageNoteScheduler").start()
                            logger.info("[SUCCESS] SNS + Blog + Gumroad + Notion + EngagementBot + MarketScan + Dream + SelfTest + Note Threads spawned.")

                        run_sns_loops()
                        
                    except Exception as e:
                        logger.error(f"[ERROR] Autonomous adapter or SNS failed: {e}")
                        autonomous = None
                else:
                    logger.info("[INFO] Autonomous mode disabled by env; not starting loop.")


        except Exception as e:
            logger.error(f"[ERROR] Brain Initialization Failed: {e}")



# --- Content Manager Integration (Unified Storage) ---
try:
    from backend.modules.content_manager import ContentManager
    content_mgr = ContentManager()
    app.config['CONTENT_MGR'] = content_mgr
    logger.info("[SUCCESS] Content Manager API Ready.")
except Exception as e:
    logger.error(f"Failed to init ContentManager: {e}")
    content_mgr = None
    app.config['CONTENT_MGR'] = None

app.config['INIT_BRAIN'] = init_brain



def get_or_init_pipeline():
    global course_gen_global, orchestrator

    if course_gen_global is not None:
        return course_gen_global

    orch = orchestrator
    if orch is not None:
        p = getattr(orch, 'coursepipeline', None)
        if p is not None:
            course_gen_global = p
            app.config['COURSE_GEN_GLOBAL'] = p
            return p

    with _pipeline_init_lock:
        if course_gen_global is not None:
            return course_gen_global
        if orchestrator is None:
            init_brain()
        if orchestrator is None:
            return None
        return init_course_pipeline(orchestrator)

app.config['GET_OR_INIT_PIPELINE'] = get_or_init_pipeline

# 起動時に脳をロード (Moved to __main__ for safe PID lock check)
# init_brain()










@app.route('/api/jobs/pipeline/start', methods=['POST'])
def jobs_pipeline_start():
    """
    Start pipeline as a background job.
    Body: { topic, type, plan, language, market, price, price_usd }
    Returns: { job_id }
    The job runs /api/productize/execute logic in a background thread.
    Poll GET /api/jobs/<job_id>/status for result.
    """
    import time as _time
    course_gen_ref = globals().get('course_gen_global')

    data = request.get_json(silent=True) or {}
    product_type = data.get('type', 'COURSE')
    topic = data.get('topic', '').strip()
    if not topic:
        return jsonify({"error": "topic is required"}), 400

    job_id = str(uuid.uuid4())
    _job_set(job_id, status='running', result=None, error=None, created_at=_time.time())
    _jobs_gc()

    def _run():
        try:
            if product_type == 'COURSE':
                if not course_gen_ref:
                    raise RuntimeError("Course Production Pipeline not initialized")
                language = data.get('language', 'auto')
                logger.info(f"[JOB:{job_id}] COURSE start: topic={topic} lang={language}")

                def _progress(pct, label):
                    _job_set(job_id, progress={'percent': pct, 'label': label})

                result = course_gen_ref.generate_course(topic=topic, language=language, progress_callback=_progress)
                # Whop auto-publish (graceful)
                try:
                    from backend.integrations.whop_publisher import create_and_publish, build_sns_caption
                    price_usd = float(data.get('price_usd', 29.99))
                    course_title = result.get('title') or topic
                    course_desc = result.get('description') or result.get('sales_page', '')[:800] or f'A comprehensive course on {topic}'
                    whop_result = create_and_publish(course_title, course_desc, price_usd=price_usd)
                    result['whop'] = whop_result
                    if whop_result.get('status') in ('success', 'dry_run'):
                        result['whop_captions'] = build_sns_caption(
                            course_title, price_usd,
                            whop_result.get('product_url', ''),
                            whop_result.get('checkout_url', ''),
                        )
                except Exception as whop_err:
                    logger.warning(f"[JOB:{job_id}] Whop skipped: {whop_err}")
                    result['whop'] = {'status': 'skipped', 'message': str(whop_err)}
                _job_set(job_id, status='done', result=result)
                logger.info(f"[JOB:{job_id}] COURSE done")
            else:
                raise ValueError(f"Unsupported product type: {product_type}")
        except Exception as e:
            logger.error(f"[JOB:{job_id}] Failed: {e}")
            _job_set(job_id, status='error', error=str(e))

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return jsonify({"job_id": job_id}), 202


@app.route('/api/jobs/<job_id>/status', methods=['GET'])
def jobs_status(job_id):
    """Poll job status. Returns { status: running|done|error, result?, error? }"""
    job = _job_get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    resp = {"status": job['status']}
    if job.get('progress'):
        resp['progress'] = job['progress']
    if job['status'] == 'done':
        resp['result'] = job.get('result')
    elif job['status'] == 'error':
        resp['error'] = job.get('error')
    return jsonify(resp), 200






# ============================================================
# Google Workspace Studio統合エンドポイント
# ============================================================

@app.route('/api/workspace', methods=['POST'])
def workspace_integration():
    # Accept requests from Google Workspace Studio.
    # Can access all Sage functions (Gemini, LangGraph, Memory).
    global orchestrator, memory
    
    try:
        # Workspace Studioから送られるデータ
        data = request.json
        user_message = data.get('message', '')
        trigger_type = data.get('trigger', 'manual')
        sender_email = data.get('sender', 'unknown')
        
        logger.info(f"[MAIL] Workspace trigger received: {trigger_type} from {sender_email}")
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            }), 400
        
        # 脳が死んでいる場合の蘇生
        if orchestrator is None:
            init_brain()
            if orchestrator is None:
                return jsonify({
                    'success': False,
                    'error': 'Sage Brain is offline'
                }), 500
        
        # 既存の /api/chat と同じロジックを使用
        # 賢者の全機能(Gemini, LangGraph, 記憶)が使える
        logger.info(f"[IN] Processing via Workspace: {user_message}")
        result = orchestrator.run(user_message)
        
        ai_response = result.get("final_response", "") if isinstance(result, dict) else str(result)
        
        if not ai_response:
            ai_response = "[SUCCESS] Task completed (No text output)."
        
        # メモリ保存
        if memory:
            memory.save_short_term('user', f"[Workspace:{trigger_type}] {user_message}")
            memory.save_short_term('assistant', ai_response)
        
        logger.info(f"[OUT] Workspace response: {ai_response[:100]}...")
        
        # Workspace Studioに返す
        from datetime import datetime
        return jsonify({
            'success': True,
            'response': ai_response,
            'trigger': trigger_type,
            'sender': sender_email,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"[ERROR] Workspace integration error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# (moved to routes/system.py)





# --- COMPUTER VISION / PC CONTROL (Sage's Eyes & Hands) ---











# (moved to routes/misc.py)

# (moved to routes/misc.py)

# (moved to routes/publish.py)

# (moved to routes/publish.py)

# (moved to routes/publish.py)

# (moved to routes/publish.py)

# (moved to routes/publish.py)











def generate_image_hf(prompt: str, width: int = 768, height: int = 512) -> str:
    """
    Generate image via HuggingFace SDXL. Returns base64 data URI on success,
    LoremFlickr URL as fallback (no API key needed).
    Requires HF_TOKEN in .env.
    """
    import base64 as _b64
    import hashlib as _hl
    hf_token = os.getenv("HF_TOKEN", "")
    if hf_token:
        try:
            res = requests.post(
                "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
                headers={"Authorization": f"Bearer {hf_token}"},
                json={"inputs": prompt, "parameters": {"width": width, "height": height}},
                timeout=120,
            )
            if res.status_code == 200 and res.headers.get("content-type", "").startswith("image"):
                b64 = _b64.b64encode(res.content).decode("utf-8")
                logger.info(f"[generate_image_hf] SDXL OK ({len(res.content)} bytes)")
                return f"data:image/jpeg;base64,{b64}"
        except Exception as e:
            logger.warning(f"[generate_image_hf] SDXL failed: {e}")
    # LoremFlickr fallback
    seed = int(_hl.md5(prompt.encode()).hexdigest(), 16) % 9999
    kw = prompt.split(",")[0].strip().replace(" ", ",")[:40]
    url = f"https://loremflickr.com/{width}/{height}/{kw}?lock={seed}"
    logger.info(f"[generate_image_hf] LoremFlickr fallback: {url}")
    return url








if __name__ == '__main__':
    import atexit
    
    # Graceful shutdown for autonomous mode
    def shutdown_autonomous():
        if autonomous:
            logger.info("Stopping autonomous mode...")
            autonomous.stop()
    
    atexit.register(shutdown_autonomous)
 # --- SELF HEALING AGENT INTEGRATION (Phase 1 Pivot) ---
    # --- Autonomous Security Check ---
    try:
        from backend.modules.self_healing_agent import SelfHealingAgent
        import threading
        from backend.modules.security_utils import SecurityUtils
        
        env_path = project_root / ".env"
        sec_result = SecurityUtils.auto_secure_env(str(env_path))
        logger.info(f"[SEC] Security Scan: {sec_result.get('message')}")
    except ImportError as e:
        logger.error(f"Import failed during startup: {e}")
    except Exception as e:
        logger.error(f"Security scan failed: {e}")


    # --- Self Healing Service (2026-01-21 FIX: NOW OPT-IN, NOT DEFAULT) ---
    if os.getenv("SAGE_ENABLE_SELF_HEALING", "False").lower() == "true":
        try:
            def start_healing_service():
                logger.info("[HEAL] Initializing SAGE Self-Healing Service...")
                try:
                    # Re-import to ensure it's fresh
                    import backend.modules.self_healing_agent as sha
                    import importlib
                    importlib.reload(sha)
                    
                    healer = sha.SelfHealingAgent()
                    global healer_service_instance
                    healer_service_instance = healer
                    app.config['HEALER_SERVICE'] = healer
                    
                    # Start watching (this will block the thread, which is fine)
                    healer.watch_and_heal(interval=1.0)
                except Exception as e:
                    logger.error(f"Failed to start Self-Healing Service: {e}")

            # P1 SAFETY: Set daemon=True so this thread dies when main Flask thread dies
            healing_thread = threading.Thread(target=start_healing_service, daemon=True)
            # Start server
            print("[SUCCESS] Sage Multi-Agent Orchestrator Ready (24/7 Autonomy Active)")
        except Exception as e:
            logger.error(f"Failed to start autonomous adapter: {e}")
    else:
        print("[INFO] Autonomy Loop is DISABLED (Set SAGE_ENABLE_AUTONOMY=True to enable)")


    # Start Flask (PRODUCTION MODE DEFAULT)
    debug_mode = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    port = int(os.getenv("SAGE_PORT", 8080))
    
    # Startup Mode Visibility (No Lies)
    mode_str = "🔧 DEVELOPMENT MODE" if debug_mode else "🚀 PRODUCTION MODE"
    print("=" * 60)
    print(f"  {mode_str}")
    print(f"  PORT: {port}")
    print(f"  DEBUG: {debug_mode}")
    print(f"  SELF-HEALING: {'Enabled' if os.getenv('SAGE_ENABLE_SELF_HEALING', 'False').lower() == 'true' else 'Disabled (Default)'}")
    print("=" * 60)

    
    # --- P1 SAFETY: SINGLE INSTANCE LOCK & ZOMBIE KILLER ---
    PID_FILE = project_root / f"sage_server_{port}.pid"
    import signal
    
    def handle_pid_lock():
        # CRITICAL FIX (2026-01-21): Immediately EXIT if another instance is alive.
        # Old logic: Kill existing -> Continue (caused cascade restarts)
        # New logic: Detect existing -> EXIT NOW (prevents multi-spawn)
        if PID_FILE.exists():
            try:
                with open(PID_FILE, 'r') as f:
                    old_pid = int(f.read().strip())
                
                # CRITICAL: If process is alive, EXIT IMMEDIATELY
                if psutil.pid_exists(old_pid):
                    print(f"🚫 FATAL: Sage Server already running! (PID: {old_pid})")
                    print(f"   Location: {PID_FILE}")
                    print(f"   Action: EXITING NOW to prevent multi-spawn.")
                    print(f"   Hint: Use 'taskkill /PID {old_pid} /F' to stop it manually.")
                    import sys
                    sys.exit(1)  # IMMEDIATE EXIT
                else:
                    print(f"ℹ️ Found stale PID file ({old_pid}). Safe to proceed.")
            except Exception as e:
                print(f"⚠️ PID file check failed: {e}. Proceeding with caution.")
        
        # Write new PID
        current_pid = os.getpid()
        with open(PID_FILE, 'w') as f:
            f.write(str(current_pid))
        print(f"🔒 PID Lock established: {current_pid} (PORT: {port})")
        
    def cleanup_pid():
        if PID_FILE.exists():
            PID_FILE.unlink()
            
    atexit.register(cleanup_pid)

    try:
        import psutil
    except ImportError:
        psutil = None

    handle_pid_lock()

    # Init brain + SNS schedulers after PID lock, before server start
    try:
        if orchestrator is None:
            init_brain()
    except Exception as e:
        logger.error(f"[ERROR] Startup init_brain failed (server will start without autonomous): {e}")

    app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False)

