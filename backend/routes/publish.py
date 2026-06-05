import json
import logging
import os
from pathlib import Path
import threading
from flask import Blueprint, jsonify, request, current_app

from backend.utils.auth import apply_public_strategy

publish_bp = Blueprint("publish", __name__)
logger = logging.getLogger(__name__)


@publish_bp.before_request
def publish_auth():
    apply_public_strategy()


@publish_bp.route('/api/sns/stats', methods=['GET'])
def get_sns_stats():
    """Aggregate real SNS post evidence from sns_evidence.jsonl (No Lies)"""
    log_dir = Path(current_app.config.get('LOG_DIR', ''))
    evidence_file = log_dir / "sns_evidence.jsonl"

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

        from datetime import datetime
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


@publish_bp.route('/api/telegram/health', methods=['GET'])
def telegram_health():
    is_enabled = os.getenv("SAGE_ENABLE_TELEGRAM") == "1"
    has_token = bool(os.getenv("TELEGRAM_BOT_TOKEN"))
    return jsonify({
        "status": "wired",
        "enabled": is_enabled,
        "configured": has_token,
        "reason": "restored"
    }), 200


@publish_bp.route('/api/bluesky/status', methods=['GET'])
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


@publish_bp.route('/api/notion/status', methods=['GET'])
def notion_status():
    is_enabled = os.getenv("SAGE_ENABLE_NOTION") == "1"
    has_token = bool(os.getenv("NOTION_API_KEY"))
    return jsonify({
        "status": "wired",
        "enabled": is_enabled,
        "configured": has_token,
        "reason": "restored"
    }), 200


@publish_bp.route('/api/devto/status', methods=['GET'])
def devto_status():
    api_key = os.getenv('DEVTO_API_KEY')
    return jsonify({'configured': bool(api_key), 'status': 'ready' if api_key else 'missing_key'})


@publish_bp.route('/api/engagement/status', methods=['GET'])
def api_engagement_status():
    _is_automation_active = current_app.config.get('IS_AUTOMATION_ACTIVE')
    _get_last_run_time = current_app.config.get('GET_LAST_RUN_TIME')
    try:
        status = {
            "active": _is_automation_active("engagement") if _is_automation_active else False,
            "last_run": _get_last_run_time("engagement") if _get_last_run_time else "Never",
            "bluesky_handle": os.getenv("BLUESKY_HANDLE", "Not set"),
            "instagram_account": os.getenv("INSTAGRAM_ACCOUNT_ID", "Not set"),
            "recent_actions": [],
        }

        import glob as _glob
        log_pattern = os.path.join(os.path.dirname(__file__), "..", "..", "logs", "engagement*.log")
        log_files = sorted(_glob.glob(log_pattern), reverse=True)
        if log_files:
            with open(log_files[0], "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()[-50:]
            actions = []
            for line in lines:
                if "liked" in line.lower() or "replied" in line.lower() or "follow" in line.lower():
                    actions.append(line.strip()[-150:])
            status["recent_actions"] = actions[-10:]

        engagement_log_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "data", "engagement_log.json"
        )
        if os.path.exists(engagement_log_path):
            with open(engagement_log_path, "r", encoding="utf-8") as f:
                eng_data = json.load(f)
            status["engagement_log_summary"] = {
                "total_likes":   eng_data.get("total_likes", 0),
                "total_replies": eng_data.get("total_replies", 0),
                "last_session":  eng_data.get("last_session", "Never"),
            }

        return jsonify({"status": "ok", **status}), 200
    except Exception as e:
        logger.error(f"[ENGAGEMENT] status error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@publish_bp.route('/api/monetization/tags', methods=['GET'])
def get_tag_performance():
    MonetizationMeasure = current_app.config.get('MONETIZATION_MEASURE')
    if MonetizationMeasure:
        stats = MonetizationMeasure.get_tag_stats()
        return jsonify({"status": "success", "data": stats}), 200
    return jsonify({"status": "error", "message": "MonetizationMeasure not loaded"}), 503


@publish_bp.route('/api/monetization/stats', methods=['GET'])
def get_monetization_stats():
    MonetizationMeasure = current_app.config.get('MONETIZATION_MEASURE')
    if MonetizationMeasure:
        stats = MonetizationMeasure.get_stats()
        return jsonify({"status": "success", "data": stats}), 200
    return jsonify({"status": "error", "message": "MonetizationMeasure not loaded"}), 503


@publish_bp.route('/api/telegram/send', methods=['POST'])
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


@publish_bp.route('/api/bluesky/post', methods=['POST'])
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
        try:
            from integrations.bluesky_agent import BlueskyAgent
        except ImportError:
            from backend.integrations.bluesky_agent import BlueskyAgent

        agent = BlueskyAgent()

        result = agent.post_skeet(text)

        payload = {}
        if isinstance(result, dict):
            payload = result.copy()
            if "raw" in payload:
                payload["raw"] = str(payload["raw"])
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

        try:
            current_app.logger.error(f"[BLUESKY_POST_ERROR:{err_id}] {str(e)}\n{traceback.format_exc()}")
        except Exception:
            print(f"[FALLBACK_LOG:{err_id}] {traceback.format_exc()}")

        msg = str(e) or type(e).__name__

        if "Unauthorized" in msg or "Authentication" in msg:
            return jsonify({"error": "AUTH_FAILED", "id": err_id, "hint": "Check BLUESKY_HANDLE/PASSWORD"}), 401
        elif "Network" in msg or "Connection" in msg or "Timeout" in msg or "502" in msg:
            return jsonify({"error": "NETWORK_FAILED", "id": err_id}), 502
        elif "No module named" in msg or "ImportError" in msg:
            return jsonify({"error": "IMPORT_FAILED", "id": err_id, "detail": msg}), 500
        else:
            return jsonify({"error": "INTERNAL_ERROR", "id": err_id, "detail": msg[:100]}), 500


@publish_bp.route('/api/devto/post', methods=['POST'])
def devto_post():
    api_key = os.getenv('DEVTO_API_KEY')
    if not api_key:
        return jsonify({'status': 'error', 'message': 'DEVTO_API_KEY not set'}), 403

    data = request.get_json(silent=True) or {}
    title = data.get('title', 'Sage AI Post')
    body = data.get('body', '')
    tags = data.get('tags', ['ai', 'automation'])
    published = data.get('published', True)
    canonical_url = data.get('canonical_url')

    if not body:
        return jsonify({'status': 'error', 'message': 'No body provided'}), 400

    try:
        from backend.integrations.devto_integration import DevToIntegration
        agent = DevToIntegration()
        result = agent.post_article(
            title=title,
            content_markdown=body,
            tags=tags[:4],
            published=published,
            canonical_url=canonical_url,
        )
        if result.get('status') == 'success':
            return jsonify({'status': 'success', 'url': result.get('url'), 'id': result.get('id')})
        else:
            return jsonify({'status': 'error', 'message': result.get('message', 'Post failed')}), 500
    except Exception as e:
        logger.error(f'[DEV.TO] post error: {e}')
        return jsonify({'status': 'error', 'message': str(e)}), 500


@publish_bp.route('/api/notion/write', methods=['POST'])
def notion_write():
    if os.getenv("SAGE_ENABLE_NOTION") != "1":
        return jsonify({"error": "Feature disabled by default"}), 403

    request_data = request.get_json(silent=True) or {}
    mode = request_data.get("mode", "page")
    title = request_data.get("title")
    content = request_data.get("content", "")

    if not title:
        return jsonify({"error": "No title provided"}), 400

    try:
        from backend.integrations.notion_integration import notion_integration

        result = None
        if mode == "page":
            parent_id = request_data.get("parent_id")
            result = notion_integration.create_page(title, content, parent_id)
        elif mode == "database":
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


@publish_bp.route('/api/instagram/status', methods=['GET'])
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


@publish_bp.route('/api/instagram/post', methods=['POST'])
def instagram_post():
    request_data = request.get_json(silent=True) or {}
    image_url = request_data.get("image_url")
    caption = request_data.get("caption") or request_data.get("content", "Sage System Online")

    if not image_url:
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

        backend_url = (os.getenv('VITE_BACKEND_URL') or '').rstrip('/')
        tmp_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'tmp_images')
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
            msg = err.get("message") if isinstance(err, dict) else str(err)
            logger.error(f"Instagram post failed: {err}")
            return jsonify({"status": "error", "error": err, "message": msg or "Instagram post failed"}), 500

    except Exception as e:
        logger.error(f"Instagram post error: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500


@publish_bp.route('/api/blog/run-now', methods=['POST'])
def api_blog_run_now():
    try:
        logger.info("🚀 [BLOG] Manual trigger via /api/blog/run-now")
        _automation_stop_events = current_app.config.get('AUTOMATION_STOP_EVENTS', {})
        _record_run_fn = current_app.config.get('RECORD_RUN')
        if _automation_stop_events.get('blog', threading.Event()).is_set():
            return jsonify({"status": "error", "message": "Blog automation is disabled. Enable it first."}), 403
        from backend.scheduler.blog_scheduler import BlogScheduler
        blog_sched = BlogScheduler()
        blog_sched.run_once()
        if _record_run_fn:
            _record_run_fn("blog")
        return jsonify({"status": "success", "message": "Blog post generated and published. Check git log."})
    except Exception as e:
        logger.error(f"[BLOG] Manual trigger error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@publish_bp.route('/api/gumroad/run-now', methods=['POST'])
def api_gumroad_run_now():
    try:
        logger.info("🚀 [GUMROAD] Manual trigger via /api/gumroad/run-now")
        _automation_stop_events = current_app.config.get('AUTOMATION_STOP_EVENTS', {})
        _record_run_fn = current_app.config.get('RECORD_RUN')
        if _automation_stop_events.get('gumroad', threading.Event()).is_set():
            return jsonify({"status": "error", "message": "Gumroad automation is disabled. Enable it first."}), 403
        from backend.scheduler.gumroad_scheduler import GumroadScheduler
        gumroad_sched = GumroadScheduler()
        gumroad_sched.run_once()
        if _record_run_fn:
            _record_run_fn("gumroad")
        return jsonify({"status": "success", "message": "Gumroad scheduler executed. Check logs."})
    except Exception as e:
        logger.error(f"[GUMROAD] Manual trigger error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@publish_bp.route('/api/sns/post_bilingual', methods=['POST'])
def api_sns_post_bilingual():
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


@publish_bp.route('/api/sns/sync_performance', methods=['POST'])
def api_sns_sync_performance():
    try:
        from backend.modules.sns_performance_tracker import SNSPerformanceTracker
        tracker = SNSPerformanceTracker()
        result = tracker.sync_and_learn()
        return jsonify({"status": "ok", **result}), 200
    except Exception as e:
        logger.error(f"[SNS_TRACKER] sync_performance error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@publish_bp.route('/api/sns/performance_summary', methods=['GET'])
def api_sns_performance_summary():
    try:
        from backend.modules.sns_performance_tracker import SNSPerformanceTracker
        tracker = SNSPerformanceTracker()
        summary = tracker.get_summary()
        return jsonify({"status": "ok", **summary}), 200
    except Exception as e:
        logger.error(f"[SNS_TRACKER] summary error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
