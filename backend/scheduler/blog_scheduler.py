"""
Sage Blog Auto-Scheduler
- Pulls topics from Notion Content Pool (Category=blog, Status=予約済み)
- Generates English Markdown article via Groq (llama-3.3-70b-versatile)
- Saves to src/blog/posts/YYYY-MM-DD-{slug}.mdx with frontmatter
- git add → commit → push
- Updates Notion status to 完了
- Adds Bluesky post to SNS job queue with blog URL
"""

import os
import json
import logging
import re
import subprocess
from datetime import datetime, timezone

logger = logging.getLogger("BlogScheduler")

GROQ_MODEL = "llama-3.3-70b-versatile"
POSTS_DIR = "src/blog/posts"
JOBS_FILE = "backend/data/jobs.json"
SAGE_BASE_URL = os.getenv("SAGE_BASE_URL", "https://sage-official-site.pages.dev")


class BlogScheduler:
    def __init__(self):
        from groq import Groq
        from backend.modules.notion_content_pool import NotionContentPool

        self.groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.notion = NotionContentPool()
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        logger.info(f"[BLOG] BlogScheduler initialized. dry_run={self.dry_run}")

    # ── Notion helpers ────────────────────────────────────────────────────────

    def _get_blog_topics(self, limit: int = 1) -> list:
        """Return Notion items with Category=blog and Status=予約済み|Ready."""
        import requests as _requests

        token = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
        db_id = os.getenv("NOTION_CONTENT_POOL_DB_ID")
        if not token or not db_id:
            logger.error("[BLOG] NOTION_API_KEY or NOTION_CONTENT_POOL_DB_ID missing")
            return []

        headers = {
            "Authorization": f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }
        query_body = {
            "filter": {
                "and": [
                    {
                        "or": [
                            {"property": "Status", "select": {"equals": "予約済み"}},
                            {"property": "Status", "select": {"equals": "Ready"}},
                        ]
                    },
                    {
                        "or": [
                            {"property": "Category", "select": {"equals": "blog"}},
                            {"property": "Category", "select": {"equals": "Blog"}},
                        ]
                    },
                ]
            },
            "page_size": limit,
        }
        try:
            resp = _requests.post(
                f"https://api.notion.com/v1/databases/{db_id}/query",
                headers=headers,
                json=query_body,
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json().get("results", [])
        except Exception as e:
            logger.error(f"[BLOG] Notion query failed: {e}")
            return []

    def _update_notion_status(self, page_id: str, status: str) -> None:
        import requests as _requests

        token = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
        headers = {
            "Authorization": f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }
        try:
            _requests.patch(
                f"https://api.notion.com/v1/pages/{page_id}",
                headers=headers,
                json={"properties": {"Status": {"select": {"name": status}}}},
                timeout=10,
            )
            logger.info(f"[BLOG] Notion page {page_id} status → {status}")
        except Exception as e:
            logger.error(f"[BLOG] Notion status update failed: {e}")

    # ── Article generation ────────────────────────────────────────────────────

    def _extract_topic(self, notion_page: dict) -> str:
        props = notion_page.get("properties", {})
        for key in ("Topic", "Name", "Title", "Content", "テーマ", "タイトル"):
            prop = props.get(key, {})
            # title type
            if prop.get("type") == "title":
                rich = prop.get("title", [])
                if rich:
                    return rich[0].get("plain_text", "")
            # rich_text type
            if prop.get("type") == "rich_text":
                rich = prop.get("rich_text", [])
                if rich:
                    return rich[0].get("plain_text", "")
        return ""

    def _generate_article(self, topic: str) -> dict:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        slug_base = re.sub(r"[^a-z0-9]+", "-", topic.lower())[:50].strip("-")
        slug = f"{today}-{slug_base}"

        system_prompt = (
            "You are Sage AI, a world-class content writer specializing in AI, "
            "solopreneurship, and monetization. Write compelling, SEO-optimized "
            "English blog posts. Always use clear headings, real examples, and "
            "actionable takeaways."
        )
        user_prompt = f"""Write a detailed blog post (1500+ words) on the topic: "{topic}"

Return ONLY valid Markdown with this exact frontmatter at the top:
---
title: "TITLE_HERE"
date: "{today}"
slug: "{slug}"
excerpt: "ONE SENTENCE SUMMARY"
keywords: "keyword1, keyword2, keyword3"
author: "Sage AI"
---

Then write the full article body in Markdown. Use ## for sections, include bullet lists and a strong CTA at the end linking to /shop."""

        resp = self.groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=3000,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content.strip()

        # Extract actual title from frontmatter for nicer slug
        title_match = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', raw, re.MULTILINE)
        title = title_match.group(1) if title_match else topic

        return {"slug": slug, "title": title, "body": raw, "date": today}

    # ── File / git helpers ────────────────────────────────────────────────────

    def _save_mdx(self, article: dict) -> str:
        os.makedirs(POSTS_DIR, exist_ok=True)
        filename = f"{article['slug']}.mdx"
        filepath = os.path.join(POSTS_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(article["body"])
        logger.info(f"[BLOG] Saved: {filepath}")
        return filepath

    def _git_push(self, filepath: str, title: str) -> bool:
        try:
            subprocess.run(["git", "add", filepath], check=True)
            subprocess.run(
                ["git", "commit", "-m", f"feat: auto-publish blog post '{title}'"],
                check=True,
            )
            subprocess.run(["git", "push", "origin", "main"], check=True)
            logger.info("[BLOG] git push complete.")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"[BLOG] git error: {e}")
            return False

    # ── SNS queue helper ──────────────────────────────────────────────────────

    def _queue_sns_post(self, title: str, slug: str) -> None:
        url = f"{SAGE_BASE_URL}/blog/{slug}"
        bs_text = f"📖 New post: {title}\n{url}"
        job = {
            "id": f"blog_{slug}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "type": "pr_post",
            "targets": ["bluesky"],
            "topic": title,
            "ig_caption": "",
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
        logger.info(f"[BLOG] Queued SNS post for blog: {url}")

    # ── Main ──────────────────────────────────────────────────────────────────

    def run_once(self) -> None:
        logger.info("[BLOG] run_once() started.")
        items = self._get_blog_topics(limit=1)
        if not items:
            logger.info("[BLOG] No blog topics in Notion queue. Idle.")
            return

        page = items[0]
        page_id = page["id"]
        topic = self._extract_topic(page)
        if not topic:
            logger.warning("[BLOG] Could not extract topic from Notion page.")
            return

        logger.info(f"[BLOG] Generating article for: '{topic}'")

        if self.dry_run:
            logger.info(f"[BLOG][DRY_RUN] Would generate article for '{topic}'. Skipping.")
            return

        article = self._generate_article(topic)
        filepath = self._save_mdx(article)
        pushed = self._git_push(filepath, article["title"])

        if pushed:
            self._update_notion_status(page_id, "完了")
            self._queue_sns_post(article["title"], article["slug"])
            logger.info(f"[BLOG] ✅ Article published: {article['slug']}")
        else:
            logger.error("[BLOG] git push failed. Notion status not updated.")

    def run(self) -> None:
        """Background loop: runs at JST 09:00 (UTC 00:00) daily."""
        import time
        logger.info("[BLOG] BlogScheduler background loop started.")
        while True:
            try:
                now_utc = datetime.now(timezone.utc)
                if now_utc.hour == 0 and now_utc.minute < 5:
                    self.run_once()
                    time.sleep(300)  # prevent double-run within the same hour
                else:
                    time.sleep(60)
            except Exception as e:
                logger.error(f"[BLOG] Loop error: {e}")
                time.sleep(60)
