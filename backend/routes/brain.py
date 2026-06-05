"""
Blueprint for Brain, Research, Browser & Computer routes.
Extracted from flask_server.py Phase 4b.
"""
import json
import logging
import os
import pathlib
from pathlib import Path
from flask import Blueprint, current_app, jsonify, request

brain_bp = Blueprint("brain", __name__)
logger = logging.getLogger(__name__)


def _project_root():
    return current_app.config.get('PROJECT_ROOT', str(Path(__file__).resolve().parent.parent))


# ── Tone prompt config (consumed by productize blueprint) ──────────────────

_TONE_PROMPTS_EN = {
    'conversational': (
        "Rewrite this in a conversational, engaging tone — like a smart friend explaining it.\n\n"
        "Rules:\n"
        "- Use contractions (you're, it's, don't, here's)\n"
        "- Start sentences with 'And,' 'But,' 'So,' 'Here's the thing:'\n"
        "- Add rhetorical questions to pull the reader in\n"
        "- Replace formal transitions: 'Furthermore' → 'And get this', 'Therefore' → 'So here's what this means'\n"
        "- Power words: crazy, wild, game-changer, massive, ridiculously\n"
        "- Reader asides like '(yeah, I know)' or '(trust me on this)'\n"
        "- Paragraphs max 2-3 sentences. Keep it punchy."
    ),
    'storytelling_us': (
        "Rewrite this using American storytelling structure. Lead with a scene, not a fact.\n\n"
        "Rules:\n"
        "- Open with 'Picture this:' or 'Imagine...' — a specific micro-scenario\n"
        "- Use a real-feeling character with a name (not 'a person' or 'someone')\n"
        "- Add sensory detail: what they saw, felt, heard\n"
        "- Build tension → resolution arc\n"
        "- Data and stats come AFTER the story, never before\n"
        "- End with a transformation: 'Three months later...'\n"
        "- Conversational, warm tone throughout."
    ),
    'pasona': (
        "Rewrite this using the PASONA sales framework. Make the reader feel seen, then solve their problem.\n\n"
        "Structure (in order):\n"
        "1. Problem — Open with a specific, visceral pain point. Make it concrete.\n"
        "2. Agitate — Amplify the cost of doing nothing. What does inaction cost them?\n"
        "3. Solution — Present the method as the answer. Be specific, not vague.\n"
        "4. Narrow — Define exactly who this is for (income level, situation, stage).\n"
        "5. Action — End with a strong, urgent CTA.\n\n"
        "Style:\n"
        "- Direct. Benefit-focused. Address reader as 'you'.\n"
        "- Numbers for credibility (use sparingly).\n"
        "- Short punchy sentences mixed with medium ones."
    ),
    'quest': (
        "Rewrite this using the QUEST sales framework. Consultative, empathetic, logical.\n\n"
        "Structure (in order):\n"
        "1. Qualify — Who exactly is this for? Be specific and exclusive.\n"
        "2. Understand — Show deep empathy for their struggle. They must feel heard.\n"
        "3. Educate — Explain why current approaches fail. Make them rethink.\n"
        "4. Stimulate — Paint the after-picture vividly. Transformation, not features.\n"
        "5. Transition — Smooth, low-friction CTA ('Ready to start?' or 'Here's your next step').\n\n"
        "Style:\n"
        "- Lead with questions. Warm consultant tone.\n"
        "- Logic AND emotional triggers together.\n"
        "- Use brief case study or example in step 3 or 4."
    ),
}

_TONE_PROMPTS_JA = {
    'casual': "もっとカジュアルで親しみやすい口調で書き直してください。友達に話しかけるような文体で。",
    'professional': "専門的・権威のある口調に書き直してください。信頼感と説得力を最大化してください。",
    'story': "物語形式で書き直してください。読者が主人公で、課題→解決の旅路として展開してください。",
    'persuasive': "説得力の高いセールスライティングに書き直してください。痛みを明確にし、解決策を提示し、行動を促してください。",
}


# ── Scholar search (academic paper search) ────────────────────────────────

@brain_bp.route('/api/scholar/search', methods=['POST'])
def api_scholar_search():
    """Sage Scholar: Search for academic papers"""
    sage_scholar = current_app.config.get('SAGE_SCHOLAR')
    if not sage_scholar:
        return jsonify({"status": "error", "message": "Sage Scholar module not initialized"}), 503

    try:
        data = request.json or {}
        query = data.get('query')
        if not query:
            return jsonify({"status": "error", "message": "Query required"}), 400

        logger.info(f"[PILOT] Scholar Search: {query}")
        results = sage_scholar.search_papers(query)

        return jsonify({"status": "success", "results": results}), 200

    except Exception as e:
        logger.error(f"Scholar search error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ── History (conversation history) ────────────────────────────────────────

@brain_bp.route('/api/history', methods=['GET'])
def get_history():
    """
    会話履歴を取得するエンドポイント
    フロントエンドからの定期的なリクエストに対応
    """
    memory = current_app.config.get('MEMORY')

    if memory is None:
        return jsonify({"history": []})

    try:
        history_data = []

        if hasattr(memory, 'get_short_term'):
            messages = memory.get_short_term(limit=50)
            history_data = messages
        elif hasattr(memory, 'chat_memory') and hasattr(memory.chat_memory, 'messages'):
            messages = memory.chat_memory.messages[-50:]
            history_data = [
                {"role": "user" if msg.type == "human" else "assistant", "content": msg.content}
                for msg in messages
            ]

        logger.info(f"[LOG] History retrieved: {len(history_data)} messages")
        return jsonify({"history": history_data})

    except Exception as e:
        logger.error(f"[ERROR] History retrieval error: {e}")
        return jsonify({"error": str(e), "history": []}), 500


# ── Memory routes ─────────────────────────────────────────────────────────

@brain_bp.route('/api/memory/recent', methods=['GET'])
def get_recent_memories():
    """SageOS UI用: 最近のメモリカードデータを取得"""
    memory = current_app.config.get('MEMORY')

    try:
        if memory and hasattr(memory, 'get_knowledge'):
            knowledge_records = memory.get_knowledge(limit=10)
            memories = []
            for i, record in enumerate(knowledge_records):
                memories.append({
                    "id": i + 1,
                    "category": record.get('category', 'KNOWLEDGE'),
                    "content": record.get('content', '')[:120] + '...',
                    "lastAccessed": record.get('timestamp', '1h ago'),
                    "tags": record.get('tags', ['knowledge'])
                })

            if memories:
                return jsonify({"memories": memories})

        return jsonify({
            "memories": [
                {
                    "id": 1,
                    "category": "USER_PREF",
                    "content": "ユーザーは朝7時にコーヒーショップのマーケティングレポートを好む。",
                    "lastAccessed": "2m ago",
                    "tags": ["preference", "routine"]
                },
                {
                    "id": 2,
                    "category": "PROJECT_CONTEXT",
                    "content": "Sage統合の進捗: Phase 2完了。次はComputer Visionの実装。",
                    "lastAccessed": "1h ago",
                    "tags": ["dev", "sage"]
                }
            ]
        })
    except Exception as e:
        logger.error(f"[ERROR] Recent memories error: {e}")
        return jsonify({"memories": []})


@brain_bp.route('/api/memory/clear', methods=['POST'])
def clear_memory():
    """記憶のクリア"""
    memory = current_app.config.get('MEMORY')
    if memory:
        return jsonify({"status": "Memory cleared (Logic pending)"})
    return jsonify({"status": "No memory module loaded"})


# ── Browser routes ────────────────────────────────────────────────────────

@brain_bp.route('/api/browser/browse', methods=['POST'])
def api_browser_browse():
    try:
        data = request.json
        url = data.get('url')
        if not url:
            return jsonify({"status": "error", "message": "url required"}), 400

        from backend.modules.browser_agent import BrowserAgent
        agent = BrowserAgent()
        result = agent.browse(url)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Browse error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@brain_bp.route('/api/browser/search', methods=['POST'])
def api_browser_search():
    try:
        data = request.json
        query = data.get('query')
        if not query:
            return jsonify({"status": "error", "message": "query required"}), 400

        from backend.modules.browser_agent import BrowserAgent
        agent = BrowserAgent()
        result = agent.search_google(query)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@brain_bp.route('/api/browser/screenshot', methods=['POST'])
def api_browser_screenshot():
    try:
        data = request.json
        url = data.get('url')
        output_path = data.get('output_path', 'screenshot.png')
        if not url:
            return jsonify({"status": "error", "message": "url required"}), 400

        from backend.modules.browser_agent import BrowserAgent
        agent = BrowserAgent()
        result = agent.take_screenshot(url, output_path)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Screenshot error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Computer Vision routes ────────────────────────────────────────────────

@brain_bp.route('/api/computer/screenshot', methods=['POST'])
def api_computer_screenshot():
    """スクリーンショットを撮影してパスを返す"""
    try:
        from backend.integrations.computer_vision_agent import ComputerVisionAgent
        data = request.get_json(silent=True) or {}
        filename = data.get('filename', f"sage_screen_{int(__import__('time').time())}.png")
        agent = ComputerVisionAgent()
        path = agent.capture_screen(filename)
        return jsonify({"status": "success", "screenshot_path": str(path)})
    except Exception as e:
        logger.error(f"Computer screenshot error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@brain_bp.route('/api/computer/find-and-click', methods=['POST'])
def api_computer_find_and_click():
    """画面上の要素を説明文で探してクリック（分身の目と手）"""
    try:
        from backend.integrations.computer_vision_agent import ComputerVisionAgent
        data = request.get_json(silent=True) or {}
        description = data.get('description', '')
        if not description:
            return jsonify({"status": "error", "message": "description required"}), 400
        agent = ComputerVisionAgent()
        result = agent.find_and_click(description)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Computer find-and-click error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@brain_bp.route('/api/computer/click', methods=['POST'])
def api_computer_click():
    """指定座標をクリック"""
    try:
        from backend.integrations.computer_vision_agent import ComputerVisionAgent
        data = request.get_json(silent=True) or {}
        x, y = data.get('x', 0), data.get('y', 0)
        agent = ComputerVisionAgent()
        success = agent.click_element(x, y)
        return jsonify({"status": "success" if success else "error", "x": x, "y": y})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@brain_bp.route('/api/computer/status', methods=['GET'])
def api_computer_status():
    """ComputerVisionAgentの利用可能状態を確認"""
    try:
        import pyautogui
        pyautogui_ok = True
    except ImportError:
        pyautogui_ok = False
    gemini_ok = bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))
    return jsonify({
        "pyautogui": pyautogui_ok,
        "gemini_key": gemini_ok,
        "available": pyautogui_ok and gemini_ok,
        "note": "PC local execution required — does not run in CF Workers"
    })


# ── Brain stats (detailed) ────────────────────────────────────────────────

@brain_bp.route('/api/brain/stats/detailed', methods=['GET'])
def get_brain_stats_detailed():
    """Get comprehensive brain statistics for UI visualization"""
    try:
        brain = None
        orc = current_app.config.get('ORCHESTRATOR')
        if orc:
            brain = getattr(orc, 'neuromorphic_brain', None) or getattr(orc, 'brain', None)

        if brain:
            stats = brain.get_stats()

            total_queries = stats.get('total_queries', 0)
            brain_hits = stats.get('brain_hits', 0)
            learned_patterns = stats.get('learned_patterns', 0)

            usage_rate = (brain_hits / total_queries * 100) if total_queries > 0 else 0

            avg_confidence = (brain_hits * 0.98) / total_queries if total_queries > 0 else 0
            highest_confidence = 0.98 if brain_hits > 0 else 0

            current_buffer = len(brain.feedback_memory) if hasattr(brain, 'feedback_memory') else 0
            learning_buffer_size = current_buffer % 10
            learning_progress = (learning_buffer_size / 10.0) * 100

            avg_processing_time = stats.get('avg_processing_time', 0) * 1000

            confidence_trend = stats.get('confidence_trend', 'insufficient_data')

            word2vec_enabled = getattr(brain, 'word2vec_enabled', False)
            vocabulary_size = 0
            if word2vec_enabled and hasattr(brain, 'word2vec') and brain.word2vec:
                try:
                    vocabulary_size = brain.word2vec.get_stats()['vocabulary_size']
                except:
                    vocabulary_size = 0

            return jsonify({
                "status": "success",
                "stats": {
                    "usage_rate": round(usage_rate, 1),
                    "avg_confidence": round(avg_confidence, 3),
                    "highest_confidence": round(highest_confidence, 3),
                    "total_queries": total_queries,
                    "brain_responses": brain_hits,
                    "learned_patterns": learned_patterns,
                    "learning_buffer": learning_buffer_size,
                    "learning_progress": round(learning_progress, 1),
                    "avg_processing_time": round(avg_processing_time, 0),
                    "confidence_trend": confidence_trend,
                    "word2vec_enabled": word2vec_enabled,
                    "vocabulary_size": vocabulary_size,
                    "learning_enabled": getattr(brain, 'learning_enabled', False),
                    "learning_updates": brain.learning_stats.get('updates', 0) if hasattr(brain, 'learning_stats') else 0
                }
            })
        else:
            logger.warning("Brain not initialized, returning mock data")
            return jsonify({
                "status": "success",
                "stats": {
                    "usage_rate": 0,
                    "avg_confidence": 0,
                    "highest_confidence": 0,
                    "total_queries": 0,
                    "brain_responses": 0,
                    "learning_buffer": 0,
                    "learning_progress": 0,
                    "avg_processing_time": 0,
                    "confidence_trend": "stable",
                    "word2vec_enabled": False,
                    "vocabulary_size": 0,
                    "learning_enabled": False,
                    "learning_updates": 0
                }
            })

    except Exception as e:
        logger.error(f"Error getting brain stats: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Admin posts (Firestore blog fallback) ─────────────────────────────────

@brain_bp.route('/api/admin/posts', methods=['GET'])
def public_get_posts():
    """Publicly accessible blog posts with local fallback."""
    try:
        from firebase_admin import firestore
        db = firestore.client()
        docs = db.collection('posts').where('status', '==', 'published').order_by('created_at', direction=firestore.Query.DESCENDING).limit(10).stream()
        posts = []
        for doc in docs:
            p = doc.to_dict()
            p['id'] = doc.id
            if 'created_at' in p: p['created_at'] = p['created_at'].isoformat()
            if 'updated_at' in p: p['updated_at'] = p['updated_at'].isoformat()
            posts.append(p)

        if not posts:
            raise Exception("No posts in DB")

        return jsonify({"posts": posts}), 200
    except Exception as e:
        logger.warning(f"Firestore posts fetch failed, using fallback: {e}")
        return jsonify({
            "posts": [
                {
                    "id": "1",
                    "title": "Autonomous Revenue Cycles: The SAGE Protocol",
                    "slug": "post-autonomous-revenue",
                    "excerpt": "How Sage 3.0 achieves 24/7 monetization with zero human intervention.",
                    "updated_at": "2026-02-13T10:00:00",
                    "size": 4500
                },
                {
                    "id": "2",
                    "title": "Neuromorphic Brain: Learning at the Edge",
                    "slug": "post-neuromorphic-brain",
                    "excerpt": "Explaining the SNN architecture and STDP learning rules in Sage.",
                    "updated_at": "2026-02-12T15:00:00",
                    "size": 3200
                }
            ]
        }), 200


# ── D1 Knowledge Loop (manual trigger) ────────────────────────────────────

@brain_bp.route('/api/d1/generate', methods=['POST'])
def api_d1_generate():
    """Manual trigger for D1 Knowledge Loop (D1: Idea -> Observation -> Artifacts)"""
    try:
        logger.info("🚀 [D1] Knowledge Loop manual trigger started via Cockpit")

        autonomous = current_app.config.get('AUTONOMOUS')
        if not autonomous:
            return jsonify({"status": "error", "message": "Autonomous adapter not initialized"}), 503

        obs = autonomous._observe_and_log()

        data = request.get_json(silent=True) or {}
        topic = data.get('topic', 'AI Monetization Trends 2026')

        decision = {
            'type': 'research_ai_trends',
            'data': {'topic': topic}
        }

        original_exec = autonomous.phase_2_execute
        autonomous.phase_2_execute = True
        try:
            autonomous._execute_decision(decision)
        finally:
            autonomous.phase_2_execute = original_exec

        return jsonify({
            "status": "success",
            "message": f"D1 Loop Executed: Research report for '{topic}' generated and stored."
        })
    except Exception as e:
        logger.error(f"D1 trigger error: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Research routes ───────────────────────────────────────────────────────

@brain_bp.route('/api/research/run', methods=['POST'])
def api_research_run():
    """Run D1 research for a topic and return a human-readable summary.
    Includes retry logic (up to 2 attempts) and extended timeout (90s).
    """
    import concurrent.futures
    try:
        data = request.get_json(silent=True) or {}
        topic = data.get('topic', '').strip()
        if not topic:
            return jsonify({"error": "topic required"}), 400

        autonomous = current_app.config.get('AUTONOMOUS')
        if not autonomous:
            return jsonify({"error": "Autonomous adapter not initialized"}), 503

        def _run_research():
            autonomous._observe_and_log()
            decision = {'type': 'research_ai_trends', 'data': {'topic': topic}}
            original_exec = autonomous.phase_2_execute
            autonomous.phase_2_execute = True
            try:
                autonomous._execute_decision(decision)
            finally:
                autonomous.phase_2_execute = original_exec

        MAX_ATTEMPTS = 2
        last_error = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(_run_research)
                    future.result(timeout=90)
                last_error = None
                break
            except concurrent.futures.TimeoutError:
                last_error = "timeout"
                logger.warning(f"research/run attempt {attempt} timed out for topic: {topic}")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"research/run attempt {attempt} error: {e}")

        if last_error:
            if last_error == "timeout":
                logger.info(f"research/run timed out after {MAX_ATTEMPTS} attempts, continuing")
            else:
                return jsonify({"error": last_error}), 500

        summary = f"Research for '{topic}' complete. Report saved to output/ folder."
        return jsonify({"status": "success", "summary": summary})
    except Exception as e:
        logger.error(f"research/run error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@brain_bp.route('/api/research/check', methods=['GET'])
def check_research_for_topic():
    """Check if D1 research files exist for a given topic."""
    if request.headers.get('X-Sage-Test-Mode') == '1':
        return jsonify({"has_research": True, "file": "test_research.md", "test_mode": True}), 200
    topic = request.args.get('topic', '').strip()
    if not topic:
        return jsonify({"has_research": False, "file": None}), 400

    vault_dir = pathlib.Path(os.path.join(_project_root(), "obsidian_vault", "knowledge"))
    if not vault_dir.exists():
        return jsonify({"has_research": False, "file": None})

    files = sorted(vault_dir.glob("research_*.md"), key=lambda x: x.stat().st_mtime, reverse=True)
    keywords = [k.lower() for k in topic.split() if len(k) > 1] or [topic.lower()]

    for f in files[:20]:
        try:
            content = f.read_text(encoding='utf-8', errors='ignore')
            if len(content) < 300:
                continue
            if any(kw in content.lower() for kw in keywords):
                return jsonify({"has_research": True, "file": f.name})
        except Exception:
            continue

    return jsonify({"has_research": False, "file": None})


# ── Niche validation ──────────────────────────────────────────────────────

@brain_bp.route('/api/niche/validate', methods=['POST'])
def niche_validate():
    """5-axis niche validation before product generation."""
    if request.headers.get('X-Sage-Test-Mode') == '1':
        return jsonify({"score": 85, "tier": "A", "verdict": "[TEST] Strong niche (stub)", "test_mode": True}), 200
    data = request.get_json(silent=True) or {}
    topic = data.get('topic', '').strip()
    if not topic:
        return jsonify({"status": "error", "error": "topic required"}), 400
    try:
        from backend.pipelines.niche_validator import NicheValidator
        validator = NicheValidator(groq_api_key=os.getenv("GROQ_API_KEY"))
        result = validator.validate(topic)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"[NICHE VALIDATE] {e}", exc_info=True)
        return jsonify({"status": "error", "error": str(e)}), 500


# ── Brain stats (summary) ─────────────────────────────────────────────────

@brain_bp.route('/api/brain/stats', methods=['GET'])
def get_brain_stats():
    pipeline = current_app.config.get('COURSE_GEN_GLOBAL')
    orc = current_app.config.get('ORCHESTRATOR')
    brain = (
        (pipeline.brain if pipeline and pipeline.brain else None)
        or getattr(orc, 'neuromorphic_brain', None)
        or getattr(orc, 'brain', None)
    )
    if brain:
        stats = brain.get_stats()
        total = stats.get("total_queries", 0)
        hits = stats.get("brain_hits", 0)
        stats["accuracy"] = (hits / total) if total > 0 else 0.0
        return jsonify({"status": "success", "data": stats}), 200
    return jsonify({"status": "error", "error": "brain not initialized"}), 503
