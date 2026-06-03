"""
note_schedulerにnote_publisher連携を追加するパッチ。
save_draft_to_note()の代わりにnote_publisher.post_note_draft()を試み、
失敗した場合はfallbackとしてpending_reviewで保存する。
"""
import ast

path = "backend/scheduler/note_scheduler.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''        note_result = save_draft_to_note(title, body)
        status = note_result["status_code"]

        if status in (200, 201):
            logger.info(f"[NoteScheduler] Draft saved to note.com")
        elif status == 0:
            logger.info(f"[NoteScheduler] note API skipped (no token)")
        else:
            logger.warning(f"[NoteScheduler] note API returned {status}")

        notify_line(title, body, category)
        _save_draft_locally(day, title, body, category, note_result)

        return {
            "day": day,
            "title": title,
            "category": category,
            "note_status": status,
            "line_notified": bool(LINE_NOTIFY_TOKEN),
        }'''

new = '''        # ── note_publisher経由で自動投稿を試みる ──────────────────────
        pub_result = None
        try:
            from backend.integrations.note_publisher import post_note_draft as _pub
            pub_result = _pub(title, body, publish=False)
            if pub_result.get("key"):
                logger.info(f"[NoteScheduler] ✅ 自動投稿成功: {pub_result.get('url')}")
                note_result = {"status_code": 201, "response": pub_result}
                status = 201
            else:
                raise RuntimeError(pub_result.get("error", "unknown"))
        except Exception as pub_err:
            # fallback: 旧APIまたはpending_reviewとして保存
            logger.warning(f"[NoteScheduler] note_publisher失敗、fallback: {pub_err}")
            note_result = save_draft_to_note(title, body)
            status = note_result["status_code"]
            if status in (200, 201):
                logger.info(f"[NoteScheduler] Draft saved to note.com (fallback API)")
            else:
                logger.info(f"[NoteScheduler] pending_reviewとして保存 (手動投稿待ち)")

        notify_line(title, body, category)
        _save_draft_locally(day, title, body, category, note_result)

        return {
            "day": day,
            "title": title,
            "category": category,
            "note_status": status,
            "auto_published": bool(pub_result and pub_result.get("key")),
            "line_notified": bool(LINE_NOTIFY_TOKEN),
        }'''

if old in content:
    content = content.replace(old, new, 1)
    print("✅ Patch applied: note_publisher連携を追加")
else:
    print("❌ Patch FAILED — old string not found")
    import sys; sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

ast.parse(content)
print("✅ Syntax OK")
