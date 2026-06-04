import json
import logging
import os
from flask import Blueprint, jsonify, request, current_app

from backend.utils.auth import apply_public_strategy

productize_bp = Blueprint("productize", __name__)
logger = logging.getLogger(__name__)


@productize_bp.before_request
def productize_auth():
    apply_public_strategy()


@productize_bp.route('/api/productize', methods=['POST'])
def productize_endpoint():
    consultative_gen = current_app.config.get('CONSULTATIVE_GEN')
    memory = current_app.config.get('MEMORY')

    data = request.get_json(silent=True) or {}
    topic = data.get('topic', '').strip()
    market = data.get('market', 'US')
    price = data.get('price', '$29')
    session_id = data.get('session_id') or request.headers.get('X-Session-ID') or "global_session"

    if request.headers.get('X-Sage-Test-Mode') == '1':
        return jsonify({"status": "ok", "product": {"title": f"[TEST] {topic} Course", "sections": [], "score": 85}, "test_mode": True}), 200

    if topic:
        prompt = (
            f"You are a digital product strategist. Create a concise product plan for:\n"
            f"Topic: {topic}\nMarket: {market}\nPrice: {price}\n\n"
            f"Output: product name, 3-bullet value proposition, target audience, and a Gumroad description (150 words)."
        )
        plan_text = None

        try:
            import os as _os
            from groq import Groq as _Groq
            _groq = _Groq(api_key=_os.getenv("GROQ_API_KEY"))
            resp = _groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
            )
            plan_text = resp.choices[0].message.content.strip()
            logger.info(f"[PRODUCTIZE] Plan generated via Groq for: {topic}")
        except Exception as groq_err:
            logger.warning(f"[PRODUCTIZE] Groq failed ({groq_err}), trying course_gen LLM...")

        if not plan_text:
            try:
                _cg = current_app.config.get('COURSE_GEN_GLOBAL')
                if _cg:
                    plan_text = _cg._invoke_llm(prompt)
                    if plan_text:
                        logger.info(f"[PRODUCTIZE] Plan generated via course_gen LLM for: {topic}")
            except Exception as llm_err:
                logger.warning(f"[PRODUCTIZE] course_gen LLM failed ({llm_err}), using stub plan")

        if not plan_text:
            plan_text = f"Product plan for: {topic}\n\n\u2022 Comprehensive guide covering key concepts\n\u2022 Step-by-step actionable content\n\u2022 Ready for {market} market at {price}"
            logger.info(f"[PRODUCTIZE] Using stub plan for: {topic}")

        return jsonify({"status": "ok", "topic": topic, "plan": plan_text}), 200

    if not consultative_gen:
        return jsonify({"error": "Consultative Generator not initialized"}), 500
    if not memory:
        return jsonify({"error": "Memory system not active"}), 500
    try:
        history = memory.get_short_term(limit=20, session_id=session_id)
        if not history:
            return jsonify({"error": "No topic or chat history provided."}), 400
        result = consultative_gen.generate_product(history)
        if "error" in result:
            return jsonify({"error": result["error"]}), 500
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"[PRODUCTIZE] Error: {e}")
        return jsonify({"error": str(e)}), 500


@productize_bp.route('/api/productize/execute', methods=['POST'])
def productize_execute_endpoint():
    course_gen_ref = current_app.config.get('COURSE_GEN_GLOBAL')
    orchestrator_ref = current_app.config.get('ORCHESTRATOR')

    data = request.get_json(silent=True) or {}
    product_type = data.get('type')
    topic = data.get('topic')
    plan = data.get('plan')
    language = data.get('language', 'auto')

    if not topic or not product_type:
        return jsonify({"error": "Topic and Type are required"}), 400

    try:
        if product_type == 'COURSE':
            if not course_gen_ref:
                return jsonify({"error": "Course Production Pipeline not initialized"}), 500

            logger.info(f"[SCHOLAR] Production Started: COURSE for {topic} (lang={language})")
            result = course_gen_ref.generate_course(topic=topic, language=language)

            try:
                from backend.integrations.whop_publisher import create_and_publish, build_sns_caption
                price_usd = float(data.get('price_usd', 29.99))
                course_title = result.get('title') or topic
                course_desc = result.get('description') or result.get('sales_page', '')[:800] or f'A comprehensive course on {topic}'
                whop_result = create_and_publish(course_title, course_desc, price_usd=price_usd)
                result['whop'] = whop_result
                if whop_result.get('status') in ('success', 'dry_run'):
                    result['whop_captions'] = build_sns_caption(
                        course_title,
                        price_usd,
                        whop_result.get('product_url', ''),
                        whop_result.get('checkout_url', ''),
                    )
                logger.info(f"[WHOP] Publish result: {whop_result.get('status')} {whop_result.get('product_url', '')}")
            except Exception as whop_err:
                logger.warning(f"[WHOP] Auto-publish skipped: {whop_err}")
                result['whop'] = {'status': 'skipped', 'message': str(whop_err)}

            return jsonify(result), 200

        elif product_type == 'ARTICLE':
            logger.info(f"[CONTENT] Production Started: ARTICLE for {topic}")

            prompt = f"Write a comprehensive, SEO-optimized blog article about '{topic}'. Use high-value information and professional tone. Output in Markdown."
            res = orchestrator_ref.llm.invoke(prompt)
            content = res.content if hasattr(res, 'content') else str(res)

            from backend.wordpress_automation import post_to_wordpress
            wp_res = post_to_wordpress(topic, content)

            return jsonify({
                "status": "success",
                "topic": topic,
                "content": content,
                "wordpress": wp_res
            }), 200

        else:
            return jsonify({"error": f"Unsupported product type: {product_type}"}), 400

    except Exception as e:
        logger.error(f"[EXECUTE_PRODUCTION] Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@productize_bp.route('/api/productize/rewrite', methods=['POST'])
def productize_rewrite():
    _TONE_PROMPTS_EN = current_app.config.get('TONE_PROMPTS_EN', {})
    _TONE_PROMPTS_JA = current_app.config.get('TONE_PROMPTS_JA', {})
    IDENTITY = current_app.config.get('IDENTITY', {})
    get_or_init_pipeline = current_app.config.get('GET_OR_INIT_PIPELINE')

    data = request.get_json(silent=True) or {}
    content = data.get('content', '').strip()
    instruction = data.get('instruction', '').strip()
    tone_preset = data.get('tone_preset', '').strip()
    language = data.get('language', 'en')

    if request.headers.get('X-Sage-Test-Mode') == '1':
        return jsonify({"rewritten": "[TEST] Stub rewritten content.", "test_mode": True}), 200

    if tone_preset:
        if language == 'en' and tone_preset in _TONE_PROMPTS_EN:
            instruction = _TONE_PROMPTS_EN[tone_preset]
        elif language == 'ja' and tone_preset in _TONE_PROMPTS_JA:
            instruction = _TONE_PROMPTS_JA[tone_preset]

    if not content or not instruction:
        return jsonify({"error": "content and instruction are required"}), 400

    compression_keywords = ['\u8981\u7d04', '\u77ed\u304f', '\u534a\u5206', '\u7c21\u6d04', '\u307e\u3068\u3081', 'summarize', 'shorten', 'brief', 'condense', 'shorter', 'compress']
    is_compression = any(kw in instruction.lower() for kw in compression_keywords)

    identity_context = ""
    if IDENTITY:
        role = IDENTITY.get('role', 'Expert')
        niche = IDENTITY.get('niche', 'Digital Product Creation')
        tone = IDENTITY.get('tone', 'Professional')
        identity_context = f"\n[AI IDENTITY]\nRole: {role}\nNiche: {niche}\nTone: {tone}\n\nYou are writing as this persona. Ensure the content reflects this brand voice."

    if language == 'ja':
        preservation_rule = (
            "- \u8981\u70b9\u306f\u4fdd\u3061\u306a\u304c\u3089\u6307\u793a\u306b\u5f93\u3063\u3066\u5727\u7e2e\u30fb\u7c21\u6d04\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002\n" if is_compression
            else "- \u5143\u306e\u60c5\u5831\u30fb\u4e8b\u5b9f\u306f\u4fdd\u6301\u3057\u3066\u304f\u3060\u3055\u3044\uff08\u91cd\u8981\u306a\u5185\u5bb9\u3092\u524a\u9664\u3057\u306a\u3044\u3053\u3068\uff09\n"
        )
        prompt = (
            f"\u4ee5\u4e0b\u306e\u30b3\u30f3\u30c6\u30f3\u30c4\u3092\u3001\u6307\u793a\u306b\u5f93\u3063\u3066\u66f8\u304d\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002\n\n"
            f"\u3010\u6307\u793a\u3011{instruction}\n\n"
            f"{identity_context}\n\n"
            f"\u3010\u5143\u306e\u30b3\u30f3\u30c6\u30f3\u30c4\u3011\n{content}\n\n"
            f"\u3010\u51fa\u529b\u30eb\u30fc\u30eb\u3011\n"
            f"{preservation_rule}"
            f"- \u6307\u793a\u306e\u53e3\u8abf\u30fb\u5f62\u5f0f\u306b\u5408\u308f\u305b\u3066\u66f8\u304d\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\n"
            f"- \u65e5\u672c\u8a9e\u3067\u66f8\u3044\u3066\u304f\u3060\u3055\u3044\u3002\n"
            f"- \u524d\u7f6e\u304d\u3084\u8aac\u660e\u306f\u4e0d\u8981\u3002\u66f8\u304d\u76f4\u3057\u305f\u672c\u6587\u306e\u307f\u3092\u51fa\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
        )
    else:
        preservation_rule = (
            "- Compress to the key points while following the instruction.\n" if is_compression
            else "- Preserve the original facts and information (do not delete important content).\n"
        )
        prompt = (
            f"Rewrite the following content according to the instruction.\n\n"
            f"[INSTRUCTION] {instruction}\n\n"
            f"{identity_context}\n\n"
            f"[ORIGINAL CONTENT]\n{content}\n\n"
            f"[OUTPUT RULES]\n"
            f"{preservation_rule}"
            f"- Rewrite in the tone/format requested by the instruction.\n"
            f"- Write in English.\n"
            f"- Output only the rewritten content \u2014 no preamble, no explanation."
        )

    pipeline = get_or_init_pipeline() if get_or_init_pipeline else None
    if pipeline:
        try:
            rewritten = pipeline._invoke_llm(prompt)
            if rewritten and rewritten.strip():
                return jsonify({"status": "success", "rewritten": rewritten.strip()}), 200
        except Exception as e:
            logger.warning(f"[REWRITE] pipeline._invoke_llm failed: {e}")

    try:
        import os as _os
        from groq import Groq as _Groq
        _groq = _Groq(api_key=_os.getenv("GROQ_API_KEY"))
        resp = _groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
        )
        rewritten = resp.choices[0].message.content.strip()
        return jsonify({"status": "success", "rewritten": rewritten}), 200
    except Exception as e:
        logger.error(f"[REWRITE] All LLMs failed: {e}")
        return jsonify({"error": str(e)}), 500


@productize_bp.route('/api/productize/regenerate_images', methods=['POST'])
def productize_regenerate_images():
    course_gen_global = current_app.config.get('COURSE_GEN_GLOBAL')

    data = request.get_json(silent=True) or {}
    sections = data.get('sections', [])
    custom_instruction = data.get('custom_instruction', '').strip()
    topic = data.get('topic', '')

    if not sections:
        return jsonify({"error": "sections required"}), 400

    try:
        from backend.integrations.image_generation import image_gen_enhanced

        image_style = None
        style_applied = None
        if course_gen_global and custom_instruction:
            style_prompt = (
                f"Generate a concise image style description (max 30 words) for this course.\n"
                f"Topic: {topic}\n"
                f"User instruction: {custom_instruction}\n\n"
                f"Output ONLY image style keywords, e.g.: "
                f"\"modern office, AI technology, blue tones, professional\"\n"
                f"No explanations, no punctuation other than commas."
            )
            try:
                raw = course_gen_global._invoke_llm(style_prompt).strip()
                image_style = raw.strip('`"\' \n').split('\n')[0][:120]
                style_applied = image_style
                logger.info(f"[REGEN_IMG] LLM style: {image_style}")
            except Exception as _se:
                logger.warning(f"[REGEN_IMG] LLM style failed, using raw instruction: {_se}")

        base_style = image_style or custom_instruction or f"{topic} professional course illustration"

        topic_kw = course_gen_global._get_topic_visual_keywords(topic) if course_gen_global else None

        images = {}
        for idx, section in enumerate(sections):
            title = section.get('title', '')
            if course_gen_global and hasattr(course_gen_global, '_generate_image_prompt'):
                base_prompt = course_gen_global._generate_image_prompt(title, topic)
                prompt = f"{base_prompt}, {base_style}" if base_style else base_prompt
            else:
                prompt = f"{base_style}, photorealistic, high quality, 16:9" if base_style else f"{title}, photorealistic, high quality, 16:9"
            try:
                url = image_gen_enhanced.generate_social_media_image(prompt, platform="twitter", topic_keywords=topic_kw, section_index=idx)
                images[title] = {"type": "generated", "url": url, "prompt": prompt}
                logger.info(f"[REGEN_IMG] {title[:40]} \u2192 {url[:60] if url else 'None'}")
            except Exception as e:
                logger.warning(f"[REGEN_IMG] Failed for '{title}': {e}")
                images[title] = {"type": "prompt_only", "prompt": prompt}

        return jsonify({"status": "success", "images": images, "style_applied": style_applied}), 200
    except Exception as e:
        logger.error(f"[REGEN_IMG] Error: {e}")
        return jsonify({"error": str(e)}), 500


@productize_bp.route('/api/productize/finalize', methods=['POST'])
def productize_finalize():
    content_mgr = current_app.config.get('CONTENT_MGR')

    if request.headers.get('X-Sage-Test-Mode') == '1':
        return jsonify({"status": "ok", "published": True, "test_mode": True}), 200

    import pathlib
    data = request.get_json(silent=True) or {}
    topic = data.get('topic', 'Untitled')
    sections = data.get('sections', [])
    sales_page = data.get('sales_page', '')
    original_note = data.get('obsidian_note', '')

    if not sections:
        return jsonify({"error": "sections required"}), 400

    from datetime import datetime
    ts = datetime.now().strftime('%Y-%m-%d %H:%M')

    lines = [f"# {topic} - Final Edition\n", f"**Finalized**: {ts}\n", ""]
    lines.append("## \U0001f4cb Course Outline\n")
    for i, s in enumerate(sections, 1):
        lines.append(f"{i}. {s.get('title', '')}")
    lines.append("\n---\n")

    for i, s in enumerate(sections, 1):
        lines.append(f"## {i}. {s.get('title', '')}\n")
        lines.append(s.get('content', ''))
        lines.append("\n---\n")

    if sales_page:
        lines.append("## \U0001f4b0 Sales Page\n")
        lines.append(sales_page)
        lines.append("\n")

    final_md = "\n".join(lines)

    try:
        vault_dir = pathlib.Path("obsidian_vault/knowledge")
        vault_dir.mkdir(parents=True, exist_ok=True)
        if original_note:
            orig = pathlib.Path(original_note)
            save_path = orig if orig.exists() else vault_dir / orig.name
        else:
            import time
            save_path = vault_dir / f"course_{int(time.time())}_final.md"

        save_path.write_text(final_md, encoding='utf-8')
        logger.info(f"[FINALIZE] Saved edited course: {save_path}")

        if content_mgr:
            try:
                content_mgr.save_content(
                    content_type='course',
                    title=topic,
                    body=final_md,
                    metadata={"topic": topic, "sections": len(sections), "obsidian_path": str(save_path)}
                )
                logger.info(f"[FINALIZE] Registered in Content Library: {topic}")
            except Exception as ce:
                logger.warning(f"[FINALIZE] Content Library registration failed (non-fatal): {ce}")

        return jsonify({"status": "success", "saved_path": str(save_path)}), 200
    except Exception as e:
        logger.error(f"[FINALIZE] Save error: {e}")
        return jsonify({"error": str(e)}), 500


@productize_bp.route('/api/productize/update-whop', methods=['POST'])
def productize_update_whop():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id", "").strip()
    topic = data.get("topic", "").strip()
    title = data.get("title", "").strip() or None
    description = data.get("description", "").strip() or None

    if not product_id and not topic:
        return jsonify({"error": "product_id or topic required"}), 400

    if not product_id and topic:
        from backend.integrations.whop_publisher import registry_find_by_topic
        entry = registry_find_by_topic(topic)
        if entry:
            product_id = entry.get("product_id", "")

    if not product_id:
        logger.info(f"[UPDATE-WHOP] No product_id found for topic={topic!r} \u2014 skipping")
        return jsonify({"status": "skipped", "reason": "product not in registry"}), 200

    try:
        from backend.integrations.whop_publisher import update_product
        result = update_product(product_id, title=title, description=description)
        logger.info(f"[UPDATE-WHOP] Updated {product_id}: {result}")
        return jsonify({"status": "ok", "product_id": product_id, "whop_result": result}), 200
    except Exception as e:
        logger.warning(f"[UPDATE-WHOP] Failed: {e}")
        return jsonify({"status": "skipped", "reason": str(e)}), 200


@productize_bp.route('/api/monetization/approve', methods=['POST'])
def approve_warn_product():
    if request.remote_addr not in ['127.0.0.1', 'localhost', '::1']:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    topic = data.get("topic")
    if not topic:
        return jsonify({"error": "missing topic"}), 400

    course_gen_global = current_app.config.get('COURSE_GEN_GLOBAL')
    MonetizationMeasure = current_app.config.get('MONETIZATION_MEASURE')

    pipeline = course_gen_global
    if pipeline and hasattr(pipeline, 'brain') and pipeline.brain:
        pipeline.brain.provide_feedback(query=topic, correct_response=f"[APPROVED] {topic}", was_helpful=True)
    if MonetizationMeasure:
        MonetizationMeasure.log_event("human_approved", {"topic": topic})
    return jsonify({"status": "approved"}), 200
