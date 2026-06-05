"""Miscellaneous routes — Phase 5 blueprint extraction (command, strategy, SPA)."""
import subprocess
from flask import Blueprint, request, jsonify, send_from_directory, abort, current_app

misc_bp = Blueprint('misc_bp', __name__)


@misc_bp.route('/api/command/execute', methods=['POST'])
def command_execute():
    data = request.get_json()
    if not data or 'command' not in data:
        return jsonify({'error': 'command is required'}), 400
    from backend.modules.file_operations_agent import FileOperationsAgent
    agent = FileOperationsAgent()
    try:
        result = agent.execute_command(data['command'], timeout=data.get('timeout', 30))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@misc_bp.route('/api/admin/strategy', methods=['GET'])
def get_strategy():
    sm = current_app.config.get('STRATEGY_MANAGER')
    if not sm:
        return jsonify({'error': 'Strategy manager not available'}), 503
    return jsonify(sm.get_strategy())


@misc_bp.route('/api/admin/strategy', methods=['POST'])
def save_strategy():
    sm = current_app.config.get('STRATEGY_MANAGER')
    if not sm:
        return jsonify({'error': 'Strategy manager not available'}), 503
    data = request.get_json()
    success = sm.save_strategy(data)
    if success:
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Failed to save strategy'}), 500


@misc_bp.route('/')
def index():
    try:
        return send_from_directory('../frontend/dist', 'index.html')
    except Exception:
        return send_from_directory('.', 'index.html')


@misc_bp.route('/dashboard')
@misc_bp.route('/dashboard.html')
def dashboard():
    return index()


@misc_bp.route('/<path:path>')
def spa_catch_all(path):
    if path.startswith('api/') or path.startswith('files/'):
        abort(404)
    return index()
