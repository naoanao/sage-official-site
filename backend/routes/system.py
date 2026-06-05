from flask import Blueprint, request, jsonify, current_app

system_bp = Blueprint('system_bp', __name__)


@system_bp.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200


@system_bp.route('/api/healing-status', methods=['GET'])
def healing_status():
    return jsonify({'status': 'idle'}), 200


@system_bp.route('/api/self-test', methods=['POST'])
def self_test():
    return jsonify({'status': 'ok', 'checks': []}), 200
