"""Note routes — legacy blueprint with CRUD for notes."""
import os
import json
from flask import Blueprint, request, jsonify

note_bp = Blueprint('note_bp', __name__)

NOTES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'notes')
os.makedirs(NOTES_DIR, exist_ok=True)


def _note_path(note_id):
    return os.path.join(NOTES_DIR, f'{note_id}.json')


@note_bp.route('/api/notes', methods=['GET'])
def list_notes():
    notes = []
    if os.path.isdir(NOTES_DIR):
        for fname in os.listdir(NOTES_DIR):
            if fname.endswith('.json'):
                try:
                    with open(os.path.join(NOTES_DIR, fname), 'r') as f:
                        notes.append(json.load(f))
                except (json.JSONDecodeError, IOError):
                    continue
    return jsonify(notes)


@note_bp.route('/api/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'error': 'title is required'}), 400
    note_id = str(hash(data['title'])) if 'id' not in data else data['id']
    note = {'id': note_id, 'title': data['title'], 'content': data.get('content', '')}
    with open(_note_path(note_id), 'w') as f:
        json.dump(note, f, indent=2)
    return jsonify(note), 201


@note_bp.route('/api/notes/<note_id>', methods=['GET'])
def get_note(note_id):
    path = _note_path(note_id)
    if not os.path.exists(path):
        return jsonify({'error': 'Note not found'}), 404
    with open(path, 'r') as f:
        return jsonify(json.load(f))


@note_bp.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    path = _note_path(note_id)
    if not os.path.exists(path):
        return jsonify({'error': 'Note not found'}), 404
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    with open(path, 'r') as f:
        note = json.load(f)
    note.update({k: v for k, v in data.items() if k in ('title', 'content')})
    with open(path, 'w') as f:
        json.dump(note, f, indent=2)
    return jsonify(note)


@note_bp.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    path = _note_path(note_id)
    if not os.path.exists(path):
        return jsonify({'error': 'Note not found'}), 404
    os.remove(path)
    return jsonify({'status': 'deleted'})
