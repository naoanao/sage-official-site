"""
Gatekeeper v2.0 — SOUL.md連動型アクション承認システム
SOUL.mdの倫理境界線・自律性Tierに基づいてSageのアクションを制御する。
"""
import os
import logging
import json
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# --- SOUL.mdから抽出した絶対禁止アクションリスト ---
ABSOLUTE_DENY_LIST = [
    "charge",           # 課金・決済アクション
    "payment",          # 支払い
    "delete_account",   # アカウント削除
    "export_pii",       # 個人情報エクスポート
    "publish_credentials",  # 認証情報の公開
    "overwrite_soul",   # SOUL.md上書き
    "bypass_gatekeeper",    # Gatekeeper回避
]

# --- Tier定義（SOUL.md Section 6準拠）---
TIER1_AUTO = [
    "blog_generate", "blog_publish", "sns_post", "bluesky_post", "instagram_post",
    "notion_update", "notion_read", "market_scan", "log_write", "cache_update",
    "telegram_notify", "engagement_reply", "content_generate", "image_generate",
    "self_test", "api_monitor_update", "dream_mode", "moltbook_post",
    "heartbeat_ping", "sica_propose",  # 提案のみ（適用はTier3）
]

TIER2_NOTIFY = [
    "product_create", "lp_generate", "email_send", "gumroad_publish",
    "whop_publish", "hashnode_publish", "devto_publish", "new_course_generate",
    "price_update_minor",  # 小幅な価格変更
]

TIER3_APPROVE = [
    "stripe_config_change", "code_apply",  # SICAコード適用
    "account_settings_change", "api_key_add",
    "soul_update", "heartbeat_update",
    "major_deploy", "price_update_major",
    "delete_data", "external_api_new",
]


class Gatekeeper:
    """
    SOUL.md準拠のアクション承認システム。
    - Tier1: 自動実行（確認不要）
    - Tier2: 実行後Telegram通知
    - Tier3: オーナー事前承認が必要
    - 絶対禁止: 常に拒否
    """

    def __init__(self):
        self.enabled = True
        self.sage_stop_path = Path(os.getcwd()) / "SAGE_STOP"
        self.audit_path = Path(os.getcwd()) / "backend" / "logs" / "gatekeeper_audit.jsonl"
        self.audit_path.parent.mkdir(parents=True, exist_ok=True)
        self.deny_count = 0
        self._load_env_overrides()
        logger.info("🛡️ Gatekeeper v2.0 (SOUL.md-linked) initialized.")

    def _load_env_overrides(self):
        """環境変数による上書き設定を読み込む"""
        self.dry_run = os.getenv("SAGE_DRY_RUN", "false").lower() == "true"
        self.strict_mode = os.getenv("GATEKEEPER_STRICT", "true").lower() == "true"

    def _is_sage_stopped(self) -> bool:
        """SAGE_STOPファイルの存在確認（緊急ブレーキ）"""
        return self.sage_stop_path.exists()

    def _classify_tier(self, action_type: str) -> int:
        """アクションのTier分類"""
        action_lower = action_type.lower()
        # 完全一致 or 前方一致で判定
        for allowed in TIER1_AUTO:
            if action_lower == allowed or action_lower.startswith(allowed):
                return 1
        for notify in TIER2_NOTIFY:
            if action_lower == notify or action_lower.startswith(notify):
                return 2
        for approve in TIER3_APPROVE:
            if action_lower == approve or action_lower.startswith(approve):
                return 3
        # 未分類は安全のためTier3扱い
        logger.warning(f"⚠️ Gatekeeper: Unknown action '{action_type}' → Tier3 (require approval)")
        return 3

    def _is_absolute_deny(self, action_type: str) -> bool:
        """絶対禁止アクションチェック（SOUL.md Section 5準拠）"""
        action_lower = action_type.lower()
        for denied in ABSOLUTE_DENY_LIST:
            if denied in action_lower:
                return True
        return False

    def _audit_log(self, action_type: str, details: dict, result: bool, reason: str):
        """セキュリティ監査ログを記録"""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action_type": action_type,
            "details_summary": str(details)[:200],
            "allowed": result,
            "reason": reason,
            "dry_run": self.dry_run,
        }
        try:
            with open(self.audit_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.error(f"Gatekeeper audit log failed: {e}")

    def verify_action(self, action_type: str, details: dict = None) -> bool:
        """
        メインのアクション検証メソッド。
        Returns True → 実行OK / False → 実行拒否
        """
        if details is None:
            details = {}

        # 1. SAGE_STOP緊急ブレーキチェック
        if self._is_sage_stopped():
            reason = "🛑 SAGE_STOP file detected - Emergency brake active"
            logger.warning(f"Gatekeeper BLOCKED: {action_type} — {reason}")
            self._audit_log(action_type, details, False, reason)
            return False

        # 2. 絶対禁止チェック（SOUL.md Section 5）
        if self._is_absolute_deny(action_type):
            reason = f"🚫 ABSOLUTE DENY: '{action_type}' is in SOUL.md hard limits"
            logger.error(f"Gatekeeper BLOCKED: {action_type} — {reason}")
            self._audit_log(action_type, details, False, reason)
            self.deny_count += 1
            if self.deny_count >= 3:
                logger.critical("❗ Gatekeeper: 3+ consecutive absolute denials! Alerting owner...")
                self._alert_owner(action_type, reason)
            return False

        # 3. Tier分類と処理
        tier = self._classify_tier(action_type)

        if tier == 1:
            # Tier1: 自動実行
            if self.dry_run:
                logger.info(f"[DRY RUN] Gatekeeper ALLOWED (Tier1): {action_type}")
                self._audit_log(action_type, details, True, "Tier1-DryRun")
                return True
            logger.info(f"✅ Gatekeeper ALLOWED (Tier1-Auto): {action_type}")
            self._audit_log(action_type, details, True, "Tier1-Auto")
            self.deny_count = 0
            return True

        elif tier == 2:
            # Tier2: 実行OK・事後Telegram通知
            if self.dry_run:
                logger.info(f"[DRY RUN] Gatekeeper ALLOWED (Tier2-Notify): {action_type}")
                self._audit_log(action_type, details, True, "Tier2-DryRun")
                return True
            logger.info(f"✅ Gatekeeper ALLOWED (Tier2-Notify): {action_type} — will notify owner")
            self._notify_owner(action_type, details)
            self._audit_log(action_type, details, True, "Tier2-Notify")
            self.deny_count = 0
            return True

        else:
            # Tier3: オーナー事前承認が必要
            reason = f"🔐 Tier3 action '{action_type}' requires owner approval (SOUL.md Section 6)"
            logger.warning(f"Gatekeeper BLOCKED (Tier3): {action_type} — {reason}")
            self._audit_log(action_type, details, False, reason)
            self._request_approval(action_type, details)
            return False

    def _notify_owner(self, action_type: str, details: dict):
        """Tier2: 実行完了後にオーナーへTelegram通知（非同期）"""
        try:
            from backend.integrations.telegram_bot import TelegramBot
            bot = TelegramBot()
            msg = (
                f"📣 *Sage自律実行通知* (Tier2)\n"
                f"アクション: `{action_type}`\n"
                f"時刻: {datetime.now().strftime('%Y-%m-%d %H:%M JST')}\n"
                f"詳細: {str(details)[:300]}"
            )
            bot.send_message(msg)
        except Exception as e:
            logger.error(f"Gatekeeper Tier2 notification failed: {e}")

    def _request_approval(self, action_type: str, details: dict):
        """Tier3: オーナーに承認リクエストをTelegramで送信"""
        try:
            from backend.integrations.telegram_bot import TelegramBot
            bot = TelegramBot()
            msg = (
                f"🔐 *Sage承認リクエスト* (Tier3)\n"
                f"アクション: `{action_type}`\n"
                f"時刻: {datetime.now().strftime('%Y-%m-%d %H:%M JST')}\n"
                f"詳細: {str(details)[:300]}\n\n"
                f"⚠️ このアクションを許可する場合は、SOUL.mdのTier3ルールに従い手動で実行してください。"
            )
            bot.send_message(msg)
        except Exception as e:
            logger.error(f"Gatekeeper Tier3 approval request failed: {e}")

    def _alert_owner(self, action_type: str, reason: str):
        """緊急アラート: 連続拒否・SOUL.md違反"""
        try:
            from backend.integrations.telegram_bot import TelegramBot
            bot = TelegramBot()
            msg = (
                f"🚨 *Sage緊急アラート*\n"
                f"連続SOUL.md違反を検知しました。\n"
                f"最後の違反: `{action_type}`\n"
                f"理由: {reason}\n"
                f"対処: SAGE_STOPファイルの作成を推奨します。"
            )
            bot.send_message(msg)
        except Exception as e:
            logger.error(f"Gatekeeper emergency alert failed: {e}")


# シングルトンインスタンス
gatekeeper = Gatekeeper()
