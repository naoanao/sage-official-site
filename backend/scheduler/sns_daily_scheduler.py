import os
import json
import logging
import random
from datetime import datetime
from dotenv import load_dotenv

from backend.data.jobs_store import append as _jobs_append

load_dotenv('.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SNS_Daily_Scheduler")


# ── 投稿カテゴリ定義（5種ローテーション）──────────────────────────────────────
CATEGORY_CONFIGS = {
    "build_in_public": {
        "instruction": (
            "Write a raw BUILD-IN-PUBLIC post about a specific real moment building an AI automation system. "
            "Share a concrete win, struggle, or learning. Sound like a real developer, NOT ad copy. "
            "No CTAs, no product pitches. Max 240 chars."
        ),
        "hashtags": "#BuildInPublic #ShipIt #IndieHacker",
        "include_url": False,
    },
    "insight": {
        "instruction": (
            "Share ONE concrete insight about AI automation or solopreneurship. "
            "Be specific and direct — lead with the insight itself, not a headline. "
            "Educational tone, not promotional. Max 240 chars."
        ),
        "hashtags": "#AIAutomation #Solopreneur #BuildInPublic",
        "include_url": False,
    },
    "marketing_lesson": {
        "instruction": (
            "Share ONE practical marketing lesson (e.g. STP, 3C, PEST, customer psychology, positioning). "
            "Frame it as something you're currently studying. Educational and honest. Max 240 chars."
        ),
        "hashtags": "#MarketingTips #GrowthHacking #MadeInJapan",
        "include_url": False,
    },
    "question": {
        "instruction": (
            "Ask your audience ONE genuine, specific question about AI, automation, or solopreneurship. "
            "Make it easy to answer in 1-2 sentences. MUST end with a question mark. Max 240 chars."
        ),
        "hashtags": "#Solopreneur #IndieHacker #AITools",
        "include_url": False,
    },
    "soft_cta": {
        "instruction": (
            "Write a value-first post: lead with a real benefit or story in 2-3 sentences, "
            "then add ONE gentle CTA at the very end. "
            "The URL must appear at the end only: → sage-official-site.pages.dev . Max 240 chars total."
        ),
        "hashtags": "#AITools #Automation #Solopreneur",
        "include_url": True,
        "url": "→ sage-official-site.pages.dev",
    },
    "growl_cta": {
        "instruction": (
            "Write a value-first post about a SPECIFIC pain point for small business owners or solopreneurs "
            "(e.g. 'not knowing what to post', 'spending hours on marketing with zero results', "
            "'posting but getting no customers'). Then gently introduce Growl as the solution in 1 sentence. "
            "End with the URL. Conversational, NOT salesy. Max 240 chars total."
        ),
        "hashtags": "#SmallBusiness #MarketingAI #AITools",
        "include_url": True,
        "url": "→ growl-app.vercel.app",
    },
}

# ローテーション順（CTA は 9投稿に2回 ≒ 週4〜5回）
# growl_cta を入れることで Growl への直接コンバージョンを狙う
ROTATION = [
    "build_in_public", "insight", "marketing_lesson", "question",
    "build_in_public", "insight", "growl_cta",
    "marketing_lesson", "soft_cta",
]


class SNSDailyScheduler:
    """
    Sage SNS CEO: Automates Instagram & Bluesky posts from the Notion Content Pool.

    複数アカウント対応:
        account_handle / account_password を渡すと、そのアカウントで Bluesky に投稿する。
        省略時は env var (BLUESKY_HANDLE / BLUESKY_PASSWORD) を使用。

    Args:
        account_handle:   Bluesky ハンドル (例: "kanagawajapan.bsky.social")
        account_password: Bluesky アプリパスワード
        rotation_key:     ローテーション状態ファイルの識別子 ("" or "_2" など)
        post_instagram:   True の場合のみ Instagram にも投稿する (デフォルト True)
    """

    def __init__(
        self,
        account_handle: str = None,
        account_password: str = None,
        rotation_key: str = "",
        post_instagram: bool = True,
    ):
        from backend.modules.notion_content_pool import NotionContentPool
        from backend.integrations.bluesky_agent import BlueskyAgent
        from backend.integrations.instagram_integration import InstagramBot

        self.notion_pool = NotionContentPool()
        self.bluesky = BlueskyAgent(handle=account_handle, password=account_password)
        self.instagram = InstagramBot() if post_instagram else None
        self.post_instagram = post_instagram
        self._rotation_key = rotation_key  # ファイル名の識別子

        self.ig_strategy = self._load_strategy("backend/cognitive/instagram_strategy.md")
        self.bs_strategy = self._load_strategy("backend/cognitive/bluesky_strategy.md")

        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        self.quality_gate = os.getenv("SAGE_QUALITY_GATE_STRICT", "True").lower() == "true"
        self.stability_gate = os.getenv("SAGE_STABILITY_GATE_STRICT", "True").lower() == "true"

        # identity.jsonを読み込んで分身の設定をロード
        self.identity = self._load_identity()
        logger.info(
            f"[SNS] Scheduler ready | @{self.bluesky.username} | "
            f"instagram={'ON' if post_instagram else 'OFF'} | "
            f"rotation_key='{rotation_key}'"
        )

    # ── ローテーション管理 ─────────────────────────────────────────────────────
    @property
    def _rotation_state_path(self) -> str:
        filename = f"post_rotation_state{self._rotation_key}.json"
        return os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", filename)

    def _get_rotation_index(self) -> int:
        try:
            with open(self._rotation_state_path, "r", encoding="utf-8") as f:
                return json.load(f).get("index", 0)
        except Exception:
            return 0

    def _advance_rotation(self, current_index: int) -> None:
        next_index = (current_index + 1) % len(ROTATION)
        try:
            os.makedirs(os.path.dirname(self._rotation_state_path), exist_ok=True)
            with open(self._rotation_state_path, "w", encoding="utf-8") as f:
                json.dump({
                    "index": next_index,
                    "next_category": ROTATION[next_index],
                    "last_updated": datetime.utcnow().isoformat(),
                }, f, ensure_ascii=False, indent=2)
            logger.info(f"[Rotation] → index {next_index}: {ROTATION[next_index]}")
        except Exception as e:
            logger.warning(f"[Rotation] Failed to save state: {e}")

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

    def _generate_content(self, topic: str, content: str, motif: str, bs_category: str = "insight") -> dict:
        """LLM generates ig_caption, bs_text, image_prompt in one JSON call."""
        niche = self.identity.get("niche", "AI tools and automation")
        tone = self.identity.get("tone", "professional yet approachable")
        brand = self.identity.get("brand_name", "Sage AI")
        target = self.identity.get("target_audience", "solopreneurs and developers")

        # カテゴリ設定を取得
        cat_cfg = CATEGORY_CONFIGS.get(bs_category, CATEGORY_CONFIGS["insight"])
        bs_instruction = cat_cfg["instruction"]
        bs_hashtags = cat_cfg["hashtags"]
        bs_url_line = (
            f"   - If the post includes a CTA, append this URL at the very end: {cat_cfg['url']}\n"
            if cat_cfg.get("include_url") else ""
        )

        prompt = (
            f"You are the {brand} Marketing AI. Generate high-performing content for BOTH Instagram and Bluesky.\n"
            f"Brand niche: {niche}\n"
            f"Target audience: {target}\n"
            f"Tone: {tone}\n\n"
            f"[RAW CONTENT]\nTopic: {topic}\nDetail: {content}\nDirection: {motif}\n[/RAW CONTENT]\n\n"
            "### TASK:\n"
            "1. INSTAGRAM CAPTION: Professional, save-rate optimized, with hashtags.\n"
            "   - End EVERY caption with a link-in-bio CTA, e.g.: '👉 Link in bio to automate yours'\n"
            f"2. BLUESKY SKEET [{bs_category.upper()}]: {bs_instruction}\n"
            f"   - Append these hashtags at the end: {bs_hashtags}\n"
            + bs_url_line
            + f"3. UNIFIED IMAGE PROMPT: Unique visual for Stable Diffusion reflecting '{motif}' motif.\n\n"
            "ACCURACY RULES (strictly enforced):\n"
            "- Do NOT invent income figures. Never write specific amounts like ¥500,000/月 or $10,000/mo.\n"
            "- Use only factual, verifiable claims.\n"
            "- Never mix currencies in the same post.\n"
            "- Never mention AutoPilot AI Pro, SelfThinking AI Pro, or $20/month subscription.\n\n"
            'Output strictly in JSON format:\n'
            '{\n    "ig_caption": "...",\n    "bs_text": "...",\n    "image_prompt": "..."\n}'
        )
        logger.info(f"🤖 Generating optimized SNS content using motif: {motif}")
        client = self._load_groq_client()
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        raw = response.choices[0].message.content.strip()

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

    def _write_evidence(self, topic: str, bs_text: str, ig_caption: str,
                         bs_uri: str | None, ig_id: str | None,
                         category: str, image_path: str | None) -> None:
        """投稿結果をsns_evidence.jsonlに1行追記する（追跡・監査用）"""
        import json as _json
        evidence_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "data", "sns_evidence.jsonl"
        )
        record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "category": category,
            "topic": topic,
            "bs_text": bs_text[:300],
            "ig_caption": ig_caption[:500],
            "bs_uri": bs_uri,
            "ig_id": ig_id,
            "image_path": image_path,
            "bs_posted": bs_uri is not None,
            "ig_posted": ig_id is not None,
        }
        try:
            os.makedirs(os.path.dirname(evidence_path), exist_ok=True)
            with open(evidence_path, "a", encoding="utf-8") as f:
                f.write(_json.dumps(record, ensure_ascii=False) + "\n")
            logger.info(f"[Evidence] ✅ Recorded to sns_evidence.jsonl | bs={bs_uri} ig={ig_id}")
        except Exception as e:
            logger.warning(f"[Evidence] Failed to write sns_evidence.jsonl: {e}")

    def _post_now(self, ig_caption: str, bs_text: str, image_path: str | None,
                  topic: str = "", category: str = "insight") -> None:
        ig_id = None
        bs_uri = None

        if self.post_instagram and image_path and self.instagram:
            ig_result = self.instagram.post_image(image_url=image_path, caption=ig_caption)
            if ig_result.get("success"):
                ig_id = ig_result.get("id")
                logger.info(f"📸 Instagram posted: {ig_id}")
            else:
                logger.error(f"❌ Instagram post failed: {ig_result.get('error')}")
        else:
            logger.info("⏭️ Instagram skipped (no image).")

        try:
            bs_result = self.bluesky.post_skeet(bs_text)
            if bs_result and "uri" in bs_result:
                bs_uri = bs_result["uri"]
                logger.info(f"🦋 Bluesky posted: {bs_uri}")
            else:
                logger.warning(f"⚠️ Bluesky post_skeet returned no URI: {bs_result}")
        except Exception as e:
            import traceback
            logger.error(f"❌ Bluesky post failed: {e}\n{traceback.format_exc()}")

        self._write_evidence(topic, bs_text, ig_caption, bs_uri, ig_id, category, image_path)

        # ── 動画生成（オプション、バックグラウンドスレッドで実行）──────────────
        if os.getenv("SAGE_VIDEO_GENERATION", "False").lower() == "true":
            self._generate_video_async(bs_text=bs_text, topic=topic,
                                       category=category, image_path=image_path)

    def _generate_video_async(self, bs_text: str, topic: str,
                               category: str, image_path: str | None) -> None:
        """動画生成をバックグラウンドスレッドで実行（メイン投稿をブロックしない）"""
        import threading

        def _run():
            try:
                from backend.integrations.video_generator import generate_video_from_sns_post
                video_path = generate_video_from_sns_post(
                    bs_text=bs_text, topic=topic,
                    category=category, image_path=image_path,
                )
                if video_path:
                    logger.info(f"🎬 SNS動画生成完了: {video_path}")
                else:
                    logger.warning("🎬 SNS動画生成: パス取得失敗")
            except Exception as e:
                import traceback
                logger.error(f"🎬 SNS動画生成エラー: {e}\n{traceback.format_exc()}")

        t = threading.Thread(target=_run, name="VideoGenerator", daemon=True)
        t.start()
        logger.info("🎬 SNS動画生成をバックグラウンドで開始...")

    def run_cycle(self) -> None:
        """Check for 'Ready' content and post to both platforms."""
        rotation_idx = self._get_rotation_index()
        current_category = ROTATION[rotation_idx % len(ROTATION)]
        logger.info(f"[SNS CEO] Scanning Notion for Ready content... [Category: {current_category}]")

        items = self.notion_pool.get_ready_content(limit=1)

        if not items:
            fallback_path = "backend/data/local_content_pool.json"
            logger.info("Notion fetch failed: No items. Switching to LOCAL FALLBACK.")
            try:
                logger.info("Loading content from LOCAL FALLBACK (local_content_pool.json)...")
                with open(fallback_path, 'r', encoding='utf-8') as f:
                    pool = json.load(f)
                items = pool if isinstance(pool, list) else pool.get("items", [])
            except Exception as e:
                logger.error(f"Local fallback read failed: {e}")
                items = []

        if not items:
            logger.info("No content ready found in Notion or Local Fallback. SNS Loop Idle.")
            return

        self._process_item(items[0], bs_category=current_category)
        self._advance_rotation(rotation_idx)

    def _process_item(self, item: dict, bs_category: str = "insight") -> None:
        """Processes a single content item through the SNS pipeline."""
        topic = item.get("topic", "")
        content = item.get("content", "")
        category = item.get("category", "General")
        item_id = item.get("id", f"local_{datetime.utcnow().strftime('%H%M%S')}")

        logger.info(f"Processing: {topic} (Category: {category}, BS-Category: {bs_category})")

        motif = topic.split()[0] if topic else category

        if item.get("ig_caption"):
            ig_caption = item["ig_caption"]
            bs_text = item.get("bs_text", topic)
            image_prompt = item.get("image_prompt", topic)
            logger.info("Using pre-existing optimized content from Notion/Test Item.")
        else:
            generated = self._generate_content(topic, content, motif, bs_category=bs_category)
            ig_caption = generated.get("ig_caption", content)
            bs_text = generated.get("bs_text", topic)
            image_prompt = generated.get("image_prompt", topic)

        if not self._quality_check({"ig_caption": ig_caption, "bs_text": bs_text}, topic):
            return

        if self.stability_gate and "I have lost my connection to all intelligence providers" in ig_caption:
            logger.error("All LLM circuits are dead. Aborting SNS cycle.")
            return

        if self.dry_run:
            logger.info(f"[DRY_RUN] SNS Cycle finished for '{topic}'. Notion flag NOT updated.")
            self._write_job(item_id, topic, ig_caption, bs_text, "[DRY_RUN_NO_IMAGE]", status="dry_run")
            return

        img_result = self._generate_image(image_prompt)
        if img_result.get("status") == "success":
            image_path = img_result["path"]
        else:
            logger.warning("Image generation failed. Posting Bluesky text-only; skipping Instagram.")
            image_path = None

        self._post_now(ig_caption, bs_text, image_path, topic=topic, category=bs_category)
        self._write_job(item_id, topic, ig_caption, bs_text, image_path or "", status="pending")

        if item.get("id"):
            self.notion_pool.mark_as_posted(item["id"])

        logger.info(f"SNS Cycle Completed for '{topic}'")


if __name__ == "__main__":
    import schedule as _schedule_lib
    import threading
    import time
    import random
    from datetime import date

    # ── ボット検知対策ユーティリティ ────────────────────────────────────────────

    def _get_weekly_off_days(seed_salt: int = 31337) -> set:
        """週番号ベースでランダムな2日間（0=Mon〜6=Sun）をオフ日として返す。"""
        week_num = date.today().isocalendar()[1]
        rng = random.Random(week_num * seed_salt)
        return set(rng.sample(range(7), 2))

    def _human_run(sched_instance: "SNSDailyScheduler", slot_name: str, off_day_salt: int) -> None:
        """
        ジッター + スキップロジック付き run_cycle ラッパー。
        - 週2日のオフ日: 人間っぽく「今日は投稿しない」
        - 20%スロットスキップ: 毎スロットでもランダムに休む
        - 2〜40分ジッター: 固定時刻を隠して機械的パターンを排除
        """
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        today_weekday = date.today().weekday()
        off_days = _get_weekly_off_days(seed_salt=off_day_salt)

        if today_weekday in off_days:
            logger.info(
                f"📅 [Human] {slot_name} — OFF day ({day_names[today_weekday]}). Skipped."
            )
            return

        if random.random() < 0.20:
            logger.info(f"🎲 [Human] {slot_name} — random 20% skip.")
            return

        jitter = random.randint(2, 40)
        logger.info(f"⏱️  [Human] {slot_name} — waiting {jitter} min before posting.")
        time.sleep(jitter * 60)

        sched_instance.run_cycle()

    # ── アカウント設定 ────────────────────────────────────────────────────────
    # アカウント1: @kanagawatable (メイン, Instagram も投稿)
    acc1_handle   = os.getenv("BLUESKY_HANDLE")
    acc1_password = os.getenv("BLUESKY_PASSWORD") or os.getenv("BLUESKY_APP_PASSWORD")

    # アカウント2: @kanagawajapan (復活アカウント, Bluesky のみ)
    acc2_handle   = os.getenv("BLUESKY_HANDLE_2")
    acc2_password = os.getenv("BLUESKY_PASSWORD_2")

    sched1 = SNSDailyScheduler(
        account_handle=acc1_handle,
        account_password=acc1_password,
        rotation_key="",          # post_rotation_state.json
        post_instagram=True,
    )

    # ── アカウント2は設定がある場合のみ起動 ──────────────────────────────────
    sched2 = None
    if acc2_handle and acc2_password:
        sched2 = SNSDailyScheduler(
            account_handle=acc2_handle,
            account_password=acc2_password,
            rotation_key="_2",        # post_rotation_state_2.json (独立ローテーション)
            post_instagram=False,     # Bluesky のみ
        )
    else:
        logger.info("ℹ️  BLUESKY_HANDLE_2 / BLUESKY_PASSWORD_2 not set — single account mode.")

    # ── スケジューラー設定（アカウントごとに独立した schedule.Scheduler） ──────
    s1 = _schedule_lib.Scheduler()
    # Account 1 — JST 08:00 / 13:00 / 20:00 (UTC 23:00 / 04:00 / 11:00)
    s1.every().day.at("23:00").do(_human_run, sched1, "acc1-JST08", 31337)
    s1.every().day.at("04:00").do(_human_run, sched1, "acc1-JST13", 31337)
    s1.every().day.at("11:00").do(_human_run, sched1, "acc1-JST20", 31337)

    s2 = None
    if sched2:
        s2 = _schedule_lib.Scheduler()
        # Account 2 — JST 09:30 / 15:00 / 21:30 (UTC 00:30 / 06:00 / 12:30)
        # Account 1 とずらすことで同時投稿を防ぎ、人間らしさを演出
        s2.every().day.at("00:30").do(_human_run, sched2, "acc2-JST09:30", 99991)
        s2.every().day.at("06:00").do(_human_run, sched2, "acc2-JST15:00", 99991)
        s2.every().day.at("12:30").do(_human_run, sched2, "acc2-JST21:30", 99991)

    logger.info("=" * 60)
    logger.info("SNSDailyScheduler started (dual-account mode)")
    logger.info(f"  Account 1 (@{acc1_handle}) : JST 08:00 / 13:00 / 20:00")
    if sched2:
        logger.info(f"  Account 2 (@{acc2_handle}) : JST 09:30 / 15:00 / 21:30")
    logger.info("  Human-pattern : Weekly 2-day off | 20% slot skip | 2-40 min jitter")
    logger.info("  Content       : Independent Groq generation per account (always different)")
    logger.info("=" * 60)

    def _run_scheduler(s: _schedule_lib.Scheduler, name: str) -> None:
        logger.info(f"[Thread] {name} started.")
        while True:
            s.run_pending()
            time.sleep(60)

    t1 = threading.Thread(target=_run_scheduler, args=(s1, "Scheduler-Acc1"), daemon=True)
    t1.start()

    if s2:
        t2 = threading.Thread(target=_run_scheduler, args=(s2, "Scheduler-Acc2"), daemon=True)
        t2.start()

    # メインスレッドはブロックし続ける（daemon スレッドを生かすため）
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        logger.info("SNSDailyScheduler stopped by user.")
