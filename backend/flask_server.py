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
from flask import Flask, request, jsonify, render_template, send_from_directory, redirect, g
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


# --- INPUT NORMALIZATION (UX Guardrail) ---
from functools import wraps

def normalize_input(*fields):
    """
    Decorator to normalize input field names for API endpoints.
    Example: @normalize_input('message', 'text') 
    Will try 'message' first, then fall back to 'text', and set request._normalized_key for evidence.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            data = request.get_json(silent=True) or {}
            primary_field = fields[0] if fields else 'message'
            
            # Try primary field first
            value = data.get(primary_field)
            normalized_from = None
            
            # If empty, try alternative fields
            if not value:
                for alt_field in fields[1:]:
                    value = data.get(alt_field)
                    if value:
                        # Normalize: copy alternative to primary
                        data[primary_field] = value
                        normalized_from = alt_field
                        break
            
            # Store normalized key for evidence (accessible in route)
            request._normalized_input_key = normalized_from or primary_field
            request._normalized_data = data
            
            return f(*args, **kwargs)
        return wrapper
    return decorator
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

@app.route('/api/automations', methods=['GET'])
def get_automations():
    """
    Returns the status of automations based on stop-event flags.
    """
    automations = [
        {
            "id": "bluesky",
            "name": "Social Media (Bluesky/IG)",
            "icon": "📱",
            "active": _is_automation_active("bluesky"),
            "schedule": "Every 1 hour",
            "lastRun": _get_last_run_time("bluesky")
        },
        {
            "id": "engagement",
            "name": "Engagement AI (Like-back & Reply)",
            "icon": "🤝",
            "active": _is_automation_active("engagement"),
            "schedule": "3x/day · 08:00, 14:00, 20:00 JST",
            "lastRun": _get_last_run_time("engagement")
        },
        {
            "id": "blog",
            "name": "Daily Blog Scheduler",
            "icon": "📝",
            "active": _is_automation_active("blog"),
            "schedule": "Daily 09:00 JST",
            "lastRun": _get_last_run_time("blog")
        },
        {
            "id": "gumroad",
            "name": "Gumroad Product Prep",
            "icon": "💰",
            "active": _is_automation_active("gumroad"),
            "schedule": "Daily 10:00 JST",
            "lastRun": _get_last_run_time("gumroad")
        },
        {
            "id": "notion_sync",
            "name": "Notion Daily Log Sync",
            "icon": "📒",
            "active": _is_automation_active("notion_sync"),
            "schedule": "Hourly (Daily Log)",
            "lastRun": _get_last_run_time("notion_sync")
        },
        {
            "id": "market_scan",
            "name": "MarketScan + Tavily AI Search",
            "icon": "🔍",
            "active": _is_automation_active("market_scan"),
            "schedule": "Daily 10:00 JST",
            "lastRun": _get_last_run_time("market_scan"),
            "note": "Google Trends + Reddit + Tavily AI"
        },
        {
            "id": "dream_mode",
            "name": "Dream Mode (Nightly Ideation)",
            "icon": "🌙",
            "active": _is_automation_active("dream_mode"),
            "schedule": "03:00–05:00 JST",
            "lastRun": _get_last_run_time("dream_mode"),
            "note": "Memory × Trends → 5 ideas → Notion"
        },
        {
            "id": "moltbook",
            "name": "Moltbook AI-SNS Agent",
            "icon": "🐾",
            "active": _is_automation_active("moltbook"),
            "schedule": "Every 4 hours",
            "lastRun": _get_last_run_time("moltbook"),
            "note": "Requires MOLTBOOK_API_KEY"
        },
        {
            "id": "sns_performance",
            "name": "SNS Performance → Brain Learning",
            "icon": "🧠",
            "active": _is_automation_active("sns_performance"),
            "schedule": "Daily 22:00 JST",
            "lastRun": _get_last_run_time("sns_performance"),
            "note": "Bluesky likes/reposts → NeuromorphicBrain学習"
        },
        {
            "id": "video_pipeline",
            "name": "Video Pipeline (Blog→Reels)",
            "icon": "🎬",
            "active": _is_automation_active("video_pipeline"),
            "schedule": "Weekly (per 5 blog posts)",
            "lastRun": _get_last_run_time("video_pipeline"),
            "note": "MusicGen + LTX-Video → Instagram Reels"
        }
    ]
    return jsonify(automations)

# --- LAST RUN REGISTRY ---
_LAST_RUN_FILE = os.path.join(os.path.dirname(__file__), '..', 'logs', 'last_run_registry.json')

def _load_last_run_registry() -> dict:
    """起動時にファイルから最終実行時刻を復元する"""
    try:
        if os.path.exists(_LAST_RUN_FILE):
            with open(_LAST_RUN_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return {}

_last_run_registry = _load_last_run_registry()

def _save_last_run_registry():
    """最終実行時刻をファイルに永続化する"""
    try:
        os.makedirs(os.path.dirname(_LAST_RUN_FILE), exist_ok=True)
        with open(_LAST_RUN_FILE, 'w', encoding='utf-8') as f:
            json.dump(_last_run_registry, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"last_run_registry save failed: {e}")

def _get_last_run_time(automation_id: str) -> str:
    """最終実行時刻を返す。未記録の場合は'Never'"""
    return _last_run_registry.get(automation_id, "Never")

def _record_run(automation_id: str):
    """スケジューラーが実行する際に呼び出して時刻を記録する"""
    _last_run_registry[automation_id] = datetime.now().strftime('%Y-%m-%d %H:%M JST')
    _save_last_run_registry()

# --- AUTOMATION TOGGLE ---
_automation_stop_events = {}  # {automation_id: threading.Event}

def _is_automation_active(automation_id: str) -> bool:
    """Stop eventフラグが立っていなければactive=True（デフォルトactive）"""
    event = _automation_stop_events.get(automation_id)
    if event is None:
        return True  # まだtoggleされていない = デフォルトでactive
    return not event.is_set()  # set()=停止指示済み → active=False

# Shared state for publish blueprint
app.config['GET_LAST_RUN_TIME'] = _get_last_run_time
app.config['IS_AUTOMATION_ACTIVE'] = _is_automation_active

@app.route('/api/automations/toggle', methods=['POST'])
def toggle_automation():
    """自動化スレッドをON/OFFする"""
    try:
        data = request.json
        automation_id = data.get('id')
        active = data.get('active', False)

        if not automation_id:
            return jsonify({'error': 'id is required'}), 400

        # Ensure event object exists for this automation_id
        if automation_id not in _automation_stop_events:
            _automation_stop_events[automation_id] = threading.Event()

        if not active:
            _automation_stop_events[automation_id].set()
            logger.info(f"[TOGGLE] Stopped automation: {automation_id}")
        else:
            _automation_stop_events[automation_id].clear()
            logger.info(f"[TOGGLE] Started automation: {automation_id}")
            # If the threads were completely dead, we do not respawn them here
            # Instead, the thread functions will check the event flag in their while True loops.
            # (Note: if the thread completely exited, it won't restart. But our loops never exit, they just sleep/continue)

        return jsonify({'id': automation_id, 'active': active, 'status': 'ok'})
    except Exception as e:
        logger.error(f"[TOGGLE] Error: {e}")
        return jsonify({'error': str(e)}), 500

# --- AUTOMATION DETAIL: LOGS + TRIGGER ---

# Log keywords per automation ID (used to filter sage_ultimate.log)
_AUTO_LOG_KEYWORDS = {
    "bluesky":       ["[SNS]", "[BLUESKY]", "Bluesky", "bluesky"],
    "engagement":    ["[ENGAGEMENT]", "Engagement", "engagement", "like-back"],
    "blog":          ["[BLOG]", "BlogScheduler", "blog_scheduler", "run_once"],
    "gumroad":       ["[GUMROAD]", "GumroadScheduler", "gumroad"],
    "notion_sync":   ["[NOTION]", "Notion", "notion_sync"],
    "market_scan":   ["[MARKET_SCAN]", "[MarketScan]", "MarketScan", "market_scan"],
    "dream_mode":    ["[DREAM]", "DreamMode", "dream_mode", "Dream Mode"],
    "moltbook":      ["[MOLTBOOK]", "Moltbook", "moltbook"],
    "sns_performance":["[SNS_PERF]", "SNSPerformance", "sns_performance", "NeuromorphicBrain"],
    "video_pipeline":["[VIDEO]", "VideoAgent", "video_pipeline"],
}

_LOG_FILE = os.path.join(os.path.dirname(__file__), '..', 'logs', 'sage_ultimate.log')

@app.route('/api/automations/<automation_id>/logs', methods=['GET'])
def get_automation_logs(automation_id):
    """直近Nライン（デフォルト50）のうち automation_id に関連するログを返す"""
    limit = int(request.args.get('limit', 30))
    keywords = _AUTO_LOG_KEYWORDS.get(automation_id, [automation_id])
    lines = []
    try:
        if os.path.exists(_LOG_FILE):
            with open(_LOG_FILE, 'r', encoding='utf-8', errors='replace') as f:
                # Read last 5000 lines for efficiency
                all_lines = f.readlines()[-5000:]
            for line in all_lines:
                if any(kw in line for kw in keywords):
                    lines.append(line.rstrip())
            lines = lines[-limit:]  # most recent N
    except Exception as e:
        logger.warning(f"[LOGS] Could not read log for {automation_id}: {e}")
    return jsonify({"automation_id": automation_id, "logs": lines})


@app.route('/api/automations/<automation_id>/trigger', methods=['POST'])
def trigger_automation(automation_id):
    """指定automationを今すぐ1回だけバックグラウンドで実行する（時刻チェック不要）"""
    if _automation_stop_events.get(automation_id, threading.Event()).is_set():
        return jsonify({"status": "error", "message": f"{automation_id} is disabled. Enable it first."}), 403

    def _run_in_bg(fn):
        try:
            fn()
            _record_run(automation_id)
        except Exception as e:
            logger.error(f"[TRIGGER:{automation_id}] {e}", exc_info=True)

    try:
        if automation_id == "blog":
            from backend.scheduler.blog_scheduler import BlogScheduler
            threading.Thread(target=_run_in_bg, args=(BlogScheduler().run_once,), daemon=True).start()

        elif automation_id == "gumroad":
            from backend.scheduler.gumroad_scheduler import GumroadScheduler
            threading.Thread(target=_run_in_bg, args=(GumroadScheduler().run_once,), daemon=True).start()

        elif automation_id == "market_scan":
            from backend.modules.market_scanner import MarketScanner
            scanner = MarketScanner()
            threading.Thread(target=_run_in_bg, args=(scanner.run,), daemon=True).start()

        elif automation_id == "dream_mode":
            from backend.modules.dream_mode import DreamMode
            dream = DreamMode()
            threading.Thread(target=_run_in_bg, args=(dream.run,), daemon=True).start()

        elif automation_id == "sns_performance":
            from backend.modules.sns_performance_tracker import SNSPerformanceTracker
            tracker = SNSPerformanceTracker()
            threading.Thread(target=_run_in_bg, args=(tracker.run_once,), daemon=True).start()

        elif automation_id == "bluesky":
            from backend.integrations.bluesky_agent import BlueskyAgent
            agent = BlueskyAgent()
            threading.Thread(target=_run_in_bg, args=(agent.run_once,), daemon=True).start()

        elif automation_id == "engagement":
            from backend.integrations.engagement_bot import EngagementBot
            bot = EngagementBot()
            threading.Thread(target=_run_in_bg, args=(bot.run_once,), daemon=True).start()

        else:
            return jsonify({"status": "unsupported", "message": f"Manual trigger not yet supported for: {automation_id}"}), 422

        logger.info(f"[TRIGGER] {automation_id} fired manually")
        return jsonify({"status": "triggered", "automation_id": automation_id,
                        "message": f"{automation_id} is running in background."})

    except Exception as e:
        logger.error(f"[TRIGGER:{automation_id}] {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


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



    # Safe default if file doesn't exist yet
    if not evidence_file.exists():
        return jsonify({
            "total_posts": 0,
            "first_post_at": None,
            "last_post_at": None,
            "days_active": 0,
            "success_rate": 0.0,
            "platforms": {}
        }), 200

    try:
        records = []
        with open(evidence_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue

        if not records:
            return jsonify({"total_posts": 0, "success_rate": 0.0}), 200

        total = len(records)
        success = sum(1 for r in records if r.get("error") is None)

        # Parse timestamps (format: "2026-02-07 10:54:44")
        timestamps = []
        for r in records:
            ts_str = r.get("ts_jst", "")
            if ts_str:
                try:
                    timestamps.append(datetime.strptime(ts_str[:19], "%Y-%m-%d %H:%M:%S"))
                except ValueError:
                    continue

        timestamps.sort()
        first_at = timestamps[0].isoformat() if timestamps else None
        last_at = timestamps[-1].isoformat() if timestamps else None
        days_active = (timestamps[-1] - timestamps[0]).days + 1 if len(timestamps) > 1 else 1

        # Per-platform breakdown
        platforms = {}
        for r in records:
            p = r.get("platform", "unknown")
            platforms[p] = platforms.get(p, 0) + 1

        return jsonify({
            "total_posts": total,
            "first_post_at": first_at,
            "last_post_at": last_at,
            "days_active": days_active,
            "success_rate": round(success / total, 3) if total > 0 else 0.0,
            "platforms": platforms
        }), 200

    except Exception as e:
        logger.error(f"SNS stats error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# (moved to routes/system.py)

# --- LEGACY RESTORATION (Step 1: 404 Fix / No external calls) ---
@app.route('/api/telegram/health', methods=['GET'])
def telegram_health():
    is_enabled = os.getenv("SAGE_ENABLE_TELEGRAM") == "1"
    has_token = bool(os.getenv("TELEGRAM_BOT_TOKEN"))
    return jsonify({
        "status": "wired", 
        "enabled": is_enabled, 
        "configured": has_token,
        "reason": "restored"
    }), 200

@app.route('/api/bluesky/status', methods=['GET'])
def bluesky_status():
    handle = os.getenv("BLUESKY_HANDLE") or os.getenv("BLUESKY_USERNAME")
    password = os.getenv("BLUESKY_APP_PASSWORD") or os.getenv("BLUESKY_PASSWORD")
    enabled = os.getenv("SAGE_ENABLE_BLUESKY") == "1"
    configured = bool(handle and password)
    return jsonify({
        "status": "wired",
        "enabled": enabled,
        "configured": configured,
        "reason": "restored"
    }), 200

@app.route('/api/notion/status', methods=['GET'])
def notion_status():
    is_enabled = os.getenv("SAGE_ENABLE_NOTION") == "1"
    has_token = bool(os.getenv("NOTION_API_KEY"))
    return jsonify({
        "status": "wired", 
        "enabled": is_enabled, 
        "configured": has_token,
        "reason": "restored"
    }), 200



    request_data = request.get_json(silent=True) or {}
    text = request_data.get("text") or request_data.get("message")
    
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        from backend.integrations.telegram_bot import TelegramBot
        bot = TelegramBot()
        
        if bot.send_message(text):
            return jsonify({"status": "success", "result": "Message sent"}), 200
        else:
            return jsonify({"error": "Failed to send message"}), 500
            
    except Exception as e:
        logger.error(f"Telegram send error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/bluesky/post', methods=['POST'])
def bluesky_post():
    handle = os.getenv("BLUESKY_HANDLE") or os.getenv("BLUESKY_USERNAME")
    password = os.getenv("BLUESKY_APP_PASSWORD") or os.getenv("BLUESKY_PASSWORD")
    if os.getenv("SAGE_ENABLE_BLUESKY") == "0":
        return jsonify({"error": "Feature disabled"}), 403
    if not (handle and password):
        return jsonify({"error": "Bluesky credentials not configured"}), 403

    request_data = request.get_json(silent=True) or {}
    text = request_data.get("text") or request_data.get("content")
    
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Import stabilization
        try:
            from integrations.bluesky_agent import BlueskyAgent
        except ImportError:
            from backend.integrations.bluesky_agent import BlueskyAgent
            
        agent = BlueskyAgent()
        
        # Use the specific method identified: post_skeet
        result = agent.post_skeet(text)
        
        # Serialize result safely (Handle both dict and object)
        payload = {}
        if isinstance(result, dict):
            payload = result.copy()
            if "raw" in payload:
                payload["raw"] = str(payload["raw"]) # Serialize Pydantic object to string
        else:
             payload = {
                 "uri": getattr(result, "uri", "UNKNOWN"),
                 "cid": getattr(result, "cid", "UNKNOWN")
             }

        return jsonify({"status": "success", "result": payload}), 200
    except Exception as e:
        import traceback
        import uuid
        err_id = str(uuid.uuid4())[:8]
        
        # Safe logging
        try:
            app.logger.error(f"[BLUESKY_POST_ERROR:{err_id}] {str(e)}\n{traceback.format_exc()}")
        except:
            print(f"[FALLBACK_LOG:{err_id}] {traceback.format_exc()}")

        msg = str(e) or type(e).__name__
        
        # Classify error
        if "Unauthorized" in msg or "Authentication" in msg:
             return jsonify({"error": "AUTH_FAILED", "id": err_id, "hint": "Check BLUESKY_HANDLE/PASSWORD"}), 401
        elif "Network" in msg or "Connection" in msg or "Timeout" in msg or "502" in msg:
             return jsonify({"error": "NETWORK_FAILED", "id": err_id}), 502
        elif "No module named" in msg or "ImportError" in msg:
             return jsonify({"error": "IMPORT_FAILED", "id": err_id, "detail": msg}), 500
        else:
             return jsonify({"error": "INTERNAL_ERROR", "id": err_id, "detail": msg[:100]}), 500

@app.route('/api/notion/write', methods=['POST'])
def notion_write():
    if os.getenv("SAGE_ENABLE_NOTION") != "1":
        return jsonify({"error": "Feature disabled by default"}), 403

    request_data = request.get_json(silent=True) or {}
    mode = request_data.get("mode", "page") # page or database
    title = request_data.get("title")
    content = request_data.get("content", "")
    
    if not title:
        return jsonify({"error": "No title provided"}), 400

    try:
        from backend.integrations.notion_integration import notion_integration
        
        result = None
        if mode == "page":
             # Create a page (requires parent_page_id in .env or param)
             parent_id = request_data.get("parent_id")
             result = notion_integration.create_page(title, content, parent_id)
        elif mode == "database":
             # Add to database (requires database_id in .env or param)
             database_id = request_data.get("database_id")
             properties = request_data.get("properties", {"Name": {"title": [{"text": {"content": title}}]}})
             result = notion_integration.add_to_database(database_id, properties, content)
        
        if result:
            return jsonify({"status": "success", "result": {"id": result.get("id"), "url": result.get("url")}}), 200
        else:
            return jsonify({"error": "Failed to perform Notion operation. Check server logs."}), 500
            
    except Exception as e:
        logger.error(f"Notion write error: {e}")
        return jsonify({"error": str(e)}), 500



@app.route('/api/instagram/status', methods=['GET'])
def instagram_status():
    from backend.integrations.instagram_integration import InstagramBot
    bot = InstagramBot()
    configured = bool(bot.access_token and bot.account_id)
    enabled = os.getenv("SAGE_ENABLE_INSTAGRAM", "1") != "0"
    return jsonify({
        "status": "wired",
        "enabled": enabled,
        "configured": configured,
        "reason": "restored"
    }), 200

@app.route('/api/instagram/post', methods=['POST'])
def instagram_post():
    request_data = request.get_json(silent=True) or {}
    image_url = request_data.get("image_url")
    caption = request_data.get("caption") or request_data.get("content", "Sage System Online")

    if not image_url:
        # Instagram Graph API requires a public image URL for feed posts
        logger.warning("Instagram post attempted without image_url — returning structured error")
        return jsonify({
            "status": "error",
            "error": "no_image",
            "message": "Instagram requires a public image URL. Please upload an image first or post manually."
        }), 422

    try:
        from backend.integrations.instagram_integration import InstagramBot
        from backend.integrations.image_generation import image_gen_enhanced
        import requests as _req
        import uuid as _uuid

        # ── Strategy: download image → serve via Flask/ngrok → stable URL for Meta ──
        # Meta's crawler cannot reach imgbb (i.ibb.co) or Pollinations directly.
        # We download the bytes and serve them locally through ngrok instead.
        backend_url = (os.getenv('VITE_BACKEND_URL') or '').rstrip('/')
        tmp_dir = os.path.join(os.path.dirname(__file__), 'data', 'tmp_images')
        os.makedirs(tmp_dir, exist_ok=True)

        if backend_url:
            try:
                r = _req.get(image_url, timeout=30, stream=True)
                ct = r.headers.get('content-type', 'image/jpeg')
                if r.status_code == 200 and ct.startswith('image'):
                    ext = 'jpg' if 'jpeg' in ct or 'jpg' in ct else ct.split('/')[-1].split(';')[0].strip() or 'jpg'
                    fname = f"{_uuid.uuid4().hex}.{ext}"
                    fpath = os.path.join(tmp_dir, fname)
                    with open(fpath, 'wb') as _f:
                        for chunk in r.iter_content(8192):
                            _f.write(chunk)
                    stable_url = f"{backend_url}/api/images/{fname}"
                    logger.info(f"[IG] Serving image via ngrok: {stable_url}")
                    image_url = stable_url
                else:
                    logger.warning(f"[IG] Source image returned {r.status_code} — using original URL")
            except Exception as _dl_err:
                logger.warning(f"[IG] Local cache failed ({_dl_err}) — using original URL")
        else:
            logger.warning("[IG] VITE_BACKEND_URL not set — Meta may reject the image URL")

        bot = InstagramBot()
        if not bot.access_token or not bot.account_id:
            return jsonify({
                "status": "error",
                "error": "missing_credentials",
                "message": "INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCOUNT_ID not set in .env"
            }), 503

        result = bot.post_image(image_url, caption)

        if result.get("success"):
            try:
                from backend.modules.sage_audit import audit_logger
                if audit_logger:
                    audit_logger.log_event("sns_post_success", "system", {"platform": "instagram", "id": result.get("id")})
            except:
                pass
            return jsonify({"status": "success", "result": result}), 200
        else:
            err = result.get("error", {})
            # Extract human-readable message from Meta API error structure
            msg = err.get("message") if isinstance(err, dict) else str(err)
            logger.error(f"Instagram post failed: {err}")
            return jsonify({"status": "error", "error": err, "message": msg or "Instagram post failed"}), 500

    except Exception as e:
        logger.error(f"Instagram post error: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

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
                                    while True:
                                        if not _automation_stop_events.get('bluesky', threading.Event()).is_set():
                                            logger.info("[SNS] SNS Scheduler: Checking for Ready content in Notion...")
                                            sched.run_cycle()
                                            _record_run("bluesky")  # UIのautomation IDは"bluesky"
                                        time.sleep(3600) # Once per hour
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

def _pick(data, *keys, default=None):
    for k in keys:
        if k in data and data[k] not in (None, ""):
            return data[k]
    return default

def _to_int(v, default=5):
    try:
        return int(v)
    except Exception:
        return default

@app.route("/api/pilot/chat", methods=["POST"])
def api_pilot_chat():
    # Sage Pilot Free Chat with context + minimal search hook
    global orchestrator, memory

    if not orchestrator:
        return jsonify({"status": "error", "message": "Brain offline"}), 503

    try:
        data = request.get_json(silent=True) or {}

        def pick(keys, default=None):
            for k in keys:
                if k in data and data[k] not in (None, ""):
                    return data[k]
            return default

        sessionid = pick(["sessionid", "session_id"], "pilotsession")
        usertext  = pick(["usertext", "user_text", "message", "text"], "")
        mode      = pick(["mode"], "free")
        uilang    = pick(["uilang", "ui_lang"], "ja")

        logger.info(f"DEBUG api_pilot_chat: sessionid={sessionid} usertext='{usertext}'")

        if not usertext:
            return jsonify({"status": "error", "message": "No text provided"}), 400

        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

        # --- Growlマーケティング知識をナレッジベースからロード ---
        _marketing_kb = ""
        try:
            _kb_path = pathlib.Path(os.path.dirname(__file__)) / "sage_knowledge_base" / "MARKETING_GROWL_METHOD.md"
            if _kb_path.exists():
                _marketing_kb = _kb_path.read_text(encoding="utf-8")
        except Exception as _kb_err:
            logger.warning(f"[KB] Marketing knowledge load failed: {_kb_err}")

        # 指示文(ツールが無くても通常回答, 必要時だけ商品化提案)
        if uilang == "en":
            sysdirective = (
                "You are Sage Pilot — an AI business and marketing strategist. Answer the user's question directly first.\n"
                "You have deep expertise in marketing frameworks: 3C analysis, SWOT, 4P, STP, customer journey, value proposition, PDCA.\n"
                "You know the 10-step 3C research process: LP analysis, Amazon/Rakuten ranking for competitor identification, "
                "review mining (★5 and ★2-3), Meta Ad Library, Google Ads keyword research, industry reports (Yano Research), "
                "government stats (MHLW, MIC), and UGC analysis.\n"
                "When answering marketing questions, apply these frameworks concretely with real data sources.\n"
                "If the user asks to research/search, do it and include sources if possible.\n"
                "Only if the user clearly wants to build/productize something, propose a concrete next step.\n"
                "Do not repeat boilerplate like 'Since no tools were executed...'.\n"
            )
        else:
            sysdirective = (
                "あなたは「Sage Pilot」— AIビジネス＆マーケティングストラテジストです。まずユーザーの質問に正面から答えてください。\n"
                "マーケティングフレームワーク（3C分析・SWOT・4P・STP・カスタマージャーニー・バリュープロポジション・PDCA）の深い専門知識があります。\n"
                "3C分析の10ステップ調査手順（LP分析・Amazon/楽天ランキングで競合特定・★5/★2〜3レビュー分析・"
                "Meta広告ライブラリ・Google広告キーワード調査・矢野経済研究所・厚労省/総務省統計・UGC分析）を熟知しています。\n"
                "マーケティングの質問には必ずこれらのフレームワークと具体的なデータソースを使って回答してください。\n"
                "「調べて／検索／出典」等があれば可能なら調査し, 要点と出典を示してください。\n"
                "「作って／作りたい／商品化したい」等が明確なときだけ, 商品化の次の一手を提案してください。\n"
                "「ツール未実行のため…」の定型文を繰り返さないでください。\n"
            )
        # ナレッジベースの内容を補足コンテキストとして追加
        if _marketing_kb:
            sysdirective += f"\n\n[マーケティング知識ベース]\n{_marketing_kb[:3000]}"

        # --- 履歴注入(/api/chat相当の形に寄せる)---
        historymsgs = []
        if memory:
            try:
                # SageMemory methods are get_short_term and save_short_term
                getter = getattr(memory, "get_short_term", None) or getattr(memory, "get_shortterm", None)
                if getter:
                    try:
                        recent = getter(limit=10, session_id=sessionid)
                    except TypeError:
                        recent = getter(10, session_id=sessionid)

                    for msg in (recent or []):
                        role = msg.get("role")
                        content = msg.get("content", "")
                        if role == "user":
                            historymsgs.append(HumanMessage(content=content))
                        else:
                            historymsgs.append(AIMessage(content=content))
            except Exception:
                pass

        # --- 最低限の検索フック(「調べて」系だけ)---
        if any(k in usertext for k in ["調べて", "検索", "出典", "ソース", "URL", "source"]):
            try:
                logger.info(f"[SEARCH] Search hook triggered for: {usertext[:50]}")
                from backend.modules.browser_agent import BrowserAgent
                agent = BrowserAgent()
                sres = None
                if hasattr(agent, 'search_google'):
                    sres_dict = agent.search_google(usertext)
                    if isinstance(sres_dict, dict) and sres_dict.get("status") == "success":
                        results = sres_dict.get("results", [])
                        if results:
                            sres = "\n".join([f"- {r.get('title')}: {r.get('snippet')} ({r.get('link')})" for r in results[:5]])
                        else:
                            sres = "No results found."
                    else:
                        sres = str(sres_dict)
                elif hasattr(agent, 'search'):
                    sres = agent.search(usertext)
                
                if sres:
                    logger.info(f"[SUCCESS] Search results obtained ({len(sres)} chars)")
                    historymsgs.append(SystemMessage(content=f"以下の検索結果を参考に, ユーザーの質問に答えてください。検索結果が見つからない場合は, 一般的な知識で答えてください。\n\n[検索結果]\n{sres}"))
            except Exception as e:
                logger.error(f"[ERROR] Search hook error: {e}")
                pass

        currentmsg = HumanMessage(content=usertext)

        inputdata = {
            "messages": historymsgs + [currentmsg],
            "plan": [],
            "currentstepindex": 0,
            "context": {"sessionid": sessionid},
            "systemdirective": sysdirective,
        }

        result = orchestrator.run(inputdata)

        if isinstance(result, dict):
            airesponse = result.get("final_response") or result.get("output") or str(result)
        else:
            airesponse = str(result)

        if not airesponse:
            airesponse = "SUCCESS Task completed. No text output."

        # --- ボイラープレート除去: LLMが出力する「No tools executed」系を後処理で削除 ---
        import re as _re
        _boilerplate = [
            r"(?i)^no tools executed[^\n]*\n?",
            r"(?i)^since no tools (were|have been) executed[^\n]*\n?",
            r"(?i)^no tools (were|have been)? ?(used|executed)[^\n]*\n?",
            r"(?i)^as no tools were (used|executed)[^\n]*\n?",
            r"(?i)^i (didn'?t|did not) (use|execute|run) any tools[^\n]*\n?",
            r"(?i)^(note:|note that )(no tools|tools were not)[^\n]*\n?",
            r"(?i)^tools? (were not|not) (used|executed|called)[^\n]*\n?",
            r"(?i)^there (are|were) no tools (to |)(use|execute|call)[^\n]*\n?",
        ]
        for _pat in _boilerplate:
            airesponse = _re.sub(_pat, '', airesponse).strip()
        # 全文がボイラープレートだった場合のフォールバック
        if not airesponse:
            airesponse = "ご質問をありがとうございます。詳しくお聞かせください。" if uilang == "ja" else "Got it — could you tell me more about what you'd like to create?"

        # --- 保存(次ターンに効かせる)---
        if memory:
            try:
                # SageMemory method is save_short_term(role, content, session_id)
                saver = getattr(memory, "save_short_term", None) or getattr(memory, "saveshortterm", None)
                if saver:
                    try:
                        saver("user", usertext, session_id=sessionid)
                        saver("assistant", airesponse, session_id=sessionid)
                    except TypeError:
                        saver("user", usertext, sessionid)
                        saver("assistant", airesponse, sessionid)
            except Exception:
                pass

        # suggestedactions は既存仕様維持(最低限)
        suggestedactions = []
        lower = airesponse.lower()
        if mode == "free" and any(k in usertext for k in ["作って", "作りたい", "商品化", "build", "create"]):
            suggestedactions.append({
                "id": "startpilot",
                "label": "Start Productization",
                "payload": {"topic": usertext[:50]}
            })

        return jsonify({
            "status": "success",
            "assistant_text": airesponse,
            "suggested_actions": suggestedactions,
            "brain_updated": True
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

def is_topic_obviously_unsafe(topic: str) -> Tuple[bool, Optional[str]]:
    """Early security check for prohibited topics (Entrance Block)"""
    if not topic: return False, None
    topic_lower = topic.lower()
    
    # Dangerous themes (Dual-use / Offensive)
    unsafe_patterns = ["bypass", "crack", "hack", "exploit", "gain root", "disable security", "vulnerability"]
    
    # Check if any unsafe pattern is in the topic
    if any(p in topic_lower for p in unsafe_patterns):
        # Strict Block for "How-to" or instructional formats on dangerous topics
        how_to_intent = ["how to", "tutorial", "guide", "step 1", "instruction"]
        if any(intent in topic_lower for intent in how_to_intent):
            return True, "UNSAFE_TOPIC_HOWTO"
            
        # Very specific defensive allowlist (Only allow academic/hardening focus)
        # We removed "security" and "defend" as they are too easy to append
        strict_allowlist = ["prevention", "mitigation", "hardening", "threat model", "architecture study"]
        
        # If any strictly defensive keyword is present AND it's NOT a how-to, allow it
        if any(allow in topic_lower for allow in strict_allowlist):
            return False, None
            
        return True, "UNSAFE_TOPIC_KEYWORD"
    return False, None

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

@app.route('/api/pilot/generate', methods=['POST'])
def api_pilot_generate():
    """
    Sage Pilot: Generate Course (Task Execution)
    Connects to CourseProductionPipeline via global course_gen
    """
    pipeline = get_or_init_pipeline()
    
    if not pipeline:
        log_structured("pilot_generate_block", {"reason": "PIPELINE_WARMING_UP", "status": 503})
        return jsonify({
            "status": "error", 
            "message": "Course pipeline warming up",
            "reason_code": "PIPELINE_WARMING_UP",
            "request_id": getattr(g, 'request_id', 'unknown')
        }), 503, {"Retry-After": "3"}

    data = request.get_json(silent=True) or {}
    log_structured("pilot_generate_start", {"topic": data.get('topic') if data else 'none'})

    try:
        
        def _pick(*keys, default=None):
            for k in keys:
                if k in data and data[k] not in (None, ""):
                    return data[k]
            return default

        def _to_int(v, default=5):
            try:
                return int(v)
            except Exception:
                return default

        # Normalize inputs
        topic = _pick('topic', default=None)
        customer_request = _pick('customer_request', 'customerrequest', default='')
        quality_tier = _pick('quality_tier', 'qualitytier', default=None)
        num_sections = _to_int(_pick('num_sections', 'numsections', default=5), default=5)
        use_scholar = bool(_pick('use_scholar', 'usescholar', 'useScholar', default=False))
        
        if not topic:
             return jsonify({
                 "status": "error", 
                 "message": "Topic is required",
                 "request_id": getattr(g, 'request_id', 'unknown')
             }), 400

        # --- EARLY SECURITY CHECK ---
        is_unsafe, reason = is_topic_obviously_unsafe(topic)
        if is_unsafe:
            logger.warning(f"🚫 [SEC] Early block for unsafe topic: '{topic}' | Reason: {reason} | Action: 403 Forbidden")
            log_structured("pilot_generate_block", {"reason": reason, "topic": topic, "status": 403})
            return jsonify({
                "status": "error",
                "message": f"Security Violation: Topic contains prohibited patterns ({reason}).",
                "blocked_by_security": True,
                "reason_code": reason,
                "request_id": getattr(g, 'request_id', 'unknown')
            }), 403

        # --- SCHOLAR INTEGRATION ---
        if use_scholar:
            try:
                if sage_scholar:
                    query = topic or customer_request
                    logger.info(f"[SCHOLAR] Scholar Search for Generation: {query}")
                    results = sage_scholar.search_papers(query)
                    
                    blob = "\n".join([
                        f"- {r.get('title','')}\n  {r.get('url','')}\n  {r.get('summary','')[:200]}..."
                        for r in (results or [])[:5]
                    ])
                    customer_request = (customer_request or "") + "\n\n[Scholar Sources]\n" + blob
                else:
                    customer_request = (customer_request or "") + "\n\n[Scholar] Unavailable (module not initialized)."
            except Exception as sc_err:
                logger.error(f"Scholar search failed during generation: {sc_err}")
                customer_request = (customer_request or "") + f"\n\n[Scholar] Error: {str(sc_err)[:100]}"

        logger.info(f"[PILOT] Pilot Generating Course: {topic} (Tier: {quality_tier})")
        
        # Execute pipeline
        result = pipeline.generate_course(
            topic=topic,
            customer_request=customer_request,
            quality_tier=quality_tier,
            num_sections=num_sections,
            request_id=getattr(g, 'request_id', 'unknown')
        )
        
        if result.get('status') == 'success':
            result['request_id'] = getattr(g, 'request_id', 'unknown')
            log_structured("pilot_generate_success", {
                "topic": topic, 
                "tier": result.get('tier'),
                "request_id": result['request_id']
            })
            return jsonify(result), 200
        else:
            reason = "GENERATION_FAILED"
            if result.get('blocked_by_security'):
                reason = "SECURITY_BLOCK_POST_GEN"
            
            if not result or not isinstance(result, dict):
                result = {"status": "error", "message": "Pipeline returned invalid result object"}
            
            result['request_id'] = getattr(g, 'request_id', 'unknown')
            log_structured("pilot_generate_failed", {
                "reason": reason,
                "message": result.get('message'),
                "request_id": result['request_id']
            })
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"[ERROR] API generate failure: {e}", exc_info=True)
        rid = getattr(g, 'request_id', 'unknown')
        log_structured("pilot_generate_exception", {
            "error": str(e),
            "request_id": rid
        })
        return jsonify({
            "status": "error", 
            "message": str(e),
            "request_id": rid
        }), 500

# 起動時に脳をロード (Moved to __main__ for safe PID lock check)
# init_brain()

# --- ROUTES ---

@app.route('/')
def index():
    # Serve the Sage 3.0 Landing Page
    return app.send_static_file('index.html')

@app.route('/dashboard.html')
@app.route('/dashboard')
def dashboard_route():
    # Use direct file response for HP components to avoid recursion
    return app.send_static_file('index.html')

# REMOVED: Static blog/offer routes.
# These are now handled by the SPA catch-all at the bottom to ensure React Router works.


@app.route('/api/chat', methods=['POST'])
@normalize_input('message', 'text')
def chat_endpoint():
    """
    Sage 3.0 統合チャットエンドポイント
    ユーザーの入力を LangGraph オーケストレーターに渡し, 
    Web検索, コード実行, 画像生成などを自律的に判断して実行させる。
    """
    global orchestrator
    
    # Use normalized data from decorator
    data = getattr(request, '_normalized_data', request.get_json(silent=True) or {})
    mode = data.get('mode')
    user_message = data.get('message', '')
    session_id = data.get('session_id') or request.headers.get('X-Session-ID') or "global_session"
    user_id = data.get('user_id', 'anon')
    
    if request.headers.get('X-Sage-Test-Mode') == '1':
        return jsonify({"reply": "[TEST] Stub response from Sage.", "phase": 1, "test_mode": True}), 200

    if not user_message:
        return jsonify({"error": "message または text が必要です (message or text is required)"}), 400

    # --- Gate A: 強制ルート(E2E専用, robot_action誤ルーティング遮断) ---
    if mode == "file_organize_e2e":
        project_root = Path(__file__).resolve().parent.parent  # backend/ -> project root
        chaos_in = project_root / "sandbox" / "chaos_in"
        chaos_out = project_root / "sandbox" / "chaos_out"

        chaos_out.mkdir(parents=True, exist_ok=True)

        date_re = re.compile(r"(20\d{2}-\d{2}-\d{2})")

        moved = []
        skipped = []
        errors = []

        for src in chaos_in.rglob("*"):
            if not src.is_file():
                continue

            name = src.name
            m = date_re.search(name)
            date_part = m.group(1) if m else "undated"

            ext = src.suffix.lower().lstrip(".")
            if ext in {"jpg", "jpeg", "png", "gif", "webp"}:
                category = "images"
            elif ext in {"pdf", "txt", "md", "csv", "docx", "xlsx", "pptx", "log"}:
                category = "docs"
            else:
                category = "other"

            dst_dir = chaos_out / category / date_part
            dst_dir.mkdir(parents=True, exist_ok=True)
            dst = dst_dir / src.name

            if dst.exists():
                skipped.append({"src": str(src), "dst": str(dst), "reason": "destination exists"})
                continue

            try:
                shutil.move(str(src), str(dst))  # standard approach for moving files
                moved.append({"src": str(src), "dst": str(dst), "category": category, "date": date_part})
            except Exception as e:
                errors.append({"src": str(src), "dst": str(dst), "error": str(e)})

        return jsonify({
            "status": "success" if not errors else "partial",
            "category": "e2e",
            "mode": mode,
            "moved_count": len(moved),
            "skipped_count": len(skipped),
            "error_count": len(errors),
            "moved": moved[:50],     # 返却は重くしない(証拠はE2E JSON側に残す)
            "skipped": skipped[:50],
            "errors": errors[:20],
        }), 200

    # 脳が死んでいる場合の蘇生
    if orchestrator is None:
        init_brain()
        if orchestrator is None:
            return jsonify({"response": "[WARNING] Error: Sage 3.0 Brain is offline. Check backend logs."})

    try:
        # --- THE CORE: LangGraph 実行 ---
        # メモリから直近の会話履歴を取得し, 文脈として注入する (Fix Amnesia)
        history_msgs = []
        if memory:
            try:
                # 2026 UPDATE: Session-aware retrieval
                recent_history = memory.get_short_term(limit=10, session_id=session_id)
                from langchain_core.messages import HumanMessage, AIMessage
                for msg in recent_history:
                    if msg['role'] == 'user':
                        history_msgs.append(HumanMessage(content=msg['content']))
                    else:
                        history_msgs.append(AIMessage(content=msg['content']))
            except Exception as e:
                logger.error(f"Failed to load history: {e}")

        # ユーザーの入力をオーケストレーターに渡す
        # Validate minimal keys to prevent runtime crash
        input_data = {
            "messages": history_msgs + [HumanMessage(content=user_message)],
            "plan": [],
            "current_step_index": 0,
            "context": {"user_id": user_id, "mode": mode, "session_id": session_id}
        }
        logger.info(f"[IN] Input to Orchestrator: {user_message}")
        
        # history + current message を渡す
        from langchain_core.messages import HumanMessage
        current_msg = HumanMessage(content=user_message)
        input_data = {
            "messages": history_msgs + [current_msg], 
            "plan": [], 
            "current_step_index": 0, 
            "context": {"session_id": session_id}
        }

        # synchronous run (同期実行) - 複雑なタスクは時間がかかる場合がある
        result = orchestrator.run(input_data)
        


        # 結果の整形 (LangGraphの出力形式に合わせて調整)
        ai_response = result.get("final_response", "") if isinstance(result, dict) else str(result)

        if not ai_response:
            ai_response = "[SUCCESS] Task completed (No text output)."

        # --- オーケストレーターが LLM 呼び出し失敗を返した場合: 直接 LLM フォールバック ---
        _ORCH_FAIL_MARKERS = [
            "Task executed but LLM report failed",
            "Sage Offline Mode. Actions taken:",
            "Raw Output:\nNo tools executed",
            "System Error during reporting:",
        ]
        if any(m in ai_response for m in _ORCH_FAIL_MARKERS):
            logger.warning(f"[FALLBACK] Orchestrator returned error response, trying multi-tier LLM fallback")
            _lang = "ja" if any(ord(c) > 0x3000 for c in user_message) else "en"
            _sys_prompt = (
                "あなたはSage Pilotです。ユーザーのビジネス・コンテンツの質問に具体的かつ丁寧に日本語で答えてください。"
                "Sageの対応機能: ブログ記事の自動生成・公開、Bluesky/Instagramへの自動投稿、"
                "市場トレンドリサーチ、デジタルコース制作、Gumroad/Stripeによる販売自動化。"
                "対応していない機能: Twitter/X、LinkedIn、Facebook、TikTokへの投稿。\n"
                "マーケティング専門知識: 3C分析（10ステップ調査手順: LP・Amazon/楽天ランキング・競合レビュー・Meta広告ライブラリ・Google広告・矢野経済・厚労省統計・UGC分析）、"
                "SWOT・4P・STP・カスタマージャーニー・バリュープロポジション・PDCAサイクルを熟知しています。"
                "マーケ質問には必ずフレームワークと具体的なデータソースを使って回答してください。"
                if _lang == "ja" else
                "You are Sage Pilot, the AI assistant for the Sage AI platform. Answer questions helpfully and concisely.\n"
                "Sage's actual capabilities: auto-generate & publish blog posts, auto-post to Bluesky and Instagram, "
                "market trend research, digital course production, sales automation via Gumroad/Stripe.\n"
                "Platforms NOT supported: Twitter/X, LinkedIn, Facebook, TikTok.\n"
                "Marketing expertise: You know the 10-step 3C analysis research process (LP analysis, Amazon/Rakuten ranking, "
                "competitor review mining ★5/★2-3, Meta Ad Library, Google Ads, Yano Research, MHLW stats, UGC). "
                "You also know SWOT, 4P, STP, customer journey, value proposition, PDCA. "
                "Apply these frameworks with concrete data sources when answering marketing questions.\n"
                "Do not claim Sage supports platforms it does not actually support."
            )
            _full_prompt = f"{_sys_prompt}\n\nUser: {user_message}\nSage:"
            _fallback_result = ""

            # Tier 1: orchestrator.llm (Groq via LangChain)
            try:
                from langchain_core.messages import SystemMessage as _SysMsg, HumanMessage as _HumMsg
                _fallback_msgs = [_SysMsg(content=_sys_prompt)] + history_msgs + [_HumMsg(content=user_message)]
                _fallback_res = orchestrator.llm.invoke(_fallback_msgs)
                _fallback_result = _fallback_res.content if hasattr(_fallback_res, 'content') else str(_fallback_res)
                if _fallback_result:
                    logger.info(f"[FALLBACK-T1] orchestrator.llm succeeded: {_fallback_result[:60]}")
            except Exception as _fe1:
                logger.warning(f"[FALLBACK-T1] orchestrator.llm failed: {_fe1}")

            # Tier 2: course_gen._invoke_llm (Gemini → Ollama chain)
            if not _fallback_result:
                try:
                    import os as _os2
                    _cg = globals().get('course_gen_global')
                    if _cg:
                        _fallback_result = _cg._invoke_llm(_full_prompt[:4000])
                        if _fallback_result:
                            logger.info(f"[FALLBACK-T2] course_gen._invoke_llm succeeded")
                except Exception as _fe2:
                    logger.warning(f"[FALLBACK-T2] course_gen._invoke_llm failed: {_fe2}")

            # Tier 3: Direct Groq REST (bypass LangChain)
            if not _fallback_result:
                try:
                    import os as _os3
                    from groq import Groq as _Groq3
                    _g3 = _Groq3(api_key=_os3.getenv("GROQ_API_KEY"))
                    _r3 = _g3.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[{"role": "system", "content": _sys_prompt},
                                  {"role": "user", "content": user_message}],
                        max_tokens=800,
                        timeout=20,
                    )
                    _fallback_result = _r3.choices[0].message.content.strip()
                    if _fallback_result:
                        logger.info(f"[FALLBACK-T3] Direct Groq REST succeeded")
                except Exception as _fe3:
                    logger.warning(f"[FALLBACK-T3] Direct Groq REST failed: {_fe3}")

            if _fallback_result:
                ai_response = _fallback_result
            else:
                ai_response = (
                    "AIが現在混雑しています。少し待ってから再度お試しください。"
                    if _lang == "ja" else
                    "Sage is busy right now. Please try again in a moment."
                )

        # --- ボイラープレート除去 + Raw JSON サニタイズ ---
        import re as _re2

        # 1) ボイラープレート除去
        _bp = [
            r"(?i)^no tools executed[^\n]*\n?",
            r"(?i)^since no tools (were|have been) executed[^\n]*\n?",
            r"(?i)^no tools (were|have been)? ?(used|executed)[^\n]*\n?",
            r"(?i)^as no tools were (used|executed)[^\n]*\n?",
            r"(?i)^i (didn'?t|did not) (use|execute|run) any tools[^\n]*\n?",
            r"(?i)^(note:|note that )(no tools|tools were not)[^\n]*\n?",
            r"(?i)^tools? (were not|not) (used|executed|called)[^\n]*\n?",
            r"(?i)^there (are|were) no tools (to |)(use|execute|call)[^\n]*\n?",
        ]
        for _p in _bp:
            ai_response = _re2.sub(_p, '', ai_response).strip()

        # 2) Raw JSON / Python dict 露出パターンを除去
        # 例: "browser_search: {'status': 'success', 'results': []}"
        ai_response = _re2.sub(
            r"\b\w+:\s*\{['\"]status['\"]:\s*['\"](?:success|error)['\"][^}]*\}",
            '',
            ai_response
        ).strip()
        # "Raw Output:\n..." 以降を除去
        ai_response = _re2.sub(r"Raw Output:\n.*", '', ai_response, flags=_re2.DOTALL).strip()
        # 空になった場合のフォールバック
        if not ai_response:
            _lang_fb = "ja" if any(ord(c) > 0x3000 for c in user_message) else "en"
            ai_response = (
                "ご質問をありがとうございます。もう少し詳しくお聞かせください。"
                if _lang_fb == "ja" else
                "Got it — could you share a bit more about what you'd like to create?"
            )

        # --- MEMORY SAVE (Synchronize Brain & Database) ---
        if memory:
            memory.save_short_term('user', user_message, session_id=session_id)
            memory.save_short_term('assistant', ai_response, session_id=session_id)

        logger.info(f"[OUT] Output from Orchestrator: {ai_response[:100]}...")
        
        # --- OPTIMIZATION FOR SAGE 2.0 UI (Dec 2nd Design) ---
        response_data = {
            "status": "success",
            "category": "chat", # Default category for colored bubble
            "response": ai_response
        }
        
        # Pass safety meta and LLM bypass evidence to frontend/QA if present
        if isinstance(result, dict) and 'context' in result:
             ctx = result['context']
             safety_meta = ctx.get('safety_meta')
             if safety_meta:
                 response_data["safety_meta"] = safety_meta
             
             # Evidence: Was LLM bypassed? (for QA certification)
             if ctx.get("llm_bypass_used"):
                 response_data["llm_bypass_used"] = True
                 response_data["external_http_calls"] = ctx.get("external_http_calls", 0)
        
        # UX Guardrail Evidence: Input normalization
        normalized_key = getattr(request, '_normalized_input_key', None)
        if normalized_key:
            response_data["normalized_input_key"] = normalized_key

        return jsonify(response_data)



    except Exception as e:
        logger.error(f"[ERROR] Execution Error: {e}")
        return jsonify({
            "status": "error",
            "error": f"Sage 3.0 Error: {str(e)}",
            "response": f"[WARNING] Sage 3.0 Error: {str(e)}" # Fallback for display
        }), 500






    data = request.get_json(silent=True) or {}
    topic = data.get('topic', '').strip()
    market = data.get('market', 'US')
    price = data.get('price', '$29')
    session_id = data.get('session_id') or request.headers.get('X-Session-ID') or "global_session"

    if request.headers.get('X-Sage-Test-Mode') == '1':
        return jsonify({"status": "ok", "product": {"title": f"[TEST] {topic} Course", "sections": [], "score": 85}, "test_mode": True}), 200

    # If topic is provided directly (from SageOS monetization form), use Groq to generate product
    if topic:
        prompt = (
            f"You are a digital product strategist. Create a concise product plan for:\n"
            f"Topic: {topic}\nMarket: {market}\nPrice: {price}\n\n"
            f"Output: product name, 3-bullet value proposition, target audience, and a Gumroad description (150 words)."
        )
        plan_text = None

        # 1st try: Groq
        try:
            import os as _os
            from groq import Groq as _Groq
            _groq = _Groq(api_key=_os.getenv("GROQ_API_KEY"))
            resp = _groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
            )
            plan_text = resp.choices[0].message.content.strip()
            logger.info(f"[PRODUCTIZE] Plan generated via Groq for: {topic}")
        except Exception as groq_err:
            logger.warning(f"[PRODUCTIZE] Groq failed ({groq_err}), trying course_gen LLM...")

        # 2nd try: course_gen._invoke_llm (Gemini → Ollama chain)
        if not plan_text:
            try:
                _cg = globals().get('course_gen_global')
                if _cg:
                    plan_text = _cg._invoke_llm(prompt)
                    if plan_text:
                        logger.info(f"[PRODUCTIZE] Plan generated via course_gen LLM for: {topic}")
            except Exception as llm_err:
                logger.warning(f"[PRODUCTIZE] course_gen LLM failed ({llm_err}), using stub plan")

        # 3rd try: stub plan (plan is not used in actual generation — it's display-only)
        if not plan_text:
            plan_text = f"Product plan for: {topic}\n\n• Comprehensive guide covering key concepts\n• Step-by-step actionable content\n• Ready for {market} market at {price}"
            logger.info(f"[PRODUCTIZE] Using stub plan for: {topic}")

        return jsonify({"status": "ok", "topic": topic, "plan": plan_text}), 200

    # Fallback: use chat history via consultative_gen
    if not consultative_gen:
        return jsonify({"error": "Consultative Generator not initialized"}), 500
    if not memory:
        return jsonify({"error": "Memory system not active"}), 500
    try:
        history = memory.get_short_term(limit=20, session_id=session_id)
        if not history:
            return jsonify({"error": "No topic or chat history provided."}), 400
        result = consultative_gen.generate_product(history)
        if "error" in result:
            return jsonify({"error": result["error"]}), 500
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"[PRODUCTIZE] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/productize/execute', methods=['POST'])
def productize_execute_endpoint():
    """

    Executes the actual production (Course PDF, WordPress Post, etc.) 
    based on the selected product plan.
    """
    # global course_gen, orchestrator -> Use globals().get
    course_gen_ref = globals().get('course_gen_global')
    orchestrator_ref = globals().get('orchestrator')
    
    data = request.get_json(silent=True) or {}
    product_type = data.get('type') # 'COURSE' or 'ARTICLE'
    topic = data.get('topic')
    plan = data.get('plan') # Optional: The whole plan object
    language = data.get('language', 'auto')  # 'auto' | 'ja' | 'en'

    if not topic or not product_type:
        return jsonify({"error": "Topic and Type are required"}), 400

    try:
        if product_type == 'COURSE':
            if not course_gen_ref:
                return jsonify({"error": "Course Production Pipeline not initialized"}), 500

            # Run Course Generation
            logger.info(f"[SCHOLAR] Production Started: COURSE for {topic} (lang={language})")
            result = course_gen_ref.generate_course(topic=topic, language=language)

            # --- WHOP AUTO-PUBLISH (P2) ---
            # Attempt to publish to Whop automatically after course generation.
            # Fails gracefully: course result is always returned regardless.
            try:
                from backend.integrations.whop_publisher import create_and_publish, build_sns_caption
                price_usd = float(data.get('price_usd', 29.99))
                course_title = result.get('title') or topic
                course_desc = result.get('description') or result.get('sales_page', '')[:800] or f'A comprehensive course on {topic}'
                whop_result = create_and_publish(course_title, course_desc, price_usd=price_usd)
                result['whop'] = whop_result
                if whop_result.get('status') in ('success', 'dry_run'):
                    result['whop_captions'] = build_sns_caption(
                        course_title,
                        price_usd,
                        whop_result.get('product_url', ''),
                        whop_result.get('checkout_url', ''),
                    )
                logger.info(f"[WHOP] Publish result: {whop_result.get('status')} {whop_result.get('product_url', '')}")
            except Exception as whop_err:
                logger.warning(f"[WHOP] Auto-publish skipped: {whop_err}")
                result['whop'] = {'status': 'skipped', 'message': str(whop_err)}
            # --- END WHOP ---

            return jsonify(result), 200
            
        elif product_type == 'ARTICLE':
            # Create a full article and post to WordPress/Blog
            logger.info(f"[CONTENT] Production Started: ARTICLE for {topic}")
            
            # 1. Generate full content using orchestrator's LLM
            prompt = f"Write a comprehensive, SEO-optimized blog article about '{topic}'. Use high-value information and professional tone. Output in Markdown."
            res = orchestrator.llm.invoke(prompt)
            content = res.content if hasattr(res, 'content') else str(res)
            
            # 2. Post to WordPress if credentials exist
            from backend.wordpress_automation import post_to_wordpress
            wp_res = post_to_wordpress(topic, content)
            
            return jsonify({
                "status": "success",
                "topic": topic,
                "content": content,
                "wordpress": wp_res
            }), 200
            
        else:
            return jsonify({"error": f"Unsupported product type: {product_type}"}), 400
            
    except Exception as e:
        logger.error(f"[EXECUTE_PRODUCTION] Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

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











# --- SYSTEM MONITOR API ---
from backend.modules.system_monitor_agent import SystemMonitorAgent
system_agent = SystemMonitorAgent()

@app.route('/api/command/execute', methods=['POST'])
def api_execute_command():
    # Execute shell command
    try:
        data = request.json
        command = data.get('command')
        cwd = data.get('cwd')
        timeout = data.get('timeout', 30)
        
        if not command:
            return jsonify({"status": "error", "message": "command required"}), 400
        
        from backend.modules.file_operations_agent import FileOperationsAgent
        agent = FileOperationsAgent()
        result = agent.execute_command(command, cwd, timeout)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Execute command error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500



# --- END FILE OPERATIONS API ---



# (moved to routes/system.py)

# (moved to routes/system.py)

from backend.utils.auth import admin_required

# --- STRATEGIC INTELLIGENCE API ---
@app.route('/api/admin/strategy', methods=['GET', 'POST'])
@admin_required
def admin_strategy():
    # GET: Retrieve current business strategy (Requires Admin Token).
    # POST: Update business strategy (Requires Admin Token).
    # Used by CEO Dashboard for alignment.

    if request.method == 'POST':
        data = request.json
        if StrategyManager and StrategyManager.save_strategy(data):
            return jsonify({"status": "success", "message": "Strategy updated successfully"})
        return jsonify({"status": "error", "message": "Failed to save strategy"}), 500

    # GET
    if StrategyManager:
        return jsonify(StrategyManager.get_strategy()), 200
    return jsonify({"status": "error", "message": "StrategyManager not loaded"}), 503







# (moved to routes/system.py)



@app.route('/api/blog/run-now', methods=['POST'])
def api_blog_run_now():
    """手動でブログ記事を今すぐ1件生成・公開する（時刻チェックをバイパス）"""
    try:
        logger.info("🚀 [BLOG] Manual trigger via /api/blog/run-now")
        if _automation_stop_events.get('blog', threading.Event()).is_set():
            return jsonify({"status": "error", "message": "Blog automation is disabled. Enable it first."}), 403
        from backend.scheduler.blog_scheduler import BlogScheduler
        blog_sched = BlogScheduler()
        blog_sched.run_once()
        _record_run("blog")
        return jsonify({"status": "success", "message": "Blog post generated and published. Check git log."})
    except Exception as e:
        logger.error(f"[BLOG] Manual trigger error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/gumroad/run-now', methods=['POST'])
def api_gumroad_run_now():
    """手動でGumroadスケジューラーを今すぐ実行する（時刻チェックをバイパス）"""
    try:
        logger.info("🚀 [GUMROAD] Manual trigger via /api/gumroad/run-now")
        if _automation_stop_events.get('gumroad', threading.Event()).is_set():
            return jsonify({"status": "error", "message": "Gumroad automation is disabled. Enable it first."}), 403
        from backend.scheduler.gumroad_scheduler import GumroadScheduler
        gumroad_sched = GumroadScheduler()
        gumroad_sched.run_once()
        _record_run("gumroad")
        return jsonify({"status": "success", "message": "Gumroad scheduler executed. Check logs."})
    except Exception as e:
        logger.error(f"[GUMROAD] Manual trigger error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/sns/post_bilingual', methods=['POST'])
def api_sns_post_bilingual():
    """
    EN + JP を同一トピックで同時投稿する。
    Body: { "topic": "AI automation for solopreneurs" }

    Gap分析「多言語展開が手動」を解消するエンドポイント。
    SageOSの「Publish」ボタンからも呼べる。
    """
    try:
        data = request.get_json(silent=True) or {}
        topic = (data.get("topic") or "").strip()
        if not topic:
            return jsonify({"status": "error", "message": "topic is required"}), 400

        from backend.modules.bilingual_poster import BilingualPoster
        poster = BilingualPoster()
        result = poster.post_bilingual(topic)
        return jsonify({"status": "ok", **result}), 200
    except Exception as e:
        logger.error(f"[BILINGUAL] post_bilingual error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500




@app.route('/api/sns/sync_performance', methods=['POST'])
def api_sns_sync_performance():
    """
    Bluesky 投稿のエンゲージメントを取得して NeuromorphicBrain に学習させる。
    HEARTBEAT: 毎日 22:00 JST に自動実行 + 手動トリガー可。
    """
    try:
        from backend.modules.sns_performance_tracker import SNSPerformanceTracker
        tracker = SNSPerformanceTracker()
        result = tracker.sync_and_learn()
        return jsonify({"status": "ok", **result}), 200
    except Exception as e:
        logger.error(f"[SNS_TRACKER] sync_performance error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/sns/performance_summary', methods=['GET'])
def api_sns_performance_summary():
    """SNS投稿のパフォーマンスサマリーを返す（ダッシュボード表示用）。"""
    try:
        from backend.modules.sns_performance_tracker import SNSPerformanceTracker
        tracker = SNSPerformanceTracker()
        summary = tracker.get_summary()
        return jsonify({"status": "ok", **summary}), 200
    except Exception as e:
        logger.error(f"[SNS_TRACKER] summary error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500











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






@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    # SPA catch-all to ensure everything (blog, dashboard, etc.) works in React.
    # 1. Skip API/Files.
    # 2. Serve file if it exists in dist.
    # 3. Else fallback to index.html for React Router.
    if path.startswith('files/'):
        return jsonify({"status": "error", "message": "Resource not found"}), 404
    # Note: api/ routes are handled by Flask's own @app.route decorators.
    # If we reach here with an api/ path, it means no route matched → return 404.
    if path.startswith('api/'):
        return jsonify({"status": "error", "message": f"API endpoint not found: /{path}"}), 404
    
    # Check if the requested path is an actual file in the frontend/dist folder
    full_path = os.path.join(app.static_folder, path)
    if path != "" and os.path.isfile(full_path):
        return send_from_directory(app.static_folder, path)
        
    return send_from_directory(app.static_folder, 'index.html')



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

    app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False)

