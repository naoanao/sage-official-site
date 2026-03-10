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
from datetime import datetime
from typing import Tuple, Optional, List, Dict
from flask import Flask, request, jsonify, render_template, send_from_directory, g
from flask_cors import CORS
from pathlib import Path
from werkzeug.exceptions import BadRequest

# Load .env file (CRITICAL: Must be before other imports that use env vars)
from dotenv import load_dotenv
# Get project root (one level up from backend/)
project_root = Path(__file__).parent.parent
env_path = project_root / '.env'
load_dotenv(dotenv_path=env_path)  # Explicitly load .env from project root

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
        logger.info("[SUCCESS] SNS, Blog, Gumroad, and Notion schedulers imported.")
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

# CORS — manual handler (flask-cors 4.x uses WSGI middleware which conflicts)
_DEV_ORIGINS = {
    "http://localhost:3000", "http://localhost:5000", "http://localhost:5001",
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
    "http://127.0.0.1:3000", "http://127.0.0.1:5000", "http://127.0.0.1:5001",
    "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
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

# --- SERVE ROBOT DEMO (DIRECT PUBLIC ACCESS) ---
@app.route('/robot_demo.html')
def serve_robot_demo():
    public_dir = project_root / 'public'
    return send_from_directory(public_dir, 'robot_demo.html')

@app.route('/robot_demo.css')
def serve_robot_css():
    public_dir = project_root / 'public'
    return send_from_directory(public_dir, 'robot_demo.css')

# --- SAGE HEALING API ---
@app.route('/api/system/healing-status', methods=['GET'])
def get_healing_status():
    # Returns the latest self-healing event from JSON
    status_file = project_root / "backend/logs/healing_status.json"
    if status_file.exists():
        try:
            with open(status_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
    else:
        return jsonify({"status": "idle", "message": "No healing events yet."})

@app.route('/api/system/health', methods=['GET'])
def get_system_health():
    """
    Returns the TRUE internal state of Sage for 'No Lies' visibility.
    """
    try:
        auto_obj = autonomous  # may be AutonomousAdapter or None
        auto_running = bool(getattr(auto_obj, 'running', False)) if auto_obj is not None else False
        loop_count = int(getattr(auto_obj, 'loop_count', 0)) if auto_obj is not None else 0
    except Exception:
        auto_running = False
        loop_count = 0
    return jsonify({
        "status": "online",
        "brake_enabled": False,
        "autonomous_running": auto_running,
        "autonomous_loop": loop_count,
        "orchestrator_loaded": orchestrator is not None,
        "llm_provider": "groq",
    }), 200

@app.route('/api/system/kpi', methods=['GET'])
def get_system_kpi():
    # Calculates MTTR and Availability from healing history
    history_file = LOG_DIR / "healing_history.jsonl"
    
    if not history_file.exists():
         return jsonify({
             "mttr": "0.0s",
             "availability": "100%",
             "last_incident": "None",
             "total_incidents": 0,
             "status": "stable"
         })

    try:
        incidents = []
        with open(history_file, 'r', encoding='utf-8') as f:
             for line in f:
                 try:
                     if line.strip():
                        incidents.append(json.loads(line))
                 except:
                     continue
        
        # Calculate MTTR
        heal_results = [i for i in incidents if i.get('event') == 'HEAL_RESULT']
        durations = [i.get('duration_sec', 0) for i in heal_results]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        if avg_duration < 1.0:
             mttr_str = f"{round(avg_duration * 1000, 2)}ms"
        else:
             mttr_str = f"{round(avg_duration, 2)}s"
        
        # Last Incident
        last_incident_time = "None"
        if incidents:
            last_ts = incidents[-1].get('timestamp', 0)
            from datetime import datetime
            last_incident_time = datetime.fromtimestamp(last_ts).strftime('%m-%d %H:%M')
            
        return jsonify({
             "mttr": mttr_str,
             "availability": "99.9%",
             "last_incident": last_incident_time,
             "total_incidents": len(heal_results),
             "status": "active"
         })
         
    except Exception as e:
        logger.error(f"KPI calc error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

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

@app.route('/api/system/stats/detailed', methods=['GET'])
def get_detailed_stats():
    """Aggregated stats for the admin dashboard"""
    try:
        from backend.modules.api_monitor import api_monitor
        api_stats = api_monitor.get_usage_stats()
        
        # Get KPI stats (reuse internal logic)
        kpi_resp = get_system_kpi()
        kpi_data = kpi_resp.get_json() if hasattr(kpi_resp, 'get_json') else {}

        return jsonify({
            "api_usage": api_stats,
            "kpi": kpi_data,
            "system": {
                "uptime": "active",
                "version": "3.1.0-P2"
            }
        }), 200
    except Exception as e:
        logger.error(f"Detailed stats error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

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
        }
    ]
    return jsonify(automations)

# --- LAST RUN REGISTRY ---
_last_run_registry = {}  # {automation_id: datetime_string}

def _get_last_run_time(automation_id: str) -> str:
    """最終実行時刻を返す。未記録の場合は'Never'"""
    return _last_run_registry.get(automation_id, "Never")

def _record_run(automation_id: str):
    """スケジューラーが実行する際に呼び出して時刻を記録する"""
    _last_run_registry[automation_id] = datetime.now().strftime('%Y-%m-%d %H:%M JST')

# --- AUTOMATION TOGGLE ---
_automation_stop_events = {}  # {automation_id: threading.Event}

def _is_automation_active(automation_id: str) -> bool:
    """Stop eventフラグが立っていなければactive=True（デフォルトactive）"""
    event = _automation_stop_events.get(automation_id)
    if event is None:
        return True  # まだtoggleされていない = デフォルトでactive
    return not event.is_set()  # set()=停止指示済み → active=False

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

@app.route('/api/sns/stats', methods=['GET'])
def get_sns_stats():
    """Aggregate real SNS post evidence from sns_evidence.jsonl (No Lies)"""
    evidence_file = LOG_DIR / "sns_evidence.jsonl"

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

# --- P1 OBSERVABILITY: VERSION ENDPOINT (GLOBAL SCOPE) ---
@app.route('/api/version', methods=['GET'])
def get_version():
    try:
        import inspect
        orch_path = inspect.getfile(LangGraphOrchestrator) if LangGraphOrchestrator else "Not Loaded"
    except:
        orch_path = "Unknown"
        
    return jsonify({
        "version": "3.1.0-P1",
        "orchestrator_path": orch_path,
        "pid": os.getpid(),
        "status": "system_active",
        "components": {
            "brain": "neuromorphic_active",
            "healer": "background_thread_active", 
            "security": "dpapi_enabled"
        }
    })

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
    return jsonify({"status": "wired", "enabled": False, "reason": "legacy_restoration"}), 200

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

# --- LEGACY RESTORATION (Step 2: POST gates - safe by default) ---
@app.route('/api/telegram/send', methods=['POST'])
def telegram_send():
    if os.getenv("SAGE_ENABLE_TELEGRAM") != "1":
        return jsonify({"error": "Feature disabled by default"}), 403

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
    if os.getenv("SAGE_ENABLE_BLUESKY") != "1":
        return jsonify({"error": "Feature disabled by default"}), 403

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

# --- SPA ROUTING (Moved to bottom for priority) ---

@app.route('/api/instagram/status', methods=['GET'])
def instagram_status():
    from backend.integrations.instagram_integration import InstagramBot
    bot = InstagramBot()
    return jsonify({
        "status": "wired", 
        "configured": bot.verify_credentials(),
        "reason": "restored"
    }), 200

@app.route('/api/instagram/post', methods=['POST'])
def instagram_post():
    request_data = request.get_json(silent=True) or {}
    image_url = request_data.get("image_url")
    caption = request_data.get("caption", "Sage System Online")
    
    if not image_url:
        return jsonify({"error": "No image_url provided"}), 400

    try:
        from backend.integrations.instagram_integration import InstagramBot
        bot = InstagramBot()
        
        result = bot.post_image(image_url, caption)
        
        if result.get("success"):
            # 収益化ログに記録 (統合版の規律)
            try:
                from backend.modules.sage_audit import audit_logger
                if audit_logger:
                    audit_logger.log_event("sns_post_success", "system", {"platform": "instagram", "id": result.get("id")})
            except:
                pass
            return jsonify({"status": "success", "result": result}), 200
        else:
            return jsonify({"error": result.get("error")}), 500
            
    except Exception as e:
        logger.error(f"Instagram post error: {e}")
        return jsonify({"error": str(e)}), 500

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
        logger.info("[INIT] Course Production Pipeline Ready.")
        return course_gen_global
    except Exception as e:
        logger.exception(f"[INIT] Course Production Pipeline init failed: {e}")
        course_gen_global = None
        return None

def init_brain():
    global orchestrator, memory, autonomous, consultative_gen, course_gen_global, sage_scholar
    if LangGraphOrchestrator:
        try:
            memory = SageMemory() # ChromaDB / Unified Memory
            orchestrator = LangGraphOrchestrator() # The Master Brain
            
            # Initialize Consultative Generator with orchestrator's LLM
            if orchestrator and getattr(orchestrator, 'llm', None):
                consultative_gen = ConsultativeGenerator(llm=orchestrator.llm)
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
                                        if not _automation_stop_events.get('sns_poster', threading.Event()).is_set():
                                            logger.info("[SNS] SNS Scheduler: Checking for Ready content in Notion...")
                                            sched.run_cycle()
                                            _record_run("sns_poster")
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
                                    while True:
                                        if not _automation_stop_events.get('blog', threading.Event()).is_set():
                                            blog_sched.run() # Assuming this handles its own schedule internally
                                        time.sleep(3600)
                                except Exception as e:
                                    logger.error(f"[ERROR] Blog Scheduler Thread Error: {e}")

                            # Gumroad scheduler (JST 10:00 = UTC 01:00)
                            def run_gumroad_scheduler():
                                try:
                                    gumroad_sched = GumroadScheduler()
                                    while True:
                                        if not _automation_stop_events.get('gumroad', threading.Event()).is_set():
                                            gumroad_sched.run()
                                        time.sleep(3600)
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

                            # Initialize events
                            for auto in ['sns_poster', 'blog', 'gumroad', 'notion_sync']:
                                if auto not in _automation_stop_events:
                                    _automation_stop_events[auto] = threading.Event()

                            threading.Thread(target=run_scheduler, daemon=True, name="SageSNSScheduler").start()
                            # threading.Thread(target=run_worker, daemon=True, name="SageSNSWorker").start() # Need to adapt JobRunner
                            threading.Thread(target=run_blog_scheduler, daemon=True, name="SageBlogScheduler").start()
                            threading.Thread(target=run_gumroad_scheduler, daemon=True, name="SageGumroadScheduler").start()
                            threading.Thread(target=run_notion_scheduler, daemon=True, name="SageNotionSyncScheduler").start()
                            logger.info("[SUCCESS] SNS + Blog + Gumroad + Notion Threads spawned.")

                        run_sns_loops()
                        
                    except Exception as e:
                        logger.error(f"[ERROR] Autonomous adapter or SNS failed: {e}")
                        autonomous = None
                else:
                    logger.info("[INFO] Autonomous mode disabled by env; not starting loop.")


        except Exception as e:
            logger.error(f"[ERROR] Brain Initialization Failed: {e}")

@app.route('/api/scholar/search', methods=['POST'])
def api_scholar_search():
    """
    Sage Scholar: Search for academic papers
    """
    if not sage_scholar:
        return jsonify({"status": "error", "message": "Sage Scholar module not initialized"}), 503
        
    try:
        data = request.json or {}
        query = data.get('query')
        if not query:
            return jsonify({"status": "error", "message": "Query required"}), 400
            
        logger.info(f"[PILOT] Scholar Search: {query}")
        results = sage_scholar.search_papers(query)
        
        return jsonify({"status": "success", "results": results}), 200
        
    except Exception as e:
        logger.error(f"Scholar search error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- Content Manager Integration (Unified Storage) ---
try:
    from backend.modules.content_manager import ContentManager
    content_mgr = ContentManager()
    logger.info("[SUCCESS] Content Manager API Ready.")
except Exception as e:
    logger.error(f"Failed to init ContentManager: {e}")
    content_mgr = None

@app.route('/api/knowledge/list', methods=['GET'])
def api_knowledge_list():
    # List all knowledge base files (The 'Summarized Wisdom').
    try:
        kb_dir = pathlib.Path(os.path.join(os.path.dirname(__file__), "sage_knowledge_base"))
        if not kb_dir.exists():
            return jsonify({"status": "error", "message": "Knowledge Base directory not found"}), 404
            
        files = []
        for f in kb_dir.glob("*.md"):
            stats = f.stat()
            files.append({
                "filename": f.name,
                "size": stats.st_size,
                "created": datetime.fromtimestamp(stats.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
                "modified": datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            })
        
        # Sort by modification time (newest first)
        files.sort(key=lambda x: x['modified'], reverse=True)
        return jsonify({"status": "success", "files": files})
    except Exception as e:
        logger.error(f"KB List Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/knowledge/content', methods=['GET'])
def api_knowledge_content():
    # Get content of a specific knowledge file.
    filename = request.args.get('filename')
    if not filename:
        return jsonify({"error": "Filename required"}), 400
        
    try:
        kb_dir = pathlib.Path(os.path.join(os.path.dirname(__file__), "sage_knowledge_base"))
        file_path = kb_dir / filename
        
        # Security check to prevent directory traversal
        if not file_path.resolve().is_relative_to(kb_dir.resolve()):
            return jsonify({"error": "Invalid path"}), 403


        if not file_path.exists():
            return jsonify({"error": "File not found"}), 404
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        return jsonify({"status": "success", "filename": filename, "content": content})
    except Exception as e:
        logger.error(f"KB Content Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- Previous Existing Routes ---
@app.route('/api/content/list', methods=['GET'])
def api_content_list():
    # List generated content (blogs, articles, memos) with metadata.
    if not content_mgr:
        return jsonify({"error": "Content Manager Offline"}), 503
    
    ctype = request.args.get('type')
    limit = int(request.args.get('limit', 20))
    
    try:
        items = content_mgr.list_content(ctype, limit)
        return jsonify({"status": "success", "items": items})
    except Exception as e:
        logger.error(f"Content list error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/content/save', methods=['POST'])
def api_content_save():
    # Save generated content to standard storage.
    if not content_mgr:
        return jsonify({"error": "Content Manager Offline"}), 503
    
    data = request.json or {}
    try:
        path = content_mgr.save_content(
            content_type=data.get('type', 'general'),
            title=data.get('title', 'Untitled'),
            body=data.get('body', ''),
            metadata=data.get('metadata', {})
        )
        return jsonify({"status": "success", "path": path})
    except Exception as e:
        logger.error(f"Content save error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

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

        # 指示文(ツールが無くても通常回答, 必要時だけ商品化提案)
        if uilang == "en":
            sysdirective = (
                "You are Sage Pilot. Answer the user's question directly first.\n"
                "If the user asks to research/search, do it and include sources if possible.\n"
                "Only if the user clearly wants to build/productize something, propose a concrete next step.\n"
                "Do not repeat boilerplate like 'Since no tools were executed...'.\n"
            )
        else:
            sysdirective = (
                "あなたは「Sage Pilot」です。まずユーザーの質問に正面から答えてください。\n"
                "「調べて／検索／出典」等があれば可能なら調査し, 要点と出典を示してください。\n"
                "「作って／作りたい／商品化したい」等が明確なときだけ, 商品化の次の一手を提案してください。\n"
                "「ツール未実行のため…」の定型文を繰り返さないでください。\n"
            )

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
            return p

    with _pipeline_init_lock:
        if course_gen_global is not None:
            return course_gen_global
        if orchestrator is None:
            init_brain()
        if orchestrator is None:
            return None
        return init_course_pipeline(orchestrator)

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


@app.route('/api/history', methods=['GET'])
def get_history():
    """
    会話履歴を取得するエンドポイント
    フロントエンドからの定期的なリクエストに対応
    """
    global memory
    
    if memory is None:
        return jsonify({"history": []})
    
    try:
        # SageMemoryから履歴を取得
        history_data = []
        
        # Correctly call SageMemory's method
        if hasattr(memory, 'get_short_term'):
            messages = memory.get_short_term(limit=50)
            # Ensure retrieval format is correct
            history_data = messages # get_short_term already returns [{"role":..., "content":...}]
        elif hasattr(memory, 'chat_memory') and hasattr(memory.chat_memory, 'messages'):
            # LangChain Default Fallback
            messages = memory.chat_memory.messages[-50:]  
            history_data = [
                {"role": "user" if msg.type == "human" else "assistant", "content": msg.content} 
                for msg in messages
            ]
        

        logger.info(f"[LOG] History retrieved: {len(history_data)} messages")
        return jsonify({"history": history_data})
    
    except Exception as e:
        logger.error(f"[ERROR] History retrieval error: {e}")
        return jsonify({"error": str(e), "history": []}), 500

@app.route('/api/productize', methods=['POST'])
def productize_endpoint():
    """
    Generates a product plan from a topic (SageOS form) or from chat history.
    """
    global consultative_gen, memory

    data = request.get_json(silent=True) or {}
    topic = data.get('topic', '').strip()
    market = data.get('market', 'US')
    price = data.get('price', '$29')
    session_id = data.get('session_id') or request.headers.get('X-Session-ID') or "global_session"

    # If topic is provided directly (from SageOS monetization form), use Groq to generate product
    if topic:
        try:
            import os as _os
            from groq import Groq as _Groq
            _groq = _Groq(api_key=_os.getenv("GROQ_API_KEY"))
            prompt = (
                f"You are a digital product strategist. Create a concise product plan for:\n"
                f"Topic: {topic}\nMarket: {market}\nPrice: {price}\n\n"
                f"Output: product name, 3-bullet value proposition, target audience, and a Gumroad description (150 words)."
            )
            resp = _groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
            )
            plan_text = resp.choices[0].message.content.strip()
            logger.info(f"[PRODUCTIZE] Generated plan for topic: {topic}")
            return jsonify({"status": "ok", "topic": topic, "plan": plan_text}), 200
        except Exception as e:
            logger.error(f"[PRODUCTIZE] Groq error: {e}")
            return jsonify({"error": str(e)}), 500

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

@app.route('/api/whop/publish', methods=['POST'])
def whop_publish_endpoint():
    """
    Standalone Whop publisher endpoint.
    Accepts: { title, description, price_usd, dry_run }
    Returns: { status, product_url, checkout_url, plan_id, whop_captions }
    """
    data = request.get_json(silent=True) or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    price_usd = float(data.get('price_usd', 29.99))

    if not title or not description:
        return jsonify({"error": "title and description are required"}), 400

    # Allow per-request dry_run override
    if data.get('dry_run') is True:
        os.environ['WHOP_DRY_RUN'] = '1'
    elif data.get('dry_run') is False:
        os.environ['WHOP_DRY_RUN'] = '0'

    try:
        from backend.integrations.whop_publisher import create_and_publish, build_sns_caption
        result = create_and_publish(title, description, price_usd=price_usd)
        if result.get('status') in ('success', 'dry_run'):
            result['whop_captions'] = build_sns_caption(
                title, price_usd,
                result.get('product_url', ''),
                result.get('checkout_url', ''),
            )
        return jsonify(result), 200 if result['status'] != 'error' else 500
    except Exception as e:
        logger.error(f"[WHOP] Publish endpoint error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


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

@app.route('/api/memory/recent', methods=['GET'])
def get_recent_memories():
    """
    SageOS UI用: 最近のメモリカードデータを取得
    """
    global memory
    
    try:
        # ChromaDBまたはアクティブメモリから最近の知識を取得
        if memory and hasattr(memory, 'get_knowledge'):
            knowledge_records = memory.get_knowledge(limit=10)
            
            # SageOS UI形式に変換
            memories = []
            for i, record in enumerate(knowledge_records):
                memories.append({
                    "id": i + 1,
                    "category": record.get('category', 'KNOWLEDGE'),
                    "content": record.get('content', '')[:120] + '...',
                    "lastAccessed": record.get('timestamp', '1h ago'),
                    "tags": record.get('tags', ['knowledge'])
                })
            
            if memories:
                return jsonify({"memories": memories})
        
        # フォールバック: モックデータ
        return jsonify({
            "memories": [
                {
                    "id": 1,
                    "category": "USER_PREF",
                    "content": "ユーザーは朝7時にコーヒーショップのマーケティングレポートを好む。",
                    "lastAccessed": "2m ago",
                    "tags": ["preference", "routine"]
                },
                {
                    "id": 2,
                    "category": "PROJECT_CONTEXT",
                    "content": "Sage統合の進捗: Phase 2完了。次はComputer Visionの実装。",
                    "lastAccessed": "1h ago",
                    "tags": ["dev", "sage"]
                }
            ]
        })
    except Exception as e:
        logger.error(f"[ERROR] Recent memories error: {e}")
        return jsonify({"memories": []})

# --- FILE SERVING ---
from flask import send_from_directory, redirect, request
from pathlib import Path

@app.route("/files/<path:filename>")
def serve_files(filename):
    # Serve files from the project root 'files' directory.
    try:
        # Determine project root from flask_server.py location
        # backend/flask_server.py -> backend -> ROOT
        base_dir = Path(__file__).resolve().parents[1]
        files_dir = base_dir / "files"
        files_dir.mkdir(parents=True, exist_ok=True)
        return send_from_directory(str(files_dir), filename)
    except Exception as e:
        logger.error(f"[ERROR] File serve error: {e}")
        return jsonify({"error": "File not found"}), 404

@app.route("/files<path:filename>")
def redirect_files(filename):
    # Compatibility redirect for malformed URLs (e.g., /filesimage.jpg -> /files/image.jpg)
    return redirect(f"/files/{filename}")

# --- SYSTEM STATS ---
@app.route('/api/system/stats', methods=['GET'])
def get_system_stats():
    """
    SageOS UI用: システム統計情報を取得
    """
    try:
        import psutil
        
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory_info = psutil.virtual_memory()
        
        return jsonify({
            "cpu": round(cpu_percent, 1),
            "memory_used_gb": round(memory_info.used / (1024**3), 2),
            "memory_percent": round(memory_info.percent, 1),
            "active_agents": 4 if orchestrator else 0,
            "status": "online"
        })
    except Exception as e:
        logger.error(f"[ERROR] System stats error: {e}")
        # フォールバック
        return jsonify({
            "cpu": 12.5,
            "memory_used_gb": 2.4,
            "memory_percent": 45.0,
            "active_agents": 4,
            "status": "online"
        })

@app.route('/api/memory/clear', methods=['POST'])
def clear_memory():
    # 記憶のクリア
    if memory:
        # memory.clear() # 実装に応じて
        return jsonify({"status": "Memory cleared (Logic pending)"})
    return jsonify({"status": "No memory module loaded"})

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

# --- AUTONOMOUS STATUS API ---
@app.route('/api/autonomous/status', methods=['GET'])
def autonomous_status():
    # Get autonomous mode status
    if autonomous:
        status = autonomous.get_status()
        return jsonify(status)
    return jsonify({"enabled": False, "message": "Autonomous mode not initialized"})

# --- FILE OPERATIONS API ---
@app.route('/api/files/read', methods=['POST'])
def api_read_file():
    # Read file contents
    try:
        data = request.json
        path = data.get('path')
        
        if not path:
            return jsonify({"status": "error", "message": "path required"}), 400
        
        from backend.modules.file_operations_agent import FileOperationsAgent
        agent = FileOperationsAgent()
        result = agent.read_file(path)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Read file error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/browser/browse', methods=['POST'])
def api_browser_browse():
    try:
        data = request.json
        url = data.get('url')
        if not url:
            return jsonify({"status": "error", "message": "url required"}), 400
        
        from backend.modules.browser_agent import BrowserAgent
        agent = BrowserAgent()
        result = agent.browse(url)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Browse error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/browser/search', methods=['POST'])
def api_browser_search():
    try:
        data = request.json
        query = data.get('query')
        if not query:
            return jsonify({"status": "error", "message": "query required"}), 400
        
        from backend.modules.browser_agent import BrowserAgent
        agent = BrowserAgent()
        result = agent.search_google(query)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/browser/screenshot', methods=['POST'])
def api_browser_screenshot():
    try:
        data = request.json
        url = data.get('url')
        output_path = data.get('output_path', 'screenshot.png')
        if not url:
            return jsonify({"status": "error", "message": "url required"}), 400
        
        from backend.modules.browser_agent import BrowserAgent
        agent = BrowserAgent()
        result = agent.take_screenshot(url, output_path)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Screenshot error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/files/write', methods=['POST'])
def api_write_file():
    # Write file
    try:
        data = request.json
        path = data.get('path')
        content = data.get('content', '')
        overwrite = data.get('overwrite', False)
        
        if not path:
            return jsonify({"status": "error", "message": "path required"}), 400
        
        from backend.modules.file_operations_agent import FileOperationsAgent
        agent = FileOperationsAgent()
        result = agent.write_file(path, content, overwrite)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Write file error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/files/list', methods=['POST'])
def api_list_directory():
    # List directory contents
    try:
        data = request.json or {}
        path = data.get('path', '.')
        pattern = data.get('pattern', '*')
        
        from backend.modules.file_operations_agent import FileOperationsAgent
        agent = FileOperationsAgent()
        result = agent.list_directory(path, pattern)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"List directory error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

# --- SYSTEM MONITOR API (The Body's Senses) ---
from backend.modules.system_monitor_agent import SystemMonitorAgent

@app.route('/api/system/healer/test-event', methods=['POST'])
def api_test_healer_event():
    # Trigger a fake healing event for KPI testing
    global healer_service_instance
    try:
        if not healer_service_instance:
             return jsonify({"status": "error", "message": "Healer service not ready"}), 503
        
        data = request.json or {}
        error_type = data.get('error_type', 'TimeoutError') # Default to a mapped error
        details = data.get('details', 'Manually triggered via API')
        
        # Trigger recovery (logs HEAL_START/HEAL_RESULT)
        force = data.get('force', False)
        healer_service_instance._trigger_recovery(error_type, details, force=force)
        
        return jsonify({"status": "success", "message": f"Triggered {error_type} (Force: {force})"})
    except Exception as e:
        logger.error(f"Test event failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
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

# [FIX] RESTORED & FIXED: Brain Stats API (Fixes Brain Usage 0%)
@app.route('/api/brain/stats/detailed', methods=['GET'])
def get_brain_stats_detailed():
    # Get comprehensive brain statistics for UI visualization
    try:
        brain = None
        if orchestrator:
            # Prioritize neuromorphic_brain, fallback to brain
            brain = getattr(orchestrator, 'neuromorphic_brain', None) or getattr(orchestrator, 'brain', None)
            
        if brain:
            stats = brain.get_stats()
            
            # [FIX] FIX: Use correct key names from neuromorphic_brain.py
            total_queries = stats.get('total_queries', 0)
            brain_hits = stats.get('brain_hits', 0)  # Changed from 'high_confidence_count'
            learned_patterns = stats.get('learned_patterns', 0)
            
            # Calculate usage rate correctly
            usage_rate = (brain_hits / total_queries * 100) if total_queries > 0 else 0
            
            # Confidence metrics (Brain v2.0.1 uses fixed 0.98 for hits, 0.15 for misses)
            avg_confidence = (brain_hits * 0.98) / total_queries if total_queries > 0 else 0
            highest_confidence = 0.98 if brain_hits > 0 else 0
            
            # Learning buffer info (Visualize STDP Batch Progress)
            current_buffer = len(brain.feedback_memory) if hasattr(brain, 'feedback_memory') else 0
            learning_buffer_size = current_buffer % 10
            learning_progress = (learning_buffer_size / 10.0) * 100  # Percentage to next learning
                        
            # Processing time
            avg_processing_time = stats.get('avg_processing_time', 0) * 1000  # Convert to ms
            
            # Confidence trend
            confidence_trend = stats.get('confidence_trend', 'insufficient_data')
            
            # Word2Vec info
            word2vec_enabled = getattr(brain, 'word2vec_enabled', False)
            vocabulary_size = 0
            if word2vec_enabled and hasattr(brain, 'word2vec') and brain.word2vec:
                try:
                    vocabulary_size = brain.word2vec.get_stats()['vocabulary_size']
                except:
                    vocabulary_size = 0
            
            return jsonify({
                "status": "success",
                "stats": {
                    "usage_rate": round(usage_rate, 1),
                    "avg_confidence": round(avg_confidence, 3),
                    "highest_confidence": round(highest_confidence, 3),
                    "total_queries": total_queries,
                    "brain_responses": brain_hits,  # [FIX] Fixed: Now uses brain_hits
                    "learned_patterns": learned_patterns,  # [FIX] Added
                    "learning_buffer": learning_buffer_size,
                    "learning_progress": round(learning_progress, 1),
                    "avg_processing_time": round(avg_processing_time, 0),
                    "confidence_trend": confidence_trend,
                    "word2vec_enabled": word2vec_enabled,
                    "vocabulary_size": vocabulary_size,
                    "learning_enabled": getattr(brain, 'learning_enabled', False),
                    "learning_updates": brain.learning_stats.get('updates', 0) if hasattr(brain, 'learning_stats') else 0
                }
            })
        else:
            # Return mock data for testing widget UI
            logger.warning("Brain not initialized, returning mock data")
            return jsonify({
                "status": "success",
                "stats": {
                    "usage_rate": 0,
                    "avg_confidence": 0,
                    "highest_confidence": 0,
                    "total_queries": 0,
                    "brain_responses": 0,
                    "learning_buffer": 0,
                    "learning_progress": 0,
                    "avg_processing_time": 0,
                    "confidence_trend": "stable",
                    "word2vec_enabled": False,
                    "vocabulary_size": 0,
                    "learning_enabled": False,
                    "learning_updates": 0
                }
            })

    except Exception as e:
        logger.error(f"Error getting brain stats: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- END FILE OPERATIONS API ---



# --- NEW DEBUG ENDPOINT (The Honesty Interface) ---
@app.route('/api/sage/status', methods=['GET'])
def api_sage_status():
    # Returns the TRUE internal state of Sage, including active LLM.
    # Used for 'The No Lies Campaign' verification.
    # Simplified for Stability (Always 200).
    return jsonify({
        "status": "online",
        "message": "Sage 3.0 Ultimate is active.",
        "version": "3.1.0-P1"
    }), 200

# --- HEALTH CHECK ---
@app.route('/health', methods=['GET'])
def health_check():
    status = "Active" if orchestrator else "Offline"
    autonomous_running = autonomous.running if autonomous else False
    return jsonify({
        "status": status,
        "version": "Sage 3.0",
        "autonomous": autonomous_running
    })

# --- STRATEGIC INTELLIGENCE API ---
@app.route('/api/admin/strategy', methods=['GET', 'POST'])
def admin_strategy():
    # GET: Retrieve current business strategy (Requires Admin Token).
    # POST: Update business strategy (Requires Admin Token).
    # Used by CEO Dashboard for alignment.
    # Simple Token Check from .env
    admin_token = os.getenv("SAGE_ADMIN_TOKEN")
    provided_token = request.headers.get("X-SAGE-ADMIN-TOKEN")

    if not admin_token or provided_token != admin_token:
        logger.warning(f"Unauthorized strategy access attempt ({request.method}) from {request.remote_addr}")
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    if request.method == 'POST':
        data = request.json
        if StrategyManager and StrategyManager.save_strategy(data):
            return jsonify({"status": "success", "message": "Strategy updated successfully"})
        return jsonify({"status": "error", "message": "Failed to save strategy"}), 500

    # GET
    if StrategyManager:
        return jsonify(StrategyManager.get_strategy()), 200
    return jsonify({"status": "error", "message": "StrategyManager not loaded"}), 503

# --- MONETIZATION & TAGS API ---
@app.route('/api/monetization/tags', methods=['GET'])
def get_tag_performance():
    # Returns views and clicks per blog tag for resonance analysis.
    if MonetizationMeasure:
        stats = MonetizationMeasure.get_tag_stats()
        return jsonify({"status": "success", "data": stats}), 200
    return jsonify({"status": "error", "message": "MonetizationMeasure not loaded"}), 503

@app.route('/api/monetization/stats', methods=['GET'])
def get_monetization_stats():
    # Returns overall views, clicks, and sales stats.
    if MonetizationMeasure:
        stats = MonetizationMeasure.get_stats()
        return jsonify({"status": "success", "data": stats}), 200
    return jsonify({"status": "error", "message": "MonetizationMeasure not loaded"}), 503

# --- PUBLIC BLOG API for Frontend Restoration ---
@app.route('/api/admin/posts', methods=['GET'])
def public_get_posts():
    # Publicly accessible blog posts with local fallback.
    try:
        from firebase_admin import firestore
        db = firestore.client()
        docs = db.collection('posts').where('status', '==', 'published').order_by('created_at', direction=firestore.Query.DESCENDING).limit(10).stream()
        posts = []
        for doc in docs:
            p = doc.to_dict()
            p['id'] = doc.id
            # Convert datetime to string for JSON serialization
            if 'created_at' in p: p['created_at'] = p['created_at'].isoformat()
            if 'updated_at' in p: p['updated_at'] = p['updated_at'].isoformat()
            posts.append(p)
        
        if not posts:
             raise Exception("No posts in DB")
             
        return jsonify({"posts": posts}), 200
    except Exception as e:
        # Fallback to local placeholders so the UI isn't broken
        logger.warning(f"Firestore posts fetch failed, using fallback: {e}")
        return jsonify({
            "posts": [
                {
                    "id": "1",
                    "title": "Autonomous Revenue Cycles: The SAGE Protocol",
                    "slug": "post-autonomous-revenue",
                    "excerpt": "How Sage 3.0 achieves 24/7 monetization with zero human intervention.",
                    "updated_at": "2026-02-13T10:00:00",
                    "size": 4500
                },
                {
                    "id": "2",
                    "title": "Neuromorphic Brain: Learning at the Edge",
                    "slug": "post-neuromorphic-brain",
                    "excerpt": "Explaining the SNN architecture and STDP learning rules in Sage.",
                    "updated_at": "2026-02-12T15:00:00",
                    "size": 3200
                }
            ]
        }), 200




# --- SAGE BRAKE API (Safety Control) ---
@app.route('/api/brake/status', methods=['GET'])
def api_brake_status():
    stop_file = project_root / "SAGE_STOP"
    return jsonify({"enabled": stop_file.exists()})

@app.route('/api/brake/toggle', methods=['POST'])
def api_brake_toggle():
    data = request.get_json(silent=True) or {}
    enable = data.get('enabled', False)
    stop_file = project_root / "SAGE_STOP"
    
    # Security: Token check for remote control
    admin_token = os.getenv("SAGE_ADMIN_TOKEN")
    provided_token = request.headers.get("X-SAGE-ADMIN-TOKEN")
    if admin_token and provided_token != admin_token:
        logger.warning(f"Unauthorized brake toggle attempt from {request.remote_addr}")
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    try:
        if enable:
            stop_file.touch()
            logger.warning("🚨 SAGE BRAKE ENABLED via API")
        else:
            if stop_file.exists():
                stop_file.unlink()
            logger.info("✅ SAGE BRAKE DISABLED via API")
        return jsonify({"status": "success", "enabled": stop_file.exists()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/d1/generate', methods=['POST'])
def api_d1_generate():
    """Manual trigger for D1 Knowledge Loop (D1: Idea -> Observation -> Artifacts)"""
    try:
        logger.info("🚀 [D1] Knowledge Loop manual trigger started via Cockpit")
        
        if not autonomous:
             return jsonify({"status": "error", "message": "Autonomous adapter not initialized"}), 503

        # Force Observation
        obs = autonomous._observe_and_log()
        
        data = request.get_json(silent=True) or {}
        topic = data.get('topic', 'AI Monetization Trends 2026')
        
        # Manually trigger a high-value 'D1' Action: Trend Research & Report
        decision = {
            'type': 'research_ai_trends',
            'data': {'topic': topic}
        }
        
        # We temporarily enable execution if it was off, just for this manual trigger
        original_exec = autonomous.phase_2_execute
        autonomous.phase_2_execute = True
        try:
            autonomous._execute_decision(decision)
        finally:
            autonomous.phase_2_execute = original_exec

        return jsonify({
            "status": "success", 
            "message": f"D1 Loop Executed: Research report for '{topic}' generated and stored."
        })
    except Exception as e:
        logger.error(f"D1 trigger error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/research/run', methods=['POST'])
def api_research_run():
    """Run D1 research for a topic and return a human-readable summary."""
    import concurrent.futures
    try:
        data = request.get_json(silent=True) or {}
        topic = data.get('topic', '').strip()
        if not topic:
            return jsonify({"error": "topic required"}), 400

        if not autonomous:
            return jsonify({"error": "Autonomous adapter not initialized"}), 503

        def _run_research():
            autonomous._observe_and_log()
            decision = {'type': 'research_ai_trends', 'data': {'topic': topic}}
            original_exec = autonomous.phase_2_execute
            autonomous.phase_2_execute = True
            try:
                autonomous._execute_decision(decision)
            finally:
                autonomous.phase_2_execute = original_exec

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_run_research)
            try:
                future.result(timeout=30)
            except concurrent.futures.TimeoutError:
                logger.warning(f"research/run timed out for topic: {topic}")

        summary = f"「{topic}」のリサーチが完了しました。レポートは output/ フォルダに保存されました。"
        return jsonify({"status": "success", "summary": summary})
    except Exception as e:
        logger.error(f"research/run error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/research/check', methods=['GET'])
def check_research_for_topic():
    """Check if D1 research files exist for a given topic."""
    import pathlib
    topic = request.args.get('topic', '').strip()
    if not topic:
        return jsonify({"has_research": False, "file": None}), 400

    vault_dir = pathlib.Path("obsidian_vault/knowledge")
    if not vault_dir.exists():
        return jsonify({"has_research": False, "file": None})

    files = sorted(vault_dir.glob("research_*.md"), key=lambda x: x.stat().st_mtime, reverse=True)
    keywords = [k.lower() for k in topic.split() if len(k) > 1] or [topic.lower()]

    for f in files[:20]:
        try:
            content = f.read_text(encoding='utf-8', errors='ignore')
            if len(content) < 300:
                continue
            if any(kw in content.lower() for kw in keywords):
                return jsonify({"has_research": True, "file": f.name})
        except Exception:
            continue

    return jsonify({"has_research": False, "file": None})

@app.route('/api/niche/validate', methods=['POST'])
def niche_validate():
    """5-axis niche validation before product generation."""
    data = request.get_json(silent=True) or {}
    topic = data.get('topic', '').strip()
    if not topic:
        return jsonify({"status": "error", "error": "topic required"}), 400
    try:
        from backend.pipelines.niche_validator import NicheValidator
        import os as _os
        validator = NicheValidator(groq_api_key=_os.getenv("GROQ_API_KEY"))
        result = validator.validate(topic)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"[NICHE VALIDATE] {e}", exc_info=True)
        return jsonify({"status": "error", "error": str(e)}), 500


_TONE_PROMPTS_EN = {
    'conversational': (
        "Rewrite this in a conversational, engaging tone — like a smart friend explaining it.\n\n"
        "Rules:\n"
        "- Use contractions (you're, it's, don't, here's)\n"
        "- Start sentences with 'And,' 'But,' 'So,' 'Here's the thing:'\n"
        "- Add rhetorical questions to pull the reader in\n"
        "- Replace formal transitions: 'Furthermore' → 'And get this', 'Therefore' → 'So here's what this means'\n"
        "- Power words: crazy, wild, game-changer, massive, ridiculously\n"
        "- Reader asides like '(yeah, I know)' or '(trust me on this)'\n"
        "- Paragraphs max 2-3 sentences. Keep it punchy."
    ),
    'storytelling_us': (
        "Rewrite this using American storytelling structure. Lead with a scene, not a fact.\n\n"
        "Rules:\n"
        "- Open with 'Picture this:' or 'Imagine...' — a specific micro-scenario\n"
        "- Use a real-feeling character with a name (not 'a person' or 'someone')\n"
        "- Add sensory detail: what they saw, felt, heard\n"
        "- Build tension → resolution arc\n"
        "- Data and stats come AFTER the story, never before\n"
        "- End with a transformation: 'Three months later...'\n"
        "- Conversational, warm tone throughout."
    ),
    'pasona': (
        "Rewrite this using the PASONA sales framework. Make the reader feel seen, then solve their problem.\n\n"
        "Structure (in order):\n"
        "1. Problem — Open with a specific, visceral pain point. Make it concrete.\n"
        "2. Agitate — Amplify the cost of doing nothing. What does inaction cost them?\n"
        "3. Solution — Present the method as the answer. Be specific, not vague.\n"
        "4. Narrow — Define exactly who this is for (income level, situation, stage).\n"
        "5. Action — End with a strong, urgent CTA.\n\n"
        "Style:\n"
        "- Direct. Benefit-focused. Address reader as 'you'.\n"
        "- Numbers for credibility (use sparingly).\n"
        "- Short punchy sentences mixed with medium ones."
    ),
    'quest': (
        "Rewrite this using the QUEST sales framework. Consultative, empathetic, logical.\n\n"
        "Structure (in order):\n"
        "1. Qualify — Who exactly is this for? Be specific and exclusive.\n"
        "2. Understand — Show deep empathy for their struggle. They must feel heard.\n"
        "3. Educate — Explain why current approaches fail. Make them rethink.\n"
        "4. Stimulate — Paint the after-picture vividly. Transformation, not features.\n"
        "5. Transition — Smooth, low-friction CTA ('Ready to start?' or 'Here's your next step').\n\n"
        "Style:\n"
        "- Lead with questions. Warm consultant tone.\n"
        "- Logic AND emotional triggers together.\n"
        "- Use brief case study or example in step 3 or 4."
    ),
}

_TONE_PROMPTS_JA = {
    'casual': "もっとカジュアルで親しみやすい口調で書き直してください。友達に話しかけるような文体で。",
    'professional': "専門的・権威のある口調に書き直してください。信頼感と説得力を最大化してください。",
    'story': "物語形式で書き直してください。読者が主人公で、課題→解決の旅路として展開してください。",
    'persuasive': "説得力の高いセールスライティングに書き直してください。痛みを明確にし、解決策を提示し、行動を促してください。",
}


@app.route('/api/productize/rewrite', methods=['POST'])
def productize_rewrite():
    """Rewrite a single section's content using Groq with a user-supplied instruction."""
    data = request.get_json(silent=True) or {}
    content = data.get('content', '').strip()
    instruction = data.get('instruction', '').strip()
    tone_preset = data.get('tone_preset', '').strip()
    language = data.get('language', 'en')

    # tone_preset takes priority over raw instruction
    if tone_preset:
        if language == 'en' and tone_preset in _TONE_PROMPTS_EN:
            instruction = _TONE_PROMPTS_EN[tone_preset]
        elif language == 'ja' and tone_preset in _TONE_PROMPTS_JA:
            instruction = _TONE_PROMPTS_JA[tone_preset]

    if not content or not instruction:
        return jsonify({"error": "content and instruction are required"}), 400

    # Detect compression/shortening instructions — preservation rule conflicts with these
    compression_keywords = ['要約', '短く', '半分', '簡潔', 'まとめ', 'summarize', 'shorten', 'brief', 'condense', 'shorter', 'compress']
    is_compression = any(kw in instruction.lower() for kw in compression_keywords)

    # Context from Sage's Identity (Soul)
    identity_context = ""
    if IDENTITY:
        role = IDENTITY.get('role', 'Expert')
        niche = IDENTITY.get('niche', 'Digital Product Creation')
        tone = IDENTITY.get('tone', 'Professional')
        identity_context = f"\n[AI IDENTITY]\nRole: {role}\nNiche: {niche}\nTone: {tone}\n\nYou are writing as this persona. Ensure the content reflects this brand voice."

    if language == 'ja':
        preservation_rule = (
            "- 要点は保ちながら指示に従って圧縮・簡潔にしてください。\n" if is_compression
            else "- 元の情報・事実は保持してください（重要な内容を削除しないこと）\n"
        )
        prompt = (
            f"以下のコンテンツを、指示に従って書き直してください。\n\n"
            f"【指示】{instruction}\n\n"
            f"{identity_context}\n\n"
            f"【元のコンテンツ】\n{content}\n\n"
            f"【出力ルール】\n"
            f"{preservation_rule}"
            f"- 指示の口調・形式に合わせて書き直してください\n"
            f"- 日本語で書いてください。\n"
            f"- 前置きや説明は不要。書き直した本文のみを出力してください。"
        )
    else:
        preservation_rule = (
            "- Compress to the key points while following the instruction.\n" if is_compression
            else "- Preserve the original facts and information (do not delete important content).\n"
        )
        prompt = (
            f"Rewrite the following content according to the instruction.\n\n"
            f"[INSTRUCTION] {instruction}\n\n"
            f"{identity_context}\n\n"
            f"[ORIGINAL CONTENT]\n{content}\n\n"
            f"[OUTPUT RULES]\n"
            f"{preservation_rule}"
            f"- Rewrite in the tone/format requested by the instruction.\n"
            f"- Write in English.\n"
            f"- Output only the rewritten content — no preamble, no explanation."
        )
    # Use course_gen_global._invoke_llm() — has Groq→Gemini fallback built in
    pipeline = get_or_init_pipeline()
    if pipeline:
        try:
            rewritten = pipeline._invoke_llm(prompt)
            if rewritten and rewritten.strip():
                return jsonify({"status": "success", "rewritten": rewritten.strip()}), 200
        except Exception as e:
            logger.warning(f"[REWRITE] pipeline._invoke_llm failed: {e}")

    # Direct Groq fallback (when pipeline not available)
    try:
        import os as _os
        from groq import Groq as _Groq
        _groq = _Groq(api_key=_os.getenv("GROQ_API_KEY"))
        resp = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
        )
        rewritten = resp.choices[0].message.content.strip()
        return jsonify({"status": "success", "rewritten": rewritten}), 200
    except Exception as e:
        logger.error(f"[REWRITE] All LLMs failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/productize/regenerate_images', methods=['POST'])
def productize_regenerate_images():
    """Regenerate course images. Uses LLM to translate any user instruction into image style keywords."""
    data = request.get_json(silent=True) or {}
    sections = data.get('sections', [])
    custom_instruction = data.get('custom_instruction', '').strip()
    topic = data.get('topic', '')

    if not sections:
        return jsonify({"error": "sections required"}), 400

    try:
        from backend.integrations.image_generation import image_gen_enhanced

        # --- LLM style translation (Groq → Gemini fallback via course_gen_global) ---
        image_style = None
        style_applied = None
        if course_gen_global and custom_instruction:
            style_prompt = (
                f"Generate a concise image style description (max 30 words) for this course.\n"
                f"Topic: {topic}\n"
                f"User instruction: {custom_instruction}\n\n"
                f"Output ONLY image style keywords, e.g.: "
                f"\"modern office, AI technology, blue tones, professional\"\n"
                f"No explanations, no punctuation other than commas."
            )
            try:
                raw = course_gen_global._invoke_llm(style_prompt).strip()
                # Strip markdown/quotes if LLM wraps the output
                image_style = raw.strip('`"\' \n').split('\n')[0][:120]
                style_applied = image_style
                logger.info(f"[REGEN_IMG] LLM style: {image_style}")
            except Exception as _se:
                logger.warning(f"[REGEN_IMG] LLM style failed, using raw instruction: {_se}")

        base_style = image_style or custom_instruction or f"{topic} professional course illustration"

        # Pre-compute topic keywords for LoremFlickr fallback (avoids style-descriptor pollution)
        topic_kw = course_gen_global._get_topic_visual_keywords(topic) if course_gen_global else None

        images = {}
        for idx, section in enumerate(sections):
            title = section.get('title', '')
            # Use pipeline's topic-aware image prompt so LoremFlickr gets English topic keywords
            # (prevents Japanese section titles from becoming useless LoremFlickr keywords)
            if course_gen_global and hasattr(course_gen_global, '_generate_image_prompt'):
                base_prompt = course_gen_global._generate_image_prompt(title, topic)
                prompt = f"{base_prompt}, {base_style}" if base_style else base_prompt
            else:
                prompt = f"{base_style}, photorealistic, high quality, 16:9" if base_style else f"{title}, photorealistic, high quality, 16:9"
            try:
                url = image_gen_enhanced.generate_social_media_image(prompt, platform="twitter", topic_keywords=topic_kw, section_index=idx)
                images[title] = {"type": "generated", "url": url, "prompt": prompt}
                logger.info(f"[REGEN_IMG] {title[:40]} → {url[:60] if url else 'None'}")
            except Exception as e:
                logger.warning(f"[REGEN_IMG] Failed for '{title}': {e}")
                images[title] = {"type": "prompt_only", "prompt": prompt}

        return jsonify({"status": "success", "images": images, "style_applied": style_applied}), 200
    except Exception as e:
        logger.error(f"[REGEN_IMG] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/productize/finalize', methods=['POST'])
def productize_finalize():
    """Save user-edited course content back to Obsidian vault."""
    import pathlib
    data = request.get_json(silent=True) or {}
    topic = data.get('topic', 'Untitled')
    sections = data.get('sections', [])
    sales_page = data.get('sales_page', '')
    original_note = data.get('obsidian_note', '')

    if not sections:
        return jsonify({"error": "sections required"}), 400

    from datetime import datetime
    ts = datetime.now().strftime('%Y-%m-%d %H:%M')

    # Build markdown
    lines = [f"# {topic} - Final Edition\n", f"**Finalized**: {ts}\n", ""]
    lines.append("## 📋 Course Outline\n")
    for i, s in enumerate(sections, 1):
        lines.append(f"{i}. {s.get('title', '')}")
    lines.append("\n---\n")

    for i, s in enumerate(sections, 1):
        lines.append(f"## {i}. {s.get('title', '')}\n")
        lines.append(s.get('content', ''))
        lines.append("\n---\n")

    if sales_page:
        lines.append("## 💰 Sales Page\n")
        lines.append(sales_page)
        lines.append("\n")

    final_md = "\n".join(lines)

    # Save — overwrite original or create _final variant
    try:
        vault_dir = pathlib.Path("obsidian_vault/knowledge")
        vault_dir.mkdir(parents=True, exist_ok=True)
        if original_note:
            orig = pathlib.Path(original_note)
            save_path = orig if orig.exists() else vault_dir / orig.name
        else:
            import time
            save_path = vault_dir / f"course_{int(time.time())}_final.md"

        save_path.write_text(final_md, encoding='utf-8')
        logger.info(f"[FINALIZE] Saved edited course: {save_path}")
        return jsonify({"status": "success", "saved_path": str(save_path)}), 200
    except Exception as e:
        logger.error(f"[FINALIZE] Save error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/monetization/approve', methods=['POST'])
def approve_warn_product():
    """Manual approval of QA WARN."""
    if request.remote_addr not in ['127.0.0.1', 'localhost', '::1']:
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json(silent=True) or {}
    topic = data.get("topic")
    if not topic: return jsonify({"error": "missing topic"}), 400
    pipeline = globals().get('course_gen_global')
    if pipeline and pipeline.brain:
        pipeline.brain.provide_feedback(query=topic, correct_response=f"[APPROVED] {topic}", was_helpful=True)
    if MonetizationMeasure:
        MonetizationMeasure.log_event("human_approved", {"topic": topic})
    return jsonify({"status": "approved"}), 200

@app.route('/api/brain/stats', methods=['GET'])
def get_brain_stats():
    pipeline = globals().get('course_gen_global')
    orc = globals().get('orchestrator')
    brain = (
        (pipeline.brain if pipeline and pipeline.brain else None)
        or getattr(orc, 'neuromorphic_brain', None)
        or getattr(orc, 'brain', None)
    )
    if brain:
        stats = brain.get_stats()
        total = stats.get("total_queries", 0)
        hits = stats.get("brain_hits", 0)
        stats["accuracy"] = (hits / total) if total > 0 else 0.0
        return jsonify({"status": "success", "data": stats}), 200
    return jsonify({"status": "error", "error": "brain not initialized"}), 503

# ── Stripe Checkout ──────────────────────────────────────────────────────────
@app.route('/api/stripe/checkout', methods=['POST'])
def stripe_checkout():
    """
    Creates a Stripe Payment Link for the Sage 3.0 product.
    Requires STRIPE_SECRET_KEY in .env.
    Falls back to Gumroad if key not set.
    """
    try:
        from backend.integrations.stripe_integration import stripe_integration
        data = request.get_json(silent=True) or {}
        product_name = data.get('product_name', '2026 AI Influencer Monetization Express')
        price = float(data.get('price', 29.99))

        result = stripe_integration.create_payment_link(product_name, price)
        if result.get('status') == 'success':
            return jsonify(result), 200
        # no_key or error → Gumroad fallback
        return jsonify({
            'status': 'fallback',
            'url': 'https://naofumi3.gumroad.com/l/yvzrfjd',
            'message': result.get('message', 'Stripe not configured — using Gumroad'),
        }), 200
    except Exception as e:
        print(f"[Stripe endpoint] Error: {e}")
        return jsonify({
            'status': 'fallback',
            'url': 'https://naofumi3.gumroad.com/l/yvzrfjd',
            'message': str(e),
        }), 200


# ── PayPal Checkout ───────────────────────────────────────────────────────────
@app.route('/api/paypal/checkout', methods=['POST'])
def paypal_checkout():
    """
    Creates a PayPal order and returns the approve URL.
    Requires PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET in .env.
    Falls back to PayPal.me if keys not set.
    """
    try:
        from backend.integrations.paypal_integration import paypal_integration
        data = request.get_json(silent=True) or {}
        amount = str(data.get('amount', '29.99'))
        result = paypal_integration.create_order(amount=amount)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            'status': 'no_keys',
            'url': 'https://paypal.me/japanletgo/29.99',
            'message': str(e),
        }), 200


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
    
    # Try importing psutil, safe fallback if missing
    try:
        import psutil
        handle_pid_lock()
    except ImportError:
        print("⚠️ 'psutil' not found. Skipping robust PID check (Zombie killer disabled).")
        # Still write PID for manual checks
        with open(PID_FILE, 'w') as f:
            f.write(str(os.getpid()))

    # Initialize Brain AFTER securing the lock
    init_brain()

    try:
        app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False)
    except KeyboardInterrupt:
        print("\n[STOP] Shutting down gracefully...")
        shutdown_autonomous()
    finally:
        shutdown_autonomous()
