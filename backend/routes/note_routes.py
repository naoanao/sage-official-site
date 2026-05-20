import json
import pathlib
from flask import Blueprint, request, jsonify

note_bp = Blueprint("note", __name__)
DRAFTS_PATH = pathlib.Path("backend/data/note_drafts.json")

@note_bp.route("/api/note/pending_drafts", methods=["GET"])
def note_pending_drafts():
    if not DRAFTS_PATH.exists():
        return jsonify({"drafts": [], "count": 0})
    try:
        drafts = json.loads(DRAFTS_PATH.read_text(encoding="utf-8"))
        pending = [d for d in drafts if d.get("status") == "pending_review"]
        return jsonify({"drafts": pending, "count": len(pending)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@note_bp.route("/api/note/mark_uploaded", methods=["POST"])
def note_mark_uploaded():
    data = request.get_json(silent=True) or {}
    day = data.get("day")
    if not DRAFTS_PATH.exists():
        return jsonify({"error": "no drafts file"}), 404
    try:
        drafts = json.loads(DRAFTS_PATH.read_text(encoding="utf-8"))
        for d in drafts:
            if d.get("day") == day:
                d["status"] = "uploaded"
                d["uploaded_at"] = data.get("uploaded_at", "")
                d["note_key"] = data.get("note_key", "")
        DRAFTS_PATH.write_text(json.dumps(drafts, ensure_ascii=False, indent=2), encoding="utf-8")
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@note_bp.route("/note_uploader", methods=["GET"])
def note_uploader():
    html_path = pathlib.Path("backend/static/note_uploader.html")
    if html_path.exists():
        return html_path.read_text(encoding="utf-8"), 200, {"Content-Type": "text/html; charset=utf-8"}
    return "<h1>note_uploader.html not found</h1>", 404
