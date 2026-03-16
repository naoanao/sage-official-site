"""
EngagementBot — Bluesky & Instagram AI engagement automation.

Schedule: 3x/day (08:00, 14:00, 20:00 JST)

Bluesky:
  - Like-back when someone likes your post
  - AI empathy reply to replies/mentions

Instagram:
  - AI empathy reply to comments on your own posts

Language: auto-detect (Japanese ↔ English) and reply in same language.
"""

import os
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("EngagementBot")

# ── Persistence: store processed notification/comment IDs ──────────────────
_STATE_FILE = Path(__file__).parent.parent.parent / "logs" / "engagement_state.json"


def _load_state() -> dict:
    try:
        if _STATE_FILE.exists():
            return json.loads(_STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"seen_notifs": [], "replied_comments": []}


def _save_state(state: dict):
    try:
        _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        _STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        logger.warning(f"Failed to save engagement state: {e}")


# ── Language helpers ────────────────────────────────────────────────────────

def _detect_language(text: str) -> str:
    """Returns 'ja' if text contains Japanese characters, else 'en'."""
    return "ja" if any(ord(c) > 0x3000 for c in text) else "en"


def _generate_reply(groq_client, text: str, author: str, context: str = "social media") -> str:
    """Generate an empathetic, on-brand reply using Groq."""
    lang = _detect_language(text)

    if lang == "ja":
        system = (
            "あなたは Sage AI の公式アカウントです。"
            "ユーザーのコメントやリプライに対して、共感を示しながら自然で温かい日本語で返信してください。"
            "2〜3文以内で簡潔に。絵文字を1〜2個使ってOK。宣伝文句は不要。"
        )
        user_prompt = (
            f"以下のコメントに対して、共感と感謝を込めた返信を生成してください。\n\n"
            f"コメント by @{author}:\n{text}"
        )
    else:
        system = (
            "You are the official Sage AI account. "
            "Reply to user comments and mentions with genuine empathy and warmth. "
            "Keep it 2-3 sentences max. 1-2 emojis are fine. No sales pitches."
        )
        user_prompt = (
            f"Generate an empathetic, friendly reply to this comment.\n\n"
            f"Comment by @{author}:\n{text}"
        )

    try:
        response = groq_client.invoke(f"[SYSTEM]\n{system}\n\n[USER]\n{user_prompt}")
        content = response.content if hasattr(response, "content") else str(response)
        return content.strip()
    except Exception as e:
        logger.warning(f"Reply generation failed: {e}")
        # Graceful fallback
        if lang == "ja":
            return f"@{author} ありがとうございます！とても嬉しいです 🙌"
        else:
            return f"@{author} Thank you so much for your comment! Really appreciate it 🙌"


# ══════════════════════════════════════════════════════════════════════════════
# Bluesky Engagement
# ══════════════════════════════════════════════════════════════════════════════

def run_bluesky_engagement(bluesky_client, groq_client, state: dict) -> dict:
    """
    Process Bluesky notifications:
      - 'like'    → like the author's most recent post (like-back)
      - 'reply'   → generate AI empathy reply
      - 'mention' → generate AI empathy reply
    Returns updated state.
    """
    if not bluesky_client or getattr(bluesky_client, "mock_mode", True):
        logger.info("[Bluesky Engagement] Skipped — mock mode or not connected")
        return state

    seen = set(state.get("seen_notifs", []))

    try:
        # Fetch latest 50 notifications
        resp = bluesky_client.client.app.bsky.notification.list_notifications({"limit": 50})
        notifications = resp.notifications if hasattr(resp, "notifications") else []
    except Exception as e:
        logger.error(f"[Bluesky] Failed to fetch notifications: {e}")
        return state

    new_seen = set()

    for notif in notifications:
        notif_cid = getattr(notif, "cid", None) or str(notif)
        if notif_cid in seen:
            continue  # already processed

        notif_type = getattr(notif, "reason", "")
        author_handle = getattr(getattr(notif, "author", None), "handle", "unknown")
        new_seen.add(notif_cid)

        # ── Like-back ────────────────────────────────────────────────────
        if notif_type == "like":
            try:
                feed_resp = bluesky_client.client.app.bsky.feed.get_author_feed(
                    {"actor": author_handle, "limit": 1}
                )
                feed = getattr(feed_resp, "feed", [])
                if feed:
                    post = feed[0].post
                    bluesky_client.client.app.bsky.feed.like(
                        {"subject": {"uri": post.uri, "cid": post.cid}}
                    )
                    logger.info(f"[Bluesky] ❤️  Liked back @{author_handle}'s post")
                time.sleep(1)  # Polite rate limit
            except Exception as e:
                logger.warning(f"[Bluesky] Like-back failed for @{author_handle}: {e}")

        # ── AI Reply to reply/mention ─────────────────────────────────────
        elif notif_type in ("reply", "mention"):
            try:
                record = getattr(notif, "record", None)
                comment_text = getattr(record, "text", "") if record else ""
                if not comment_text:
                    continue

                reply_text = _generate_reply(groq_client, comment_text, author_handle)

                # Build reply reference
                reply_ref = {
                    "root": {"uri": notif.uri, "cid": notif.cid},
                    "parent": {"uri": notif.uri, "cid": notif.cid},
                }
                bluesky_client.client.send_post(text=reply_text, reply_to=reply_ref)
                logger.info(f"[Bluesky] 💬 Replied to @{author_handle}: {reply_text[:60]}...")
                time.sleep(2)
            except Exception as e:
                logger.warning(f"[Bluesky] Reply failed for @{author_handle}: {e}")

    state["seen_notifs"] = list(seen | new_seen)
    # Keep only last 500 to prevent file bloat
    state["seen_notifs"] = state["seen_notifs"][-500:]
    logger.info(f"[Bluesky] Engagement cycle done. Processed {len(new_seen)} new notifications.")
    return state


# ══════════════════════════════════════════════════════════════════════════════
# Instagram Engagement
# ══════════════════════════════════════════════════════════════════════════════

def _instagram_like_comment(base_url: str, comment_id: str, access_token: str) -> bool:
    """Like a single Instagram comment. Returns True on success."""
    import requests
    try:
        resp = requests.post(
            f"{base_url}/{comment_id}/likes",
            data={"access_token": access_token},
            timeout=15,
        )
        return resp.status_code == 200 and resp.json().get("success", False)
    except Exception as e:
        logger.warning(f"[Instagram] Like comment {comment_id} failed: {e}")
        return False


def run_instagram_engagement(groq_client, state: dict) -> dict:
    """
    For each comment on own posts:
      1. ❤️  Like the comment  (POST /{comment-id}/likes)
      2. 💬 AI empathy reply   (POST /{comment-id}/replies)
    Uses Instagram Graph API (Business/Creator account).
    """
    import requests

    access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    account_id = os.getenv("INSTAGRAM_ACCOUNT_ID")
    api_version = "v18.0"
    base_url = f"https://graph.facebook.com/{api_version}"

    if not access_token or not account_id:
        logger.info("[Instagram Engagement] Skipped — credentials not set")
        return state

    replied = set(state.get("replied_comments", []))
    liked  = set(state.get("liked_comments", []))

    try:
        # Get recent posts (limit 10)
        media_resp = requests.get(
            f"{base_url}/{account_id}/media",
            params={"fields": "id,caption,timestamp", "limit": 10,
                    "access_token": access_token},
            timeout=15,
        )
        media_resp.raise_for_status()
        posts = media_resp.json().get("data", [])
    except Exception as e:
        logger.error(f"[Instagram] Failed to fetch media: {e}")
        return state

    new_replied = set()
    new_liked   = set()

    for post in posts:
        post_id = post.get("id")
        try:
            comments_resp = requests.get(
                f"{base_url}/{post_id}/comments",
                params={"fields": "id,text,username,timestamp", "limit": 20,
                        "access_token": access_token},
                timeout=15,
            )
            comments_resp.raise_for_status()
            comments = comments_resp.json().get("data", [])
        except Exception as e:
            logger.warning(f"[Instagram] Failed to fetch comments for {post_id}: {e}")
            continue

        for comment in comments:
            cid      = comment.get("id")
            username = comment.get("username", "user")
            comment_text = comment.get("text", "").strip()

            if not cid or not comment_text:
                continue

            # Skip own account to avoid self-like / reply loops
            our_account_keywords = ["sage", "sageai"]
            is_own = any(kw in username.lower() for kw in our_account_keywords)
            if is_own:
                new_liked.add(cid)
                new_replied.add(cid)
                continue

            # ── Step 1: Like the comment ──────────────────────────────────
            if cid not in liked:
                ok = _instagram_like_comment(base_url, cid, access_token)
                if ok:
                    new_liked.add(cid)
                    logger.info(f"[Instagram] ❤️  Liked comment by @{username}")
                time.sleep(0.8)

            # ── Step 2: AI reply to the comment ──────────────────────────
            if cid not in replied:
                try:
                    reply_text = _generate_reply(groq_client, comment_text, username,
                                                 context="instagram")
                    requests.post(
                        f"{base_url}/{cid}/replies",
                        data={"message": reply_text, "access_token": access_token},
                        timeout=15,
                    )
                    new_replied.add(cid)
                    logger.info(f"[Instagram] 💬 Replied to @{username}: {reply_text[:60]}...")
                    time.sleep(1.5)
                except Exception as e:
                    logger.warning(f"[Instagram] Reply failed for comment {cid}: {e}")

    state["replied_comments"] = list((replied | new_replied))[-1000:]
    state["liked_comments"]   = list((liked   | new_liked))[-1000:]
    logger.info(
        f"[Instagram] Engagement cycle done. "
        f"Liked {len(new_liked)} / Replied {len(new_replied)} new comments."
    )
    return state


# ══════════════════════════════════════════════════════════════════════════════
# Main runner (called by Flask scheduler thread)
# ══════════════════════════════════════════════════════════════════════════════

class EngagementBot:
    """
    Runs Bluesky + Instagram engagement cycles 3x per day.
    Trigger times (JST): 08:00, 14:00, 20:00
    """
    TRIGGER_HOURS_JST = {8, 14, 20}
    JST_OFFSET = 9  # hours ahead of UTC

    def __init__(self, bluesky_client=None, groq_client=None):
        self.bluesky = bluesky_client
        self.groq = groq_client
        self._last_run_date: str | None = None  # "YYYY-MM-DD-HH" to prevent double-run

    def should_run_now(self) -> bool:
        """Returns True if current JST hour is a trigger hour and hasn't run yet this hour."""
        now_utc = datetime.now(timezone.utc)
        jst_hour = (now_utc.hour + self.JST_OFFSET) % 24
        jst_date = now_utc.strftime("%Y-%m-%d")
        run_key = f"{jst_date}-{jst_hour:02d}"

        if jst_hour in self.TRIGGER_HOURS_JST and run_key != self._last_run_date:
            return True
        return False

    def run_cycle(self):
        """Run one full engagement cycle (Bluesky + Instagram)."""
        now_utc = datetime.now(timezone.utc)
        jst_hour = (now_utc.hour + self.JST_OFFSET) % 24
        jst_date = now_utc.strftime("%Y-%m-%d")
        self._last_run_date = f"{jst_date}-{jst_hour:02d}"

        logger.info(f"[EngagementBot] 🤝 Starting engagement cycle (JST {jst_hour:02d}:00)")
        state = _load_state()

        # Bluesky
        try:
            state = run_bluesky_engagement(self.bluesky, self.groq, state)
        except Exception as e:
            logger.error(f"[EngagementBot] Bluesky cycle error: {e}")

        # Instagram
        try:
            state = run_instagram_engagement(self.groq, state)
        except Exception as e:
            logger.error(f"[EngagementBot] Instagram cycle error: {e}")

        _save_state(state)
        logger.info("[EngagementBot] ✅ Engagement cycle complete")
