"""Jobs routes — extracted from flask_server.py inline @app.route handlers."""
import uuid
from flask import Blueprint, request, jsonify

jobs_bp = Blueprint('jobs_bp', __name__)

# In-memory job store (volatile, sufficient for current usage)
_jobs = {}


@jobs_bp.route('/api/jobs/pipeline/start', methods=['POST'])
def start_pipeline():
    data = request.get_json()
    if not data or not data.get('topic'):
        return jsonify({'error': 'topic is required'}), 400
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {'status': 'running', 'topic': data['topic'], 'type': data.get('type', 'COURSE')}
    return jsonify({'job_id': job_id, 'status': 'running'}), 202


@jobs_bp.route('/api/jobs/<job_id>/status', methods=['GET'])
def job_status(job_id):
    job = _jobs.get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify({'job_id': job_id, **job})
