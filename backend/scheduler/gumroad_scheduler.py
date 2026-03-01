"""
Sage Gumroad Promotion Scheduler
- Picks latest blog post from src/blog/posts/
- Fetches current Gumroad products via API (GET /v2/products)
- Generates Groq tweet copy tying the blog topic to the best-fit product
- Queues Instagram + Bluesky SNS post with the Gumroad product URL

NOTE: Gumroad removed POST/PUT write endpoints from their API in 2024.
This scheduler promotes EXISTING products instead of creating new ones.
Products are managed manually at gumroad.com/products.
"""

import os
import json
import logging
import re
import glob
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("GumroadScheduler")

from backend.data.jobs_store import load as _jobs_load, append as _jobs_append

GROQ_MODEL = "llama-3.3-70b-versatile"
POSTS_DIR = "src/blog/posts"
GUMROAD_PRODUCTS_API = "https://api.gumroad.com/v2/products"

# Fallback product if API is unreachable
FALLBACK_PRODUCT = {
    "name": "2026 AI Influencer Monetization Express",
    "short_url": "https://naofumi3.gumroad.com/l/yvzrfjd",
    "price": 2999,
}


class GumroadScheduler:
    def __init__(self):
        from groq import Groq

        self.groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.access_token = (
            os.getenv("GUMROAD_ACCESS_TOKEN")
            or os.getenv("GUMROAD_API_KEY")
            or ""
        )
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        logger.info(f"[GUMROAD] GumroadScheduler initialized. dry_run={self.dry_run}")

    # ── Blog post helpers ─────────────────────────────────────────────────────

    def _latest_post(self) -> dict | None:
        # Only consider dated files (YYYY-MM-DD-*.mdx) sorted newest first
        import re as _re
        all_files = glob.glob(f"{POSTS_DIR}/*.mdx")
        dated = [f for f in all_files if _re.search(r'\d{4}-\d{2}-\d{2}', os.path.basename(f))]
        files = sorted(dated, reverse=True)
        for path in files:
            fm = self._parse_frontmatter(path)
            if fm.get("title"):
                fm["_path"] = path
                return fm
        return None

    def _parse_frontmatter(self, filepath: str) -> dict:
        try:
            with open(filepath, encoding="utf-8") as f:
                raw = f.read()
            parts = raw.split("---")
            fm = {}
            if len(parts) >= 3:
                for line in parts[1].split("\n"):
                    m = re.match(r'^(\w[\w\s]*):\s*["\']?(.+?)["\']?\s*$', line)
                    if m:
                        fm[m.group(1).strip()] = m.group(2).strip()
            return fm
        except Exception:
            return {}

    # ── Fetch existing Gumroad products ───────────────────────────────────────

    def _get_products(self) -> list:
        """Fetch current products from Gumroad API (GET only — read-only)."""
        if not self.access_token:
            return [FALLBACK_PRODUCT]
        import requests as _r
        try:
            resp = _r.get(
                GUMROAD_PRODUCTS_API,
                headers={"Authorization": f"Bearer {self.access_token}"},
                timeout=15,
            )
            if resp.status_code == 200:
                products = resp.json().get("products", [])
                if products:
                    logger.info(f"[GUMROAD] Fetched {len(products)} products from API.")
                    return products
        except Exception as e:
            logger.warning(f"[GUMROAD] Product fetch failed: {e}")
        return [FALLBACK_PRODUCT]

    def _pick_product(self, products: list) -> dict:
        """Pick the most relevant product (first published one)."""
        if len(products) == 1:
            return products[0]
        published = [p for p in products if p.get("published", True)]
        return (published or products)[0]

    # ── Groq SNS copy generation ──────────────────────────────────────────────

    def _generate_sns_copy(self, blog_title: str, blog_excerpt: str, product: dict) -> dict:
        product_name = product.get("name", "")
        product_url = product.get("short_url", "")
        price_cents = product.get("price", 2999)
        price_usd = price_cents / 100

        prompt = f"""You are a social media copywriter.
Blog post: "{blog_title}"
Summary: {blog_excerpt}
Gumroad product to promote: "{product_name}" (${price_usd:.2f}) → {product_url}

Write SNS copy that connects the blog topic to the product naturally.
Return ONLY valid JSON (no markdown):
{{
  "bs_text": "Bluesky post max 280 chars with 2 relevant hashtags and the URL",
  "ig_caption": "Instagram caption 3-4 lines, emoji, ends with 'Link in bio!'"
}}"""

        resp = self.groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            raw = m.group(0)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            product_url = product.get("short_url", "")
            return {
                "bs_text": f"📖 {blog_title}\nGet the full guide: {product_url} #AIAutomation #Solopreneur",
                "ig_caption": f"New post: {blog_title} 🚀\n{blog_excerpt[:100]}\nFull guide in bio!",
            }

    # ── SNS queue ─────────────────────────────────────────────────────────────

    def _queue_sns_post(self, bs_text: str, ig_caption: str, topic: str) -> None:
        # Generate product thumbnail (Gemini → LoremFlickr fallback)
        image_url = None
        try:
            from backend.integrations.image_generation import image_gen_enhanced
            image_url = image_gen_enhanced.generate_thumbnail(topic)
            logger.info(f"[GUMROAD] Thumbnail generated: {image_url[:60]}")
        except Exception as e:
            logger.warning(f"[GUMROAD] Thumbnail generation skipped: {e}")

        job = {
            "id": f"gumroad_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "type": "pr_post",
            "targets": ["instagram", "bluesky"],
            "topic": topic,
            "ig_caption": ig_caption,
            "bs_text": bs_text,
            "image_path": image_url,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
        }
        _jobs_append(job)
        logger.info(f"[GUMROAD] SNS post queued: {bs_text[:60]}...")

    # ── Main ──────────────────────────────────────────────────────────────────

    def _already_promoted(self, title: str, within_days: int = 7) -> bool:
        """Return True if this blog title was already promoted within the last N days."""
        jobs = _jobs_load()
        cutoff = datetime.utcnow() - timedelta(days=within_days)
        for job in jobs:
            # Only check gumroad promotion jobs (not blog announcement jobs)
            if not str(job.get("id", "")).startswith("gumroad_"):
                continue
            if job.get("topic") == title and job.get("status") in ("pending", "posted"):
                created = job.get("created_at", "")
                try:
                    if datetime.fromisoformat(created) > cutoff:
                        return True
                except Exception:
                    pass
        return False

    def run_once(self) -> None:
        logger.info("[GUMROAD] run_once() started.")

        post = self._latest_post()
        if not post:
            logger.info("[GUMROAD] No blog post found. Idle.")
            return

        # Phase C: evidence_status gate — skip FAILED topics
        ev_status = post.get("evidence_status", "")
        if ev_status == "FAILED":
            logger.warning(f"[GUMROAD] Skipping post (evidence_status=FAILED): {post.get('title', '?')}")
            return

        title = post.get("title", "")
        excerpt = post.get("excerpt", "")
        logger.info(f"[GUMROAD] Blog: '{title}'")

        if self._already_promoted(title):
            logger.info(f"[GUMROAD] '{title}' was promoted within last 7 days. Skipping duplicate.")
            return

        products = self._get_products()
        product = self._pick_product(products)
        logger.info(f"[GUMROAD] Promoting: '{product.get('name')}' → {product.get('short_url')}")

        if self.dry_run:
            logger.info(f"[GUMROAD][DRY_RUN] Would queue SNS for '{product.get('name')}'. Skipping.")
            return

        copy = self._generate_sns_copy(title, excerpt, product)
        self._queue_sns_post(copy["bs_text"], copy["ig_caption"], title)
        logger.info(f"[GUMROAD] ✅ Done. Promotion queued for: {product.get('short_url')}")

    def run(self) -> None:
        """Background loop: runs daily at UTC 01:00 (JST 10:00)."""
        import time
        logger.info("[GUMROAD] GumroadScheduler background loop started.")
        while True:
            try:
                now_utc = datetime.now(timezone.utc)
                if now_utc.hour == 1 and now_utc.minute < 5:
                    self.run_once()
                    time.sleep(300)
                else:
                    time.sleep(60)
            except Exception as e:
                logger.error(f"[GUMROAD] Loop error: {e}")
                time.sleep(60)
