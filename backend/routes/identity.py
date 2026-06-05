"""Identity routes — extracted from flask_server.py inline @app.route handlers."""
import os
import json
from flask import Blueprint, request, jsonify

identity_bp = Blueprint('identity_bp', __name__)

DEFAULT_IDENTITY = {
    'role': 'Sage',
    'niche': 'AI & Automation',
    'tone': 'professional',
    'visual_style': 'modern',
}


def _identity_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'identity.json')


def _load_identity():
    path = _identity_path()
    if os.path.exists(path):
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return dict(DEFAULT_IDENTITY)
    return dict(DEFAULT_IDENTITY)


def _save_identity(data):
    path = _identity_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    return data


@identity_bp.route('/api/identity', methods=['GET'])
def get_identity():
    return jsonify(_load_identity())


@identity_bp.route('/api/identity', methods=['POST'])
def save_identity():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    required_keys = ['role', 'niche', 'tone', 'visual_style']
    missing = [k for k in required_keys if k not in data]
    if missing:
        return jsonify({'error': f'Missing keys: {missing}'}), 400
    saved = _save_identity(data)
    return jsonify({'status': 'saved', 'identity': saved})


@identity_bp.route('/api/identity/default', methods=['GET'])
def default_identity():
    return jsonify(DEFAULT_IDENTITY)


@identity_bp.route('/api/identity/reset', methods=['POST'])
def reset_identity():
    saved = _save_identity(DEFAULT_IDENTITY)
    return jsonify({'status': 'reset', 'identity': saved})
