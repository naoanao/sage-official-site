"""Automation routes — Phase 5 blueprint extraction."""
import threading
from flask import Blueprint, request, jsonify

automation_bp = Blueprint('automation_bp', __name__)

_automation_stop_events = {}
def _is_automation_active(_id): return True
def _get_last_run_time(_id): return "Never"
def _record_run(_id): pass


AUTOMATIONS = [
    {'id': 'bluesky', 'name': 'Bluesky Crosspost', 'active': True},
    {'id': 'blog', 'name': 'Blog Generator', 'active': True},
    {'id': 'gumroad', 'name': 'Gumroad Product Sync', 'active': True},
    {'id': 'engagement', 'name': 'Engagement Analyzer', 'active': True},
    {'id': 'market_scan', 'name': 'Market Scanner', 'active': True},
    {'id': 'content_repurpose', 'name': 'Content Repurposer', 'active': True},
    {'id': 'analytics_report', 'name': 'Analytics Reporter', 'active': True},
    {'id': 'backup', 'name': 'Automated Backup', 'active': True},
    {'id': 'trend_tracker', 'name': 'Trend Tracker', 'active': True},
    {'id': 'competitor_watch', 'name': 'Competitor Watch', 'active': True},
]


@automation_bp.route('/api/automations', methods=['GET'])
def get_automations():
    return jsonify(AUTOMATIONS)


@automation_bp.route('/api/automations/toggle', methods=['POST'])
def toggle_automation():
    data = request.get_json()
    if not data or 'id' not in data:
        return jsonify({'error': 'id is required'}), 400
    automation_id = data['id']
    active = data.get('active', True)
    for a in AUTOMATIONS:
        if a['id'] == automation_id:
            a['active'] = active
            return jsonify(a)
    return jsonify({'error': 'Automation not found'}), 404


@automation_bp.route('/api/automations/<automation_id>/logs', methods=['GET'])
def automation_logs(automation_id):
    limit = request.args.get('limit', 10, type=int)
    return jsonify({'automation_id': automation_id, 'logs': [], 'limit': limit})


@automation_bp.route('/api/automations/<automation_id>/trigger', methods=['POST'])
def trigger_automation(automation_id):
    for a in AUTOMATIONS:
        if a['id'] == automation_id:
            if not a['active']:
                return jsonify({'error': 'Automation is disabled'}), 403
            return jsonify({'status': 'triggered', 'automation_id': automation_id})
    return jsonify({'error': 'Unsupported automation'}), 422
