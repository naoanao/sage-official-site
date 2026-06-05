import logging
import threading
from flask import Blueprint, jsonify, request, current_app

from backend.utils.auth import apply_public_strategy

sns_writer_bp = Blueprint("sns_writer", __name__)
logger = logging.getLogger(__name__)


@sns_writer_bp.before_request
def sns_writer_auth():
    apply_public_strategy()


@sns_writer_bp.route('/api/blog/run-now', methods=['POST'])
def api_blog_run_now():
    try:
        logger.info("\U0001f680 [BLOG] Manual trigger via /api/blog/run-now")
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


@sns_writer_bp.route('/api/gumroad/run-now', methods=['POST'])
def api_gumroad_run_now():
    try:
        logger.info("\U0001f680 [GUMROAD] Manual trigger via /api/gumroad/run-now")
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


@sns_writer_bp.route('/api/sns/post_bilingual', methods=['POST'])
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


@sns_writer_bp.route('/api/sns/sync_performance', methods=['POST'])
def api_sns_sync_performance():
    try:
        from backend.modules.sns_performance_tracker import SNSPerformanceTracker
        tracker = SNSPerformanceTracker()
        result = tracker.sync_and_learn()
        return jsonify({"status": "ok", **result}), 200
    except Exception as e:
        logger.error(f"[SNS_TRACKER] sync_performance error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@sns_writer_bp.route('/api/sns/performance_summary', methods=['GET'])
def api_sns_performance_summary():
    try:
        from backend.modules.sns_performance_tracker import SNSPerformanceTracker
        tracker = SNSPerformanceTracker()
        summary = tracker.get_summary()
        return jsonify({"status": "ok", **summary}), 200
    except Exception as e:
        logger.error(f"[SNS_TRACKER] summary error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
