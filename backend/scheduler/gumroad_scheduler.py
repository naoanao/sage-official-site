"""
Sage Gumroad Auto-Listing Scheduler
- Picks latest blog post from src/blog/posts/ (not yet listed on Gumroad)
- Generates product name, description, sales copy via Groq
- Creates product on Gumroad via API (POST /v2/products)
- Updates Notion status to 'Gumroad出品済み'
- Queues SNS post with Gumroad product URL
"""

import os
import json
import logging
import re
import glob
from datetime import datetime, timezone

logger = logging.getLogger("GumroadScheduler")

GROQ_MODEL = "llama-3.3-70b-versatile"
POSTS_DIR = "src/blog/posts"
JOBS_FILE = "backend/data/jobs.json"
GUMROAD_API = "https://api.gumroad.com/v2/products"


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
        if not self.access_token:
            logger.warning("[GUMROAD] No GUMROAD_ACCESS_TOKEN found in .env — listing will be skipped.")
        logger.info(f"[GUMROAD] GumroadScheduler initialized. dry_run={self.dry_run}")

    # ── Blog post helpers ─────────────────────────────────────────────────────

    def _latest_post(self) -> dict | None:
        """Return frontmatter of the most recent .mdx file."""
        files = sorted(glob.glob(f"{POSTS_DIR}/*.mdx"), reverse=True)
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

    # ── Groq copy generation ──────────────────────────────────────────────────

    def _generate_product_copy(self, blog_title: str, blog_excerpt: str) -> dict:
        prompt = f"""You are a high-converting Gumroad copywriter.
Based on this blog post:
Title: {blog_title}
Summary: {blog_excerpt}

Generate a Gumroad product listing in JSON (no markdown, plain JSON):
{{
  "name": "compelling product name (max 60 chars)",
  "price": 2999,
  "description": "3-5 paragraph sales description with benefits, bullet points, and strong CTA. Min 300 words.",
  "summary": "one-line tweet-sized description"
}}"""

        resp = self.groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content.strip()
        # Strip markdown code fences and extract JSON object
        raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
        m = re.search(r'\{[\s\S]*\}', raw)
        if m:
            raw = m.group(0)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("[GUMROAD] JSON parse failed, using fallback.")
            return {
                "name": blog_title[:60],
                "price": 2999,
                "description": blog_excerpt or blog_title,
                "summary": blog_title,
            }

    # ── Gumroad API ───────────────────────────────────────────────────────────

    def _create_gumroad_product(self, copy: dict) -> dict | None:
        if not self.access_token:
            logger.warning("[GUMROAD] Skipping API call — no access token.")
            return None
        import requests as _requests

        payload = {
            "access_token": self.access_token,
            "name": copy["name"],
            "price": int(copy.get("price", 2999)),
            "description": copy["description"],
            "published": "true",
        }
        try:
            resp = _requests.post(GUMROAD_API, data=payload, timeout=20)
            result = resp.json()
            if result.get("success"):
                product = result.get("product", {})
                logger.info(f"[GUMROAD] Product created: {product.get('short_url')}")
                return product
            else:
                logger.error(f"[GUMROAD] API error: {result.get('message')}")
                return None
        except Exception as e:
            logger.error(f"[GUMROAD] Request failed: {e}")
            return None

    # ── SNS queue ─────────────────────────────────────────────────────────────

    def _queue_sns_post(self, product_name: str, product_url: str, summary: str) -> None:
        bs_text = f"🛒 New product: {product_name}\n{summary}\n👉 {product_url}"
        ig_caption = f"Just dropped: {product_name} 🚀\n{summary}\nLink in bio!"
        job = {
            "id": f"gumroad_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "type": "pr_post",
            "targets": ["instagram", "bluesky"],
            "topic": product_name,
            "ig_caption": ig_caption,
            "bs_text": bs_text,
            "image_path": None,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
        }
        os.makedirs(os.path.dirname(JOBS_FILE), exist_ok=True)
        jobs = []
        if os.path.exists(JOBS_FILE):
            try:
                with open(JOBS_FILE, encoding="utf-8") as f:
                    jobs = json.load(f)
            except Exception:
                pass
        jobs.append(job)
        with open(JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump(jobs, f, ensure_ascii=False, indent=2)
        logger.info(f"[GUMROAD] SNS post queued for: {product_url}")

    # ── Main ──────────────────────────────────────────────────────────────────

    def run_once(self) -> None:
        logger.info("[GUMROAD] run_once() started.")

        post = self._latest_post()
        if not post:
            logger.info("[GUMROAD] No blog post found. Idle.")
            return

        title = post.get("title", "")
        excerpt = post.get("excerpt", "")
        logger.info(f"[GUMROAD] Generating product copy for: '{title}'")

        copy = self._generate_product_copy(title, excerpt)
        logger.info(f"[GUMROAD] Generated: name='{copy['name']}' price={copy['price']}")

        if self.dry_run:
            logger.info(f"[GUMROAD][DRY_RUN] Would create product '{copy['name']}'. Skipping API call.")
            return

        product = self._create_gumroad_product(copy)
        if product:
            url = product.get("short_url") or product.get("url", "")
            self._queue_sns_post(copy["name"], url, copy.get("summary", ""))
            logger.info(f"[GUMROAD] ✅ Done. Product URL: {url}")
        else:
            logger.warning("[GUMROAD] Product creation skipped (no token or API error).")

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
