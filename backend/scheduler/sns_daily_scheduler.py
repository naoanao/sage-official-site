import os
import json
import logging
import random
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from backend.data.jobs_store import append as _jobs_append

load_dotenv('.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SNS_Daily_Scheduler")


def _numbers_rule(allowed: list | None, retry: bool) -> str:
    """材料に在る数字だけを許すルール文をプロンプトに足す。

    ⚠️ この文は `sns_number_guard` と**同じ制約を人間の言葉で言い直したもの**。
    書いてあるから守られるのではなく、guard が落とすから守られる。
    ここは「1回目で通る確率を上げる」ためだけにある。
    """
    if allowed is None:
        return ""
    if not allowed:
        return "- This item has no verified figures. Do NOT write any number at all.\n"
    listed = ", ".join(str(a) for a in allowed)
    rule = (
        f"- The ONLY numbers you may write are: {listed}. "
        "Every one of them is a measured fact from my own data.\n"
        "- Do not add, round, combine, or derive any other number. No percentages you calculated yourself.\n"
    )
    if retry:
        rule += (
            "- Your previous attempt contained a number that does not exist in my data. "
            "Rewrite it. If you are unsure, write the post with fewer numbers.\n"
        )
    return rule


class SNSDailyScheduler:
    """
    Sage SNS CEO: Automates Instagram & Bluesky posts from the Notion Content Pool.
    Target: Global Market (JST Noon / EST Morning & Night).
    Applies 'Wise Person' Strategy and 'No Lies' Verification.
    """

    def __init__(self):
        from backend.integrations.bluesky_agent import BlueskyAgent

        try:
            from backend.modules.notion_content_pool import NotionContentPool
            self.notion_pool = NotionContentPool()
        except ImportError:
            self.notion_pool = None
            logger.warning("[SNS] NotionContentPool not available; using local fallback only.")

        try:
            from backend.integrations.instagram_integration import InstagramBot
            self.instagram = InstagramBot()
        except ImportError:
            self.instagram = None
            logger.warning("[SNS] InstagramBot not available; Instagram posting disabled.")

        self.bluesky = BlueskyAgent()

        self.ig_strategy = self._load_strategy("backend/cognitive/instagram_strategy.md")
        self.bs_strategy = self._load_strategy("backend/cognitive/bluesky_strategy.md")

        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        self.quality_gate = os.getenv("SAGE_QUALITY_GATE_STRICT", "True").lower() == "true"
        self.stability_gate = os.getenv("SAGE_STABILITY_GATE_STRICT", "True").lower() == "true"

        # identity.jsonを読み込んで分身の設定をロード
        self.identity = self._load_identity()
        logger.info(f"[SNS] Identity loaded: niche={self.identity.get('niche')}")

    def _load_identity(self) -> dict:
        """identity.jsonを読み込む。失敗時はデフォルト値を返す"""
        import json
        try:
            path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "identity.json")
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {
                "role": "AI content creator",
                "niche": "AI tools and automation",
                "tone": "professional yet approachable",
                "brand_name": "Sage AI",
                "target_audience": "solopreneurs and developers",
            }

    def _load_strategy(self, path: str) -> str:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            return ""

    def _load_groq_client(self):
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set.")
        return Groq(api_key=api_key)

    def _call_llm(self, messages: list, max_tokens: int = 1500) -> str:
        """DeepSeek（primary）→ Groq（fallback）でLLMを呼び出す"""
        import requests as _req
        ds_key = os.getenv("DEEPSEEK_API_KEY")
        if ds_key:
            try:
                resp = _req.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {ds_key}", "Content-Type": "application/json"},
                    json={"model": "deepseek-chat", "messages": messages, "max_tokens": max_tokens, "temperature": 0.7},
                    timeout=20,
                )
                if resp.status_code == 200:
                    # 2026-08-19: 中身が空でも200なら返しており、その先のGroq
                    # フォールバックに一度も到達しなかった。空は失敗として扱う。
                    _text = (resp.json()["choices"][0]["message"].get("content") or "").strip()
                    if _text:
                        return _text
                    logger.warning("[LLM] DeepSeek returned empty content (HTTP 200); falling back to Groq")
            except Exception as e:
                logger.warning(f"[LLM] DeepSeek failed: {e}, falling back to Groq")
        # Groq fallback
        client = self._load_groq_client()
        create_kwargs = dict(
            messages=messages, model="openai/gpt-oss-120b", max_tokens=max_tokens,  # 2026-07-18: Groq 2026-08-16廃止に伴う移行
        )
        # 2026-08-19: gpt-oss は推論トークンが max_tokens を消費する
        # (house標準 = llm_fallback._try_groq)。
        try:
            response = client.chat.completions.create(
                **create_kwargs, extra_body={"reasoning_effort": "low"})
        except TypeError:
            response = client.chat.completions.create(**create_kwargs)
        return (response.choices[0].message.content or "").strip()

    def _numbers_ok(self, item: dict, ig_caption: str, bs_text: str) -> bool:
        """生成された2本の本文に、材料に無い数字が混ざっていないか。

        材料（state fact）でないアイテムには `numbers` が無い。そのときは検査しない——
        固定プールのネタは本文自体が人の書いた確定文なので、ここで縛ると誤爆する。
        """
        allowed = item.get("numbers")
        if allowed is None:
            return True
        try:
            from backend.modules.sns_number_guard import verify_numbers
        except Exception as e:
            logger.warning(f"[NUMBER GATE] guard unavailable ({e}); allowing.")
            return True
        for label, text in (("bluesky", bs_text), ("instagram", ig_caption)):
            ok, bad = verify_numbers(text or "", allowed)
            if not ok:
                logger.error(f"🚫 [NUMBER GATE] {label}: figures not in the source data: {bad}")
                return False
        return True

    def _links_ok(self, ig_caption: str, bs_text: str) -> bool:
        """本文のリンクが現行の誘導先だけか。

        実測で、過去投稿の175件が既に消えたドメインを指していた。
        投稿は自動で出ていくので、**出す前に止めるしかない**。
        """
        try:
            from backend.modules.sns_link_guard import check_text
        except Exception as e:
            logger.warning(f"[LINK GATE] guard unavailable ({e}); allowing.")
            return True
        for label, text in (("bluesky", bs_text), ("instagram", ig_caption)):
            ok, bad = check_text(text or "")
            if not ok:
                logger.error(f"🚫 [LINK GATE] {label}: not a current destination: {bad}")
                return False
        return True

    def _generate_content(
        self,
        topic: str,
        content: str,
        motif: str,
        allowed_numbers: list | None = None,
        retry: bool = False,
    ) -> dict:
        """LLM generates ig_caption, bs_text, image_prompt in one JSON call."""
        # identity.jsonから動的に設定を読み込む（分身AI対応）
        niche = self.identity.get("niche", "AI tools and automation")
        tone = self.identity.get("tone", "professional yet approachable")
        brand = self.identity.get("brand_name", "Sage AI")
        target = self.identity.get("target_audience", "solopreneurs and developers")
        url = self.identity.get("brand_url", "growl-ai.com")

        prompt = (
            f"You are a {tone} solopreneur sharing real, unfiltered experiences building AI tools while running a small business.\n"
            f"Your niche: {niche}\n"
            f"You write for: {target}\n\n"
            "VOICE RULES (critical):\n"
            "- Write like you're texting a friend who gets it. Short sentences. Real feelings.\n"
            "- NEVER use AI-speak: no 'leverage', 'synergize', 'game-changer', 'revolutionize', 'unlock'.\n"
            "- NEVER use em-dashes or semicolons. Periods and line breaks only.\n"
            "- If it sounds like a LinkedIn post, delete it and start over.\n\n"
            "[BLUESKY STRATEGY]\n"
            "- Max 240 characters.\n"
            "- First-person. Present tense. Feels like a DM, not a broadcast.\n"
            "- Every post MUST end with a short question that takes 5 seconds to answer.\n"
            "  Good: 'What's one thing you kept up for 30 days?'\n"
            "  Bad: 'How do you approach marketing strategy in today's landscape?'\n"
            "- No links. No product names. No CTAs. No hashtags.\n"
            "- Never start with 'Day N.' or 'Thread 🧵'.\n"
            f"[/BLUESKY]\n\n"
            f"Topic: {topic}\n"
            f"Context: {content}\n"
            f"Mood: {motif}\n\n"
            "TASK:\n"
            "1. bs_text: One Bluesky post per the rules above (value-first, no link).\n"
            f"2. ig_caption: Instagram caption with 3-5 hashtags, in {brand}'s witty voice, "
            f"that gives one useful marketing tip, then a soft CTA: 'Try {brand} free at {url}'.\n"
            "3. image_prompt: A simple visual idea, 10 words max.\n\n"
            "ACCURACY:\n"
            "- Never make up numbers (revenue, followers, growth %, or any statistic/percentage).\n"
            "- If you don't know, say 'some days it works, some days it doesn't.'\n"
            # 2026-09-01 の dry run で実際に出た2つの盛り方を名指しで塞ぐ。
            # 「32ページ在る」→「I just posted 32 pages」（今日やったことにした）
            # 「読まれていないが書く」→「it works」（出ていない成果を主張した）
            "- Do NOT imply something happened today or recently unless the fact says so. "
            "'There are N pages' does not mean 'I just published N pages'.\n"
            "- Do NOT claim a result you have not measured. Never write 'it works', 'it pays off', "
            "'it's growing', or any promise of outcome. State what happened, not what it earned.\n"
            f"- Never invent prices. You MAY name the brand {brand} and its site {url} in the Instagram caption.\n"
            + _numbers_rule(allowed_numbers, retry)
            + "\n"
            'Output ONLY JSON:\n'
            '{{\n    "bs_text": "...",\n    "ig_caption": "...",\n    "image_prompt": "..."\n}}'
        )
        logger.info(f"🤖 Generating optimized SNS content using motif: {motif}")
        raw = self._call_llm([{"role": "user", "content": prompt}])

        try:
            # Strip code fences (```json ... ``` or ``` ... ```)
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json\n"):
                    raw = raw[5:]
            return json.loads(raw)
        except Exception:
            logger.warning("AI failed to return JSON. Using raw text fallback.")
            return {
                "ig_caption": raw[:2200],
                "bs_text": raw[:240],
                "image_prompt": topic,
            }

    def _quality_check(self, content: dict, topic: str) -> bool:
        if not self.quality_gate:
            return True
        error_signals = [
            "i have lost my connection",
            "i cannot",
            "error:",
            "traceback",
            "exception",
        ]
        combined = " ".join(str(v) for v in content.values()).lower()
        for sig in error_signals:
            if sig in combined:
                logger.warning(f"🚫 [GATE] Quality gate FAILED for topic '{topic}'. System errors detected in output.")
                logger.info("   -> [BLOCKED] Post cancelled due to quality gate failure.")
                return False
        logger.info(f"✅ [GATE] QUALITY_GATE_PASS for topic '{topic}'. No system errors detected.")
        return True

    def _generate_image(self, prompt: str) -> dict:
        seed = random.randint(100, 999999)
        logger.info(f"🎨 Generating visual (Seed: {seed})")
        try:
            from backend.integrations.image_generation import image_gen_enhanced
            path = image_gen_enhanced.generate_social_media_image(prompt, platform="instagram")
            if path:
                return {"status": "success", "path": path}
            return {"status": "error", "path": None}
        except Exception as e:
            logger.error(f"❌ Visual generation failed: {e}")
            return {"status": "error", "path": None}

    def _write_job(self, item_id: str, topic: str, ig_caption: str,
                   bs_text: str, image_path: str, status: str = "pending") -> None:
        job_id = f"sns_{item_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        _jobs_append({
            "id": job_id,
            "type": "pr_post",
            "targets": ["instagram", "bluesky"],
            "topic": topic,
            "ig_caption": ig_caption,
            "bs_text": bs_text,
            "image_path": image_path,
            "notion_item_id": item_id,
            "status": status,
            "created_at": datetime.utcnow().isoformat(),
        })
        logger.info(f"💾 Job Queued: {job_id}")

    def _post_now(self, ig_caption: str, bs_text: str, image_path: str | None) -> None:
        if image_path and self.instagram:
            ig_result = self.instagram.post_image(image_url=image_path, caption=ig_caption)
            if ig_result.get("success"):
                logger.info(f"📸 Instagram posted: {ig_result.get('id')}")
            else:
                logger.error(f"❌ Instagram post failed: {ig_result.get('error')}")
        else:
            logger.info("⏭️ Instagram skipped (no image or Instagram disabled).")

        try:
            bs_result = self.bluesky.post_skeet(bs_text)
            if bs_result and "uri" in bs_result:
                logger.info(f"🦋 Bluesky posted: {bs_result['uri']}")
        except Exception as e:
            logger.error(f"❌ Bluesky post failed: {e}")

    # ── Launch 項目管理（Revenue Loop 連携） ─────────────────────────────────

    _LOCAL_POOL = Path("backend/data/local_content_pool.json")

    def _load_launch_items(self) -> list:
        """local_content_pool.json から category=='launch' かつ未投稿の項目を返す。"""
        if not self._LOCAL_POOL.exists():
            return []
        try:
            pool = json.loads(self._LOCAL_POOL.read_text(encoding="utf-8"))
            if not isinstance(pool, list):
                pool = pool.get("items", [])
            return [
                item for item in pool
                if item.get("category") == "launch" and not item.get("posted")
            ]
        except Exception as e:
            logger.warning(f"[SNS] Failed to load launch items: {e}")
            return []

    def _mark_launch_posted(self, item_id: str) -> None:
        """launch 項目を投稿済みにマーク（二重投稿防止）。"""
        if not self._LOCAL_POOL.exists():
            return
        try:
            pool = json.loads(self._LOCAL_POOL.read_text(encoding="utf-8"))
            if not isinstance(pool, list):
                return
            for item in pool:
                if item.get("id") == item_id:
                    item["posted"] = True
                    item["posted_at"] = datetime.utcnow().isoformat()
                    break
            self._LOCAL_POOL.write_text(
                json.dumps(pool, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            logger.info(f"[SNS] Launch item marked as posted: {item_id}")
        except Exception as e:
            logger.error(f"[SNS] Failed to mark launch item as posted: {e}")

    def _process_launch_item(self, item: dict) -> None:
        """
        launch 項目の処理。

        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        絶対ルール（v2 で確定）:
          self.bluesky（= kanagawa 系アカウント）には launch 告知を
          絶対に出さない。
          投稿先は SAGE_OWN_BLUESKY_HANDLE で指定した Sage 専用英語
          アカウントのみ。未設定なら投稿しない。
          distribution.py が article / directory_kit / social_en を
          別途処理するため、ここで投稿できなくても機能は失われない。
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """
        topic = item.get("topic", "Product Launch")
        bs_text = item.get("content", "")
        item_id = item.get("id", f"launch_{datetime.utcnow().strftime('%H%M%S')}")

        logger.info(f"[SNS] Processing LAUNCH item: {topic!r} (id={item_id})")

        if not bs_text:
            logger.warning(f"[SNS] Launch item has empty content — skipping: {item_id}")
            self._mark_launch_posted(item_id)
            return

        # ── Sage専用アカウントのチェック ──────────────────────────────────
        # SAGE_OWN_BLUESKY_HANDLE が未設定 → kanagawa には絶対出さない。
        # distribution.py が英語記事・ディレクトリキット・ソーシャルを別途処理。
        sage_handle = os.getenv("SAGE_OWN_BLUESKY_HANDLE", "")
        sage_password = os.getenv("SAGE_OWN_BLUESKY_APP_PASSWORD", "")

        if not sage_handle:
            logger.info(
                f"[SNS] SAGE_OWN_BLUESKY_HANDLE not set — "
                f"launch handled by distribution.py (no kanagawa post). "
                f"Marking processed. item_id={item_id}"
            )
            self._write_job(item_id, topic, "", bs_text, "[DIST_HANDLED]", status="launch_dist_only")
            self._mark_launch_posted(item_id)
            return

        if self.dry_run:
            logger.info(f"[SNS][DRY_RUN] Sage-owned launch post (not actually posted):\n{bs_text[:120]}...")
            self._write_job(item_id, topic, "", bs_text, "[DRY_RUN]", status="dry_run_launch")
            self._mark_launch_posted(item_id)
            return

        # ── Sage専用アカウントで実投稿（self.bluesky=kanagawa は絶対に使わない） ──
        posted = False
        try:
            from backend.integrations.bluesky_agent import BlueskyAgent
            sage_agent = BlueskyAgent(handle=sage_handle, app_password=sage_password)
            bs_result = sage_agent.post_skeet(bs_text)
            if bs_result and "uri" in bs_result:
                logger.info(f"[SNS] Launch post published (Sage account): {bs_result['uri']}")
                posted = True
            else:
                logger.warning(f"[SNS] Sage Bluesky launch post returned no URI: {bs_result}")
        except Exception as e:
            logger.error(f"[SNS] Sage Bluesky launch post failed: {e}")

        if posted:
            self._write_job(item_id, topic, "", bs_text, "", status="launch_posted")
            self._mark_launch_posted(item_id)
            logger.info(f"[SNS] Launch SNS cycle completed for '{topic}'")
        else:
            logger.warning(f"[SNS] Launch post not marked as posted (will retry next cycle): {item_id}")

    # ── メインサイクル ─────────────────────────────────────────────────────────

    def run_cycle(self) -> None:
        """Check for 'Ready' content and post to both platforms."""

        # ── 最優先: launch 項目（買いリンク付き告知・Notionより先に確認） ───
        launch_items = self._load_launch_items()
        if launch_items:
            logger.info(f"[SNS] 🚀 Launch item found — processing as priority post.")
            self._process_launch_item(launch_items[0])
            return  # launch 投稿のみ行い、通常サイクルはスキップ

        # ── 現状ネタ: いま実際に起きていることを材料にする ──────────────────
        # 固定プールより先に見る。プールは「去年の自分」で止まっているのに対し、
        # ここは git log や実測ファイルを毎回数え直すので、**必ず今日の話になる**。
        # 反応がずっと無い型は scorer が外す（生きている型が1つも無ければ外さない）。
        # 🔴 try で囲むのは「材料を集めて選ぶ」ところまで。
        #    最初は _process_item(pick) まで囲んでいたが、それだと
        #    **LLMが401を返しただけで「材料が読めなかった」ことにされ、
        #    止めたかった固定プールの古いネタに落ちて、そのまま投稿されていた**
        #    （2026-09-01のCI実測で発覚。ログは "state reader unavailable" と出るのに
        #      本当の原因は Groq の Invalid API Key だった＝原因も隠れる）。
        pick = None
        try:
            from backend.modules.sns_state_reader import collect_facts
            from backend.modules.sns_reaction_scorer import categories_to_avoid

            facts = collect_facts()
            if facts:
                avoid = categories_to_avoid()
                usable = [f for f in facts if f.get("category") not in avoid] or facts
                pick = random.choice(usable)
            else:
                logger.info("[SNS] No measurable state today — falling back to the content pool.")
        except Exception as e:
            # 材料が読めないことを理由にSNSを止めない（止まっても誰も気づかない）
            logger.warning(f"[SNS] state reader unavailable, falling back to pool: {e}")

        if pick is not None:
            logger.info(f"[SNS] 📊 Using measured state: {pick['id']} ({pick['source']})")
            # ここから先の失敗は握りつぶさない。**古いネタに逃げるくらいなら投稿しない。**
            self._process_item(pick)
            return

        # ── 通常フロー: Notion → ローカルフォールバック ─────────────────────
        items = []
        if self.notion_pool:
            logger.info("🔍 [SNS CEO] Scanning Notion for 'Ready' content...")
            items = self.notion_pool.get_ready_content(limit=1)

        if not items:
            fallback_path = "backend/data/local_content_pool.json"
            logger.info("Notion fetch failed: No items. Switching to LOCAL FALLBACK.")
            try:
                logger.info("📂 Loading content from LOCAL FALLBACK (local_content_pool.json)...")
                with open(fallback_path, 'r', encoding='utf-8') as f:
                    pool = json.load(f)
                # launch 済みを除外してランダムに1件選ぶ（通常投稿用）
                candidates = [
                    item for item in (pool if isinstance(pool, list) else pool.get("items", []))
                    if item.get("category") != "launch"
                ]
                items = candidates if candidates else (pool if isinstance(pool, list) else pool.get("items", []))
            except Exception as e:
                logger.error(f"Local fallback read failed: {e}")
                items = []

        if not items:
            logger.info("📅 No content '予約済み' found in Notion or Local Fallback. SNS Loop Idle.")
            return

        self._process_item(items[0])

    def _process_item(self, item: dict) -> None:
        """Processes a single content item through the SNS pipeline."""
        topic = item.get("topic", "")
        content = item.get("content", "")
        category = item.get("category", "General")
        item_id = item.get("id", f"local_{datetime.utcnow().strftime('%H%M%S')}")

        logger.info(f"🎯 Processing: {topic} (Category: {category})")

        motif = topic.split()[0] if topic else category

        if item.get("ig_caption"):
            ig_caption = item["ig_caption"]
            bs_text = item.get("bs_text", topic)
            image_prompt = item.get("image_prompt", topic)
            logger.info("♻️ Using pre-existing optimized content from Notion/Test Item.")
        else:
            allowed = item.get("numbers")
            generated = self._generate_content(topic, content, motif, allowed)
            ig_caption = generated.get("ig_caption", content)
            bs_text = generated.get("bs_text", topic)
            image_prompt = generated.get("image_prompt", topic)

            # 🔴 数字の検査。プロンプトに「捏造するな」と書くだけでは守られない
            #    （守らなかったことも見えない＝そのまま外に出る）。
            #    1度だけ書き直させ、それでもダメなら**投稿しない**。
            if not self._numbers_ok(item, ig_caption, bs_text):
                logger.warning("🔁 [NUMBER GATE] Regenerating once with a stricter reminder.")
                generated = self._generate_content(topic, content, motif, allowed, retry=True)
                ig_caption = generated.get("ig_caption", content)
                bs_text = generated.get("bs_text", topic)
                image_prompt = generated.get("image_prompt", topic)
                if not self._numbers_ok(item, ig_caption, bs_text):
                    logger.error("🚫 [NUMBER GATE] Invented figures survived a retry. Not posting.")
                    return

        # 🔴 投稿する直前に、URL内の非ASCIIハイフンを直す。
        #    LLMが `growl‑ai.com`(U+2011) を書くことがある——見た目は同じだが開けない。
        #    落とすのではなく直すのは、これは主張の誤りではなく組版の事故だから。
        try:
            from backend.modules.sns_link_guard import repair_link_dashes

            ig_caption = repair_link_dashes(ig_caption)
            bs_text = repair_link_dashes(bs_text)
        except Exception as e:
            logger.warning(f"[LINK] dash repair unavailable: {e}")

        if not self._quality_check({"ig_caption": ig_caption, "bs_text": bs_text}, topic):
            return

        # 🔴 リンクの検査は固定プールのネタにも効かせる（数字の検査と違い、
        #    プール側のネタこそ旧ドメインを抱えたまま古びる）。
        if not self._links_ok(ig_caption, bs_text):
            logger.error("🚫 [LINK GATE] Refusing to post a link that is not the current site.")
            return

        if self.stability_gate and "I have lost my connection to all intelligence providers" in ig_caption:
            logger.error("🚫 [STABILITY] All LLM circuits are dead. Aborting SNS cycle.")
            return

        # --- DRY RUN: skip image generation and posting ---
        if self.dry_run:
            logger.info(f"🛠️ [DRY_RUN] SNS Cycle finished for '{topic}'. Notion flag NOT updated.")
            self._write_job(item_id, topic, ig_caption, bs_text, "[DRY_RUN_NO_IMAGE]", status="dry_run")
            return

        # --- PRODUCTION: generate image then post ---
        img_result = self._generate_image(image_prompt)
        if img_result.get("status") == "success":
            image_path = img_result["path"]
        else:
            logger.warning("🚫 [IMAGE GATE] Image generation failed. Posting Bluesky text-only; skipping Instagram.")
            image_path = None

        self._post_now(ig_caption, bs_text, image_path)
        self._write_job(item_id, topic, ig_caption, bs_text, image_path or "", status="pending")

        if item.get("id") and self.notion_pool:
            self.notion_pool.mark_as_posted(item["id"])

        logger.info(f"✅ SNS Cycle Completed for '{topic}'")


if __name__ == "__main__":
    import schedule
    import time

    scheduler = SNSDailyScheduler()

    # JST 12:00 = UTC 03:00
    schedule.every().day.at("03:00").do(scheduler.run_cycle)
    # EST 08:00 = UTC 13:00
    schedule.every().day.at("13:00").do(scheduler.run_cycle)
    # EST 21:00 = UTC 02:00
    schedule.every().day.at("02:00").do(scheduler.run_cycle)

    logger.info("🚀 SNSDailyScheduler started. Targets: JST 12:00 / EST 08:00 / EST 21:00")

    while True:
        schedule.run_pending()
        time.sleep(60)
