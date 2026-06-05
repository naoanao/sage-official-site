# backend/routes/AGENTS.md
## Goal
Extract routes from flask_server.py into focused blueprints without changing request/response contracts.

## Rules
- Preserve route paths, methods, payload shapes, and status codes.
- Move dependencies via current_app.config when possible.
- Avoid circular imports; prefer delayed imports if already in use.
- Keep auth, validation gates, and fallback logic byte-for-byte equivalent unless tests fail.
- Remove moved route code from flask_server.py only after tests pass.
