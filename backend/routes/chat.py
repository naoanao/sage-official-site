"""Chat / Pilot routes — Phase 3 (final) blueprint extraction.

Routes moved from flask_server.py:
  POST /api/chat           → chat_endpoint
  POST /api/pilot/chat     → api_pilot_chat
  POST /api/pilot/generate → api_pilot_generate

Associated helpers: normalize_input, is_topic_obviously_unsafe.
"""
import json
import os
import pathlib
import re
import shutil
from datetime import datetime, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, current_app, g

chat_bp = Blueprint('chat_bp', __name__)


# ── input normalization decorator ────────────────────────────────────────────
def normalize_input(*fields):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            data = request.get_json(silent=True) or {}
            primary_field = fields[0] if fields else 'message'
            value = data.get(primary_field)
            normalized_from = None
            if not value:
                for alt_field in fields[1:]:
                    value = data.get(alt_field)
                    if value:
                        data[primary_field] = value
                        normalized_from = alt_field
                        break
            request._normalized_input_key = normalized_from or primary_field
            request._normalized_data = data
            return f(*args, **kwargs)
        return wrapper
    return decorator


# ── security guard ───────────────────────────────────────────────────────────
def is_topic_obviously_unsafe(topic: str):
    """Early security check for prohibited topics (Entrance Block)"""
    if not topic:
        return False, None
    topic_lower = topic.lower()
    unsafe_patterns = ["bypass", "crack", "hack", "exploit", "gain root", "disable security", "vulnerability"]
    if any(p in topic_lower for p in unsafe_patterns):
        how_to_intent = ["how to", "tutorial", "guide", "step 1", "instruction"]
        if any(intent in topic_lower for intent in how_to_intent):
            return True, "UNSAFE_TOPIC_HOWTO"
        strict_allowlist = ["prevention", "mitigation", "hardening", "threat model", "architecture study"]
        if any(allow in topic_lower for allow in strict_allowlist):
            return False, None
        return True, "UNSAFE_TOPIC_KEYWORD"
    return False, None


# ── helpers ──────────────────────────────────────────────────────────────────
def _pick(data, *keys, default=None):
    for k in keys:
        if k in data and data[k] not in (None, ""):
            return data[k]
    return default


def _to_int(v, default=5):
    try:
        return int(v)
    except Exception:
        return default


# ── POST /api/pilot/chat ────────────────────────────────────────────────────
@chat_bp.route("/api/pilot/chat", methods=["POST"])
def api_pilot_chat():
    orchestrator = current_app.config.get('ORCHESTRATOR')
    memory = current_app.config.get('MEMORY')

    if not orchestrator:
        return jsonify({"status": "error", "message": "Brain offline"}), 503

    try:
        data = request.get_json(silent=True) or {}

        sessionid = _pick(data, "sessionid", "session_id", default="pilotsession")
        usertext  = _pick(data, "usertext", "user_text", "message", "text", default="")
        mode      = _pick(data, "mode", default="free")
        uilang    = _pick(data, "uilang", "ui_lang", default="ja")

        current_app.logger.info(f"DEBUG api_pilot_chat: sessionid={sessionid} usertext='{usertext}'")

        if not usertext:
            return jsonify({"status": "error", "message": "No text provided"}), 400

        from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

        _marketing_kb = ""
        try:
            _kb_path = pathlib.Path(os.path.dirname(__file__)).parent / "sage_knowledge_base" / "MARKETING_GROWL_METHOD.md"
            if _kb_path.exists():
                _marketing_kb = _kb_path.read_text(encoding="utf-8")
        except Exception as _kb_err:
            current_app.logger.warning(f"[KB] Marketing knowledge load failed: {_kb_err}")

        if uilang == "en":
            sysdirective = (
                "You are Sage Pilot — an AI business and marketing strategist. Answer the user's question directly first.\n"
                "You have deep expertise in marketing frameworks: 3C analysis, SWOT, 4P, STP, customer journey, value proposition, PDCA.\n"
                "You know the 10-step 3C research process: LP analysis, Amazon/Rakuten ranking for competitor identification, "
                "review mining (★5 and ★2-3), Meta Ad Library, Google Ads keyword research, industry reports (Yano Research), "
                "government stats (MHLW, MIC), and UGC analysis.\n"
                "When answering marketing questions, apply these frameworks concretely with real data sources.\n"
                "If the user asks to research/search, do it and include sources if possible.\n"
                "Only if the user clearly wants to build/productize something, propose a concrete next step.\n"
                "Do not repeat boilerplate like 'Since no tools were executed...'.\n"
            )
        else:
            sysdirective = (
                "あなたは「Sage Pilot」— AIビジネス＆マーケティングストラテジストです。まずユーザーの質問に正面から答えてください。\n"
                "マーケティングフレームワーク（3C分析・SWOT・4P・STP・カスタマージャーニー・バリュープロポジション・PDCA）の深い専門知識があります。\n"
                "3C分析の10ステップ調査手順（LP分析・Amazon/楽天ランキングで競合特定・★5/★2〜3レビュー分析・"
                "Meta広告ライブラリ・Google広告キーワード調査・矢野経済研究所・厚労省/総務省統計・UGC分析）を熟知しています。\n"
                "マーケティングの質問には必ずこれらのフレームワークと具体的なデータソースを使って回答してください。\n"
                "「調べて／検索／出典」等があれば可能なら調査し, 要点と出典を示してください。\n"
                "「作って／作りたい／商品化したい」等が明確なときだけ, 商品化の次の一手を提案してください。\n"
                "「ツール未実行のため…」の定型文を繰り返さないでください。\n"
            )
        if _marketing_kb:
            sysdirective += f"\n\n[マーケティング知識ベース]\n{_marketing_kb[:3000]}"

        historymsgs = []
        if memory:
            try:
                getter = getattr(memory, "get_short_term", None) or getattr(memory, "get_shortterm", None)
                if getter:
                    try:
                        recent = getter(limit=10, session_id=sessionid)
                    except TypeError:
                        recent = getter(10, session_id=sessionid)
                    for msg in (recent or []):
                        role = msg.get("role")
                        content = msg.get("content", "")
                        if role == "user":
                            historymsgs.append(HumanMessage(content=content))
                        else:
                            historymsgs.append(AIMessage(content=content))
            except Exception:
                pass

        if any(k in usertext for k in ["調べて", "検索", "出典", "ソース", "URL", "source"]):
            try:
                current_app.logger.info(f"[SEARCH] Search hook triggered for: {usertext[:50]}")
                from backend.modules.browser_agent import BrowserAgent
                agent = BrowserAgent()
                sres = None
                if hasattr(agent, 'search_google'):
                    sres_dict = agent.search_google(usertext)
                    if isinstance(sres_dict, dict) and sres_dict.get("status") == "success":
                        results = sres_dict.get("results", [])
                        if results:
                            sres = "\n".join([f"- {r.get('title')}: {r.get('snippet')} ({r.get('link')})" for r in results[:5]])
                        else:
                            sres = "No results found."
                    else:
                        sres = str(sres_dict)
                elif hasattr(agent, 'search'):
                    sres = agent.search(usertext)
                if sres:
                    current_app.logger.info(f"[SUCCESS] Search results obtained ({len(sres)} chars)")
                    historymsgs.append(SystemMessage(content=f"以下の検索結果を参考に, ユーザーの質問に答えてください。検索結果が見つからない場合は, 一般的な知識で答えてください。\n\n[検索結果]\n{sres}"))
            except Exception as e:
                current_app.logger.error(f"[ERROR] Search hook error: {e}")
                pass

        currentmsg = HumanMessage(content=usertext)

        inputdata = {
            "messages": historymsgs + [currentmsg],
            "plan": [],
            "currentstepindex": 0,
            "context": {"sessionid": sessionid},
            "systemdirective": sysdirective,
        }

        result = orchestrator.run(inputdata)

        if isinstance(result, dict):
            airesponse = result.get("final_response") or result.get("output") or str(result)
        else:
            airesponse = str(result)

        if not airesponse:
            airesponse = "SUCCESS Task completed. No text output."

        import re as _re
        _boilerplate = [
            r"(?i)^no tools executed[^\n]*\n?",
            r"(?i)^since no tools (were|have been) executed[^\n]*\n?",
            r"(?i)^no tools (were|have been)? ?(used|executed)[^\n]*\n?",
            r"(?i)^as no tools were (used|executed)[^\n]*\n?",
            r"(?i)^i (didn'?t|did not) (use|execute|run) any tools[^\n]*\n?",
            r"(?i)^(note:|note that )(no tools|tools were not)[^\n]*\n?",
            r"(?i)^tools? (were not|not) (used|executed|called)[^\n]*\n?",
            r"(?i)^there (are|were) no tools (to |)(use|execute|call)[^\n]*\n?",
        ]
        for _pat in _boilerplate:
            airesponse = _re.sub(_pat, '', airesponse).strip()
        if not airesponse:
            airesponse = "ご質問をありがとうございます。詳しくお聞かせください。" if uilang == "ja" else "Got it — could you tell me more about what you'd like to create?"

        if memory:
            try:
                saver = getattr(memory, "save_short_term", None) or getattr(memory, "saveshortterm", None)
                if saver:
                    try:
                        saver("user", usertext, session_id=sessionid)
                        saver("assistant", airesponse, session_id=sessionid)
                    except TypeError:
                        saver("user", usertext, sessionid)
                        saver("assistant", airesponse, sessionid)
            except Exception:
                pass

        suggestedactions = []
        lower = airesponse.lower()
        if mode == "free" and any(k in usertext for k in ["作って", "作りたい", "商品化", "build", "create"]):
            suggestedactions.append({
                "id": "startpilot",
                "label": "Start Productization",
                "payload": {"topic": usertext[:50]}
            })

        return jsonify({
            "status": "success",
            "assistant_text": airesponse,
            "suggested_actions": suggestedactions,
            "brain_updated": True
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500


# ── POST /api/pilot/generate ─────────────────────────────────────────────────
@chat_bp.route('/api/pilot/generate', methods=['POST'])
def api_pilot_generate():
    pipeline_fn = current_app.config.get('GET_OR_INIT_PIPELINE')
    pipeline = pipeline_fn() if pipeline_fn else None

    if not pipeline:
        current_app.logger.info("pilot_generate_block PIPELINE_WARMING_UP")
        return jsonify({
            "status": "error",
            "message": "Course pipeline warming up",
            "reason_code": "PIPELINE_WARMING_UP",
            "request_id": getattr(g, 'request_id', 'unknown')
        }), 503, {"Retry-After": "3"}

    data = request.get_json(silent=True) or {}
    current_app.logger.info(f"pilot_generate_start topic={data.get('topic') if data else 'none'}")

    try:
        topic = _pick(data, 'topic', default=None)
        customer_request = _pick(data, 'customer_request', 'customerrequest', default='')
        quality_tier = _pick(data, 'quality_tier', 'qualitytier', default=None)
        num_sections = _to_int(_pick(data, 'num_sections', 'numsections', default=5), default=5)
        use_scholar = bool(_pick(data, 'use_scholar', 'usescholar', 'useScholar', default=False))

        if not topic:
            return jsonify({
                "status": "error",
                "message": "Topic is required",
                "request_id": getattr(g, 'request_id', 'unknown')
            }), 400

        is_unsafe, reason = is_topic_obviously_unsafe(topic)
        if is_unsafe:
            current_app.logger.warning(f"[SEC] Early block for unsafe topic: '{topic}' | Reason: {reason} | Action: 403 Forbidden")
            current_app.logger.info(f"pilot_generate_block reason={reason} topic={topic}")
            return jsonify({
                "status": "error",
                "message": f"Security Violation: Topic contains prohibited patterns ({reason}).",
                "blocked_by_security": True,
                "reason_code": reason,
                "request_id": getattr(g, 'request_id', 'unknown')
            }), 403

        if use_scholar:
            try:
                sage_scholar = current_app.config.get('SAGE_SCHOLAR')
                if sage_scholar:
                    query = topic or customer_request
                    current_app.logger.info(f"[SCHOLAR] Scholar Search for Generation: {query}")
                    results = sage_scholar.search_papers(query)
                    blob = "\n".join([
                        f"- {r.get('title','')}\n  {r.get('url','')}\n  {r.get('summary','')[:200]}..."
                        for r in (results or [])[:5]
                    ])
                    customer_request = (customer_request or "") + "\n\n[Scholar Sources]\n" + blob
                else:
                    customer_request = (customer_request or "") + "\n\n[Scholar] Unavailable (module not initialized)."
            except Exception as sc_err:
                current_app.logger.error(f"Scholar search failed during generation: {sc_err}")
                customer_request = (customer_request or "") + f"\n\n[Scholar] Error: {str(sc_err)[:100]}"

        current_app.logger.info(f"[PILOT] Pilot Generating Course: {topic} (Tier: {quality_tier})")

        result = pipeline.generate_course(
            topic=topic,
            customer_request=customer_request,
            quality_tier=quality_tier,
            num_sections=num_sections,
            request_id=getattr(g, 'request_id', 'unknown')
        )

        if result.get('status') == 'success':
            result['request_id'] = getattr(g, 'request_id', 'unknown')
            current_app.logger.info(f"pilot_generate_success topic={topic} tier={result.get('tier')}")
            return jsonify(result), 200
        else:
            reason = "GENERATION_FAILED"
            if result.get('blocked_by_security'):
                reason = "SECURITY_BLOCK_POST_GEN"
            if not result or not isinstance(result, dict):
                result = {"status": "error", "message": "Pipeline returned invalid result object"}
            result['request_id'] = getattr(g, 'request_id', 'unknown')
            current_app.logger.info(f"pilot_generate_failed reason={reason}")
            return jsonify(result), 400

    except Exception as e:
        current_app.logger.error(f"[ERROR] API generate failure: {e}", exc_info=True)
        rid = getattr(g, 'request_id', 'unknown')
        current_app.logger.info(f"pilot_generate_exception error={str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "request_id": rid
        }), 500


# ── POST /api/chat ──────────────────────────────────────────────────────────
@chat_bp.route('/api/chat', methods=['POST'])
@normalize_input('message', 'text')
def chat_endpoint():
    orchestrator = current_app.config.get('ORCHESTRATOR')
    memory = current_app.config.get('MEMORY')

    data = getattr(request, '_normalized_data', request.get_json(silent=True) or {})
    mode = data.get('mode')
    user_message = data.get('message', '')
    session_id = data.get('session_id') or request.headers.get('X-Session-ID') or "global_session"
    user_id = data.get('user_id', 'anon')

    if request.headers.get('X-Sage-Test-Mode') == '1':
        return jsonify({"reply": "[TEST] Stub response from Sage.", "phase": 1, "test_mode": True}), 200

    if not user_message:
        return jsonify({"error": "message または text が必要です (message or text is required)"}), 400

    if mode == "file_organize_e2e":
        project_root = pathlib.Path(__file__).resolve().parent.parent
        chaos_in = project_root / "sandbox" / "chaos_in"
        chaos_out = project_root / "sandbox" / "chaos_out"
        chaos_out.mkdir(parents=True, exist_ok=True)
        date_re = re.compile(r"(20\d{2}-\d{2}-\d{2})")
        moved = []
        skipped = []
        errors = []

        for src in chaos_in.rglob("*"):
            if not src.is_file():
                continue
            name = src.name
            m = date_re.search(name)
            date_part = m.group(1) if m else "undated"
            ext = src.suffix.lower().lstrip(".")
            if ext in {"jpg", "jpeg", "png", "gif", "webp"}:
                category = "images"
            elif ext in {"pdf", "txt", "md", "csv", "docx", "xlsx", "pptx", "log"}:
                category = "docs"
            else:
                category = "other"
            dst_dir = chaos_out / category / date_part
            dst_dir.mkdir(parents=True, exist_ok=True)
            dst = dst_dir / src.name
            if dst.exists():
                skipped.append({"src": str(src), "dst": str(dst), "reason": "destination exists"})
                continue
            try:
                shutil.move(str(src), str(dst))
                moved.append({"src": str(src), "dst": str(dst), "category": category, "date": date_part})
            except Exception as e:
                errors.append({"src": str(src), "dst": str(dst), "error": str(e)})

        return jsonify({
            "status": "success" if not errors else "partial",
            "category": "e2e",
            "mode": mode,
            "moved_count": len(moved),
            "skipped_count": len(skipped),
            "error_count": len(errors),
            "moved": moved[:50],
            "skipped": skipped[:50],
            "errors": errors[:20],
        }), 200

    if orchestrator is None:
        init_brain_fn = current_app.config.get('INIT_BRAIN')
        if init_brain_fn:
            init_brain_fn()
        orchestrator = current_app.config.get('ORCHESTRATOR')
        memory = current_app.config.get('MEMORY')
        if orchestrator is None:
            return jsonify({"response": "[WARNING] Error: Sage 3.0 Brain is offline. Check backend logs."})

    try:
        history_msgs = []
        if memory:
            try:
                recent_history = memory.get_short_term(limit=10, session_id=session_id)
                from langchain_core.messages import HumanMessage, AIMessage
                for msg in recent_history:
                    if msg['role'] == 'user':
                        history_msgs.append(HumanMessage(content=msg['content']))
                    else:
                        history_msgs.append(AIMessage(content=msg['content']))
            except Exception as e:
                current_app.logger.error(f"Failed to load history: {e}")

        input_data = {
            "messages": history_msgs + [HumanMessage(content=user_message)],
            "plan": [],
            "current_step_index": 0,
            "context": {"user_id": user_id, "mode": mode, "session_id": session_id}
        }
        current_app.logger.info(f"[IN] Input to Orchestrator: {user_message}")

        from langchain_core.messages import HumanMessage
        current_msg = HumanMessage(content=user_message)
        input_data = {
            "messages": history_msgs + [current_msg],
            "plan": [],
            "current_step_index": 0,
            "context": {"session_id": session_id}
        }

        result = orchestrator.run(input_data)

        ai_response = result.get("final_response", "") if isinstance(result, dict) else str(result)

        if not ai_response:
            ai_response = "[SUCCESS] Task completed (No text output)."

        _ORCH_FAIL_MARKERS = [
            "Task executed but LLM report failed",
            "Sage Offline Mode. Actions taken:",
            "Raw Output:\nNo tools executed",
            "System Error during reporting:",
        ]
        if any(m in ai_response for m in _ORCH_FAIL_MARKERS):
            current_app.logger.warning(f"[FALLBACK] Orchestrator returned error response, trying multi-tier LLM fallback")
            _lang = "ja" if any(ord(c) > 0x3000 for c in user_message) else "en"
            _sys_prompt = (
                "あなたはSage Pilotです。ユーザーのビジネス・コンテンツの質問に具体的かつ丁寧に日本語で答えてください。"
                "Sageの対応機能: ブログ記事の自動生成・公開、Bluesky/Instagramへの自動投稿、"
                "市場トレンドリサーチ、デジタルコース制作、Gumroad/Stripeによる販売自動化。"
                "対応していない機能: Twitter/X、LinkedIn、Facebook、TikTokへの投稿。\n"
                "マーケティング専門知識: 3C分析（10ステップ調査手順: LP・Amazon/楽天ランキング・競合レビュー・Meta広告ライブラリ・Google広告・矢野経済・厚労省統計・UGC分析）、"
                "SWOT・4P・STP・カスタマージャーニー・バリュープロポジション・PDCAサイクルを熟知しています。"
                "マーケ質問には必ずフレームワークと具体的なデータソースを使って回答してください。"
                if _lang == "ja" else
                "You are Sage Pilot, the AI assistant for the Sage AI platform. Answer questions helpfully and concisely.\n"
                "Sage's actual capabilities: auto-generate & publish blog posts, auto-post to Bluesky and Instagram, "
                "market trend research, digital course production, sales automation via Gumroad/Stripe.\n"
                "Platforms NOT supported: Twitter/X, LinkedIn, Facebook, TikTok.\n"
                "Marketing expertise: You know the 10-step 3C analysis research process (LP analysis, Amazon/Rakuten ranking, "
                "competitor review mining ★5/★2-3, Meta Ad Library, Google Ads, Yano Research, MHLW stats, UGC). "
                "You also know SWOT, 4P, STP, customer journey, value proposition, PDCA. "
                "Apply these frameworks with concrete data sources when answering marketing questions.\n"
                "Do not claim Sage supports platforms it does not actually support."
            )
            _fallback_result = ""

            try:
                from langchain_core.messages import SystemMessage as _SysMsg, HumanMessage as _HumMsg
                _fallback_msgs = [_SysMsg(content=_sys_prompt)] + history_msgs + [_HumMsg(content=user_message)]
                _fallback_res = orchestrator.llm.invoke(_fallback_msgs)
                _fallback_result = _fallback_res.content if hasattr(_fallback_res, 'content') else str(_fallback_res)
                if _fallback_result:
                    current_app.logger.info(f"[FALLBACK-T1] orchestrator.llm succeeded: {_fallback_result[:60]}")
            except Exception as _fe1:
                current_app.logger.warning(f"[FALLBACK-T1] orchestrator.llm failed: {_fe1}")

            if not _fallback_result:
                try:
                    _cg = current_app.config.get('COURSE_GEN_GLOBAL')
                    if _cg:
                        _fallback_result = _cg._invoke_llm(_full_prompt[:4000])
                        if _fallback_result:
                            current_app.logger.info(f"[FALLBACK-T2] course_gen._invoke_llm succeeded")
                except Exception as _fe2:
                    current_app.logger.warning(f"[FALLBACK-T2] course_gen._invoke_llm failed: {_fe2}")

            if not _fallback_result:
                try:
                    import os as _os3
                    from groq import Groq as _Groq3
                    _g3 = _Groq3(api_key=_os3.getenv("GROQ_API_KEY"))
                    _r3 = _g3.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[{"role": "system", "content": _sys_prompt},
                                  {"role": "user", "content": user_message}],
                        max_tokens=800,
                        timeout=20,
                    )
                    _fallback_result = _r3.choices[0].message.content.strip()
                    if _fallback_result:
                        current_app.logger.info(f"[FALLBACK-T3] Direct Groq REST succeeded")
                except Exception as _fe3:
                    current_app.logger.warning(f"[FALLBACK-T3] Direct Groq REST failed: {_fe3}")

            if _fallback_result:
                ai_response = _fallback_result
            else:
                ai_response = (
                    "AIが現在混雑しています。少し待ってから再度お試しください。"
                    if _lang == "ja" else
                    "Sage is busy right now. Please try again in a moment."
                )

        import re as _re2
        _bp = [
            r"(?i)^no tools executed[^\n]*\n?",
            r"(?i)^since no tools (were|have been) executed[^\n]*\n?",
            r"(?i)^no tools (were|have been)? ?(used|executed)[^\n]*\n?",
            r"(?i)^as no tools were (used|executed)[^\n]*\n?",
            r"(?i)^i (didn'?t|did not) (use|execute|run) any tools[^\n]*\n?",
            r"(?i)^(note:|note that )(no tools|tools were not)[^\n]*\n?",
            r"(?i)^tools? (were not|not) (used|executed|called)[^\n]*\n?",
            r"(?i)^there (are|were) no tools (to |)(use|execute|call)[^\n]*\n?",
        ]
        for _p in _bp:
            ai_response = _re2.sub(_p, '', ai_response).strip()
        ai_response = _re2.sub(
            r"\b\w+:\s*\{['\"]status['\"]:\s*['\"](?:success|error)['\"][^}]*\}",
            '',
            ai_response
        ).strip()
        ai_response = _re2.sub(r"Raw Output:\n.*", '', ai_response, flags=_re2.DOTALL).strip()
        if not ai_response:
            _lang_fb = "ja" if any(ord(c) > 0x3000 for c in user_message) else "en"
            ai_response = (
                "ご質問をありがとうございます。もう少し詳しくお聞かせください。"
                if _lang_fb == "ja" else
                "Got it — could you share a bit more about what you'd like to create?"
            )

        if memory:
            memory.save_short_term('user', user_message, session_id=session_id)
            memory.save_short_term('assistant', ai_response, session_id=session_id)

        current_app.logger.info(f"[OUT] Output from Orchestrator: {ai_response[:100]}...")

        response_data = {
            "status": "success",
            "category": "chat",
            "response": ai_response
        }

        if isinstance(result, dict) and 'context' in result:
            ctx = result['context']
            safety_meta = ctx.get('safety_meta')
            if safety_meta:
                response_data["safety_meta"] = safety_meta
            if ctx.get("llm_bypass_used"):
                response_data["llm_bypass_used"] = True
                response_data["external_http_calls"] = ctx.get("external_http_calls", 0)

        normalized_key = getattr(request, '_normalized_input_key', None)
        if normalized_key:
            response_data["normalized_input_key"] = normalized_key

        return jsonify(response_data)

    except Exception as e:
        current_app.logger.error(f"[ERROR] Execution Error: {e}")
        return jsonify({
            "status": "error",
            "error": f"Sage 3.0 Error: {str(e)}",
            "response": f"[WARNING] Sage 3.0 Error: {str(e)}"
        }), 500
