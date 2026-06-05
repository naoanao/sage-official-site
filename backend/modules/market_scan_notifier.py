"""
MarketScanNotifier — スキャン結果を Slack / Telegram / Notion に通知し、
                      BlogScheduler の Content Pool に自動投入する。

使い方:
    from backend.modules.market_scan_notifier import MarketScanNotifier
    notifier = MarketScanNotifier()
    notifier.notify_all(scan_result)

チャンネル別の既存API利用:
    Slack     → backend/modules/slack_agent.py        SlackAgent.send_message()
    Telegram  → backend/integrations/telegram_bot.py  TelegramBot.send_message()
    Notion通知 → backend/integrations/notion_logger.py NotionLogger.log_market_scan()
    Blog投入  → backend/integrations/notion_integration.py NotionIntegration.add_to_database()

環境変数:
    SLACK_WEBHOOK_URL         — Slack Incoming Webhook
    TELEGRAM_BOT_TOKEN        — Telegram Bot Token
    TELEGRAM_CHAT_ID          — Telegram Chat/Channel ID
    NOTION_API_KEY            — Notion Integration Token（通知・投入共通）
    NOTION_CONTENT_POOL_DB_ID — BlogScheduler が読む Content Pool DB
"""

import logging
import os
from typing import Any

logger = logging.getLogger("MarketScanNotifier")

# Notion Content Pool に追加するトップN件
BLOG_QUEUE_TOP_N = 1


class MarketScanNotifier:
    def __init__(self) -> None:
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"

    # ── Slack ──────────────────────────────────────────────────────────────

    def notify_slack(self, scan_result: dict[str, Any]) -> bool:
        """トップ3機会を SlackAgent.send_message() で通知する。"""
        try:
            from backend.modules.slack_agent import SlackAgent
            agent = SlackAgent()

            text = self._build_text(scan_result, platform="slack")
            if self.dry_run:
                logger.info(f"[NOTIFIER][DRY_RUN] Slack: {text[:80]}")
                return True

            result = agent.send_message(text)
            ok = result.get("status") == "success"
            if ok:
                logger.info("[NOTIFIER] ✅ Slack notified.")
            else:
                logger.warning(f"[NOTIFIER] Slack failed: {result}")
            return ok
        except Exception as e:
            logger.error(f"[NOTIFIER] Slack error: {e}")
            return False

    # ── Telegram ───────────────────────────────────────────────────────────

    def notify_telegram(self, scan_result: dict[str, Any]) -> bool:
        """トップ3機会を TelegramBot.send_message() で通知する。
        flask_server.py と同じく SAGE_ENABLE_TELEGRAM=1 でゲート。
        """
        if os.getenv("SAGE_ENABLE_TELEGRAM") != "1":
            logger.info("[NOTIFIER] Telegram is disabled (SAGE_ENABLE_TELEGRAM != 1). Skipping.")
            return False

        try:
            from backend.integrations.telegram_bot import TelegramBot
            bot = TelegramBot()

            text = self._build_text(scan_result, platform="telegram")
            if self.dry_run:
                logger.info(f"[NOTIFIER][DRY_RUN] Telegram: {text[:80]}")
                return True

            ok = bot.send_message(text)
            if ok:
                logger.info("[NOTIFIER] ✅ Telegram notified.")
            return ok
        except Exception as e:
            logger.error(f"[NOTIFIER] Telegram error: {e}")
            return False

    # ── Notion（タスク管理DB へ記録） ──────────────────────────────────────

    def notify_notion(self, scan_result: dict[str, Any]) -> bool:
        """
        スキャン結果を NotionLogger.log_market_scan() でタスク管理DBに記録する。
        notion_logger.py の既存パターン（log_course_generation 等）と同一API使用。
        """
        if not os.getenv("NOTION_API_KEY"):
            logger.warning("[NOTIFIER] NOTION_API_KEY missing. Skipping Notion notification.")
            return False

        if self.dry_run:
            opportunities = scan_result.get("opportunities", [])
            logger.info(
                f"[NOTIFIER][DRY_RUN] Notion: Would log scan with "
                f"{len(opportunities)} opportunities to タスク管理DB."
            )
            return True

        try:
            from backend.integrations.notion_logger import notion_logger
            notion_logger.log_market_scan(scan_result)
            logger.info("[NOTIFIER] ✅ Notion (タスク管理DB) notified.")
            return True
        except Exception as e:
            logger.error(f"[NOTIFIER] Notion error: {e}")
            return False

    # ── Notion Content Pool（BlogScheduler キューへ追加） ──────────────────

    def queue_to_blog(self, scan_result: dict[str, Any]) -> bool:
        """
        トップ機会を NotionIntegration.add_to_database() で
        Content Pool DB に追加する。BlogScheduler が次のサイクルで記事化。
        """
        db_id = os.getenv("NOTION_CONTENT_POOL_DB_ID")
        if not db_id or not os.getenv("NOTION_API_KEY"):
            logger.warning("[NOTIFIER] NOTION_CONTENT_POOL_DB_ID or NOTION_API_KEY missing. Skipping blog queue.")
            return False

        opportunities = scan_result.get("opportunities", [])
        if not opportunities:
            logger.info("[NOTIFIER] No opportunities to queue for blog.")
            return False

        try:
            from backend.integrations.notion_integration import NotionIntegration
            notion = NotionIntegration()
            added = 0

            for opp in opportunities[:BLOG_QUEUE_TOP_N]:
                topic = opp.get("product_idea") or opp.get("keyword", "")
                score = opp.get("total_score", 0)
                reason = opp.get("reason", "")
                keyword = opp.get("keyword", "")

                properties = {
                    "Topic": {"title": [{"text": {"content": topic}}]},
                    "Status": {"select": {"name": "予約済み"}},
                    "Category": {"select": {"name": "blog"}},
                }
                content = (
                    f"[MarketScan Auto-Queue]\n"
                    f"Keyword: {keyword}\n"
                    f"Score: {score:.1f}/10\n"
                    f"Reason: {reason}"
                )

                if self.dry_run:
                    logger.info(f"[NOTIFIER][DRY_RUN] BlogQueue: Would add '{topic}' to Content Pool.")
                    added += 1
                    continue

                result = notion.add_to_database(db_id, properties, content=content)
                if result:
                    logger.info(f"[NOTIFIER] ✅ BlogQueue: Added '{topic}' to Content Pool.")
                    added += 1
                else:
                    logger.warning(f"[NOTIFIER] BlogQueue: Failed to add '{topic}'.")

            return added > 0

        except Exception as e:
            logger.error(f"[NOTIFIER] BlogQueue error: {e}")
            return False

    # ── All channels ───────────────────────────────────────────────────────

    def notify_all(self, scan_result: dict[str, Any]) -> dict[str, bool]:
        """
        Slack / Telegram / Notion（通知）/ BlogQueue（Content Pool）に一斉送信する。

        Returns:
            {"slack": bool, "telegram": bool, "notion": bool, "blog_queue": bool}
        """
        logger.info("[NOTIFIER] Sending notifications to all channels...")
        results = {
            "slack":      self.notify_slack(scan_result),
            "telegram":   self.notify_telegram(scan_result),
            "notion":     self.notify_notion(scan_result),
            "blog_queue": self.queue_to_blog(scan_result),
        }
        succeeded = [k for k, v in results.items() if v]
        logger.info(f"[NOTIFIER] Done. Succeeded: {succeeded}")
        return results

    # ── Message builder ────────────────────────────────────────────────────

    def _build_text(self, scan_result: dict[str, Any], platform: str = "slack") -> str:
        """Slack / Telegram 共通のメッセージ文字列を生成する。"""
        opportunities = scan_result.get("opportunities", [])
        scanned_at = scan_result.get("scanned_at", "")[:10]
        total = scan_result.get("total_signals", 0)

        if platform == "telegram":
            header = f"📊 *SAGE 市場スキャン結果* ({scanned_at})\n総シグナル数: {total}\n\n"
        else:
            header = f"*📊 SAGE 市場スキャン結果* ({scanned_at}) | 総シグナル: {total}\n\n"

        lines = [header]
        for opp in opportunities[:3]:
            rank = opp.get("rank", "?")
            keyword = opp.get("keyword", "")
            idea = opp.get("product_idea", "")
            score = opp.get("total_score", 0)
            demand = opp.get("demand_score", "-")
            comp = opp.get("competition_score", "-")
            ai_gen = opp.get("ai_generability", "-")
            reason = opp.get("reason", "")

            lines.append(
                f"*#{rank}* [{score:.1f}/10] {keyword}\n"
                f"  💡 {idea}\n"
                f"  需要:{demand} 競合希少:{comp} AI生成:{ai_gen}\n"
                f"  _{reason}_"
            )
            lines.append("\n")

        return "\n".join(lines)
