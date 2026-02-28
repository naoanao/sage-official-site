import json
import time
import os
import re
import logging
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger("MonetizationMeasure")

LOG_DIR = Path(__file__).parent.parent / "logs"
HISTORY_FILE = LOG_DIR / "monetization_history.jsonl"

# Cache for tag stats (expires after 1 hour)
_tag_stats_cache = {"data": None, "expires_at": None}

class MonetizationMeasure:
    """
    Measures and logs business-related events for the monetization loop.
    Supports tracking:
    - blog_view
    - offer_click
    - sale_recorded
    - sns_post_success
    """
    
    @staticmethod
    def log_event(event_type: str, metadata: dict = None):
        """Logs a monetization event to the history file."""
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        
        entry = {
            "timestamp": time.time(),
            "datetime": datetime.now().isoformat(),
            "event": event_type,
            "metadata": metadata or {}
        }
        
        try:
            with open(HISTORY_FILE, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry) + "\n")
            logger.info(f"📈 MonLog: {event_type} recorded.")
        except Exception as e:
            logger.error(f"Failed to log monetization event: {e}")

    @staticmethod
    def _extract_tags_from_post(slug: str) -> list:
        """Helper to get tags from frontmatter without heavy libraries."""
        try:
            posts_dir = Path(__file__).parent.parent / "files" / "dynamic_site" / "posts"
            # Try both .md and .mdx
            for ext in [".md", ".mdx"]:
                post_path = posts_dir / f"{slug}{ext}"
                if post_path.exists():
                    with open(post_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Extract theme_tags: ["tag1", "tag2"]
                        match = re.search(r'theme_tags:\s*(\[.*?\])', content)
                        if match:
                            return json.loads(match.group(1))
        except Exception:
            pass
        return []

    @staticmethod
    def get_tag_stats():
        """Aggregates views and clicks per theme_tag."""
        if not HISTORY_FILE.exists():
            return {}

        import re
        tag_stats = {} # { "founder_insight": {"views": 0, "clicks": 0}, ... }
        slug_cache = {} # Cache slug -> tags to avoid re-reading files

        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    data = json.loads(line)
                    evt = data.get('event')
                    meta = data.get('metadata', {})
                    slug = meta.get('slug')

                    if not slug or evt not in ['blog_view', 'offer_click']:
                        continue

                    if slug not in slug_cache:
                        slug_cache[slug] = MonetizationMeasure._extract_tags_from_post(slug)

                    tags = slug_cache[slug]
                    for tag in tags:
                        if tag not in tag_stats:
                            tag_stats[tag] = {"views": 0, "clicks": 0}
                        
                        if evt == 'blog_view': tag_stats[tag]["views"] += 1
                        elif evt == 'offer_click': tag_stats[tag]["clicks"] += 1
        except Exception as e:
            logger.error(f"Failed to aggregate tag stats: {e}")

        return tag_stats

    @staticmethod
    def get_stats():
        """Aggregates stats from the history file."""
        if not HISTORY_FILE.exists():
            return {
                "views": 0, "clicks": 0, "sales": 0, "posts": 0,
                "qa_pass": 0, "qa_warn": 0, "contamination_blocked": 0
            }
            
        stats = {
            "views": 0, "clicks": 0, "sales": 0, "posts": 0,
            "qa_pass": 0, "qa_warn": 0, "contamination_blocked": 0
        }
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        data = json.loads(line)
                        evt = data.get('event')
                        if evt == 'blog_view': stats['views'] += 1
                        elif evt == 'offer_click': stats['clicks'] += 1
                        elif evt == 'sale_recorded': stats['sales'] += 1
                        elif evt == 'sns_post_success': stats['posts'] += 1
                        elif evt == 'qa_pass': stats['qa_pass'] += 1
                        elif evt == 'qa_warn': stats['qa_warn'] += 1
                        elif evt == 'contamination_blocked': stats['contamination_blocked'] += 1
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.error(f"Failed to read monetization stats: {e}")
            
        return stats
