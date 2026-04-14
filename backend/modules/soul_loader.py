"""
SoulLoader v1.0 — SOUL.mdを読み込み、Sageの全モジュールで参照できる形に変換する。
セッションをまたいで一貫したSageの人格・倫理境界を保つための基盤モジュール。
"""
import os
import re
import logging
from pathlib import Path
from typing import Optional
from functools import lru_cache

logger = logging.getLogger(__name__)

# SOUL.mdのパス（プロジェクトルート直下）
SOUL_PATH = Path(os.getcwd()) / "SOUL.md"
HEARTBEAT_PATH = Path(os.getcwd()) / "HEARTBEAT.md"


class SageSOUL:
    """
    SOUL.mdから読み込んだSageのアイデンティティ情報。
    すべてのモジュールはこのオブジェクトを通して人格・倫理境界を参照する。
    """

    def __init__(self):
        self.raw_content: str = ""
        self.identity: dict = {}
        self.mission: str = ""
        self.core_values: list[str] = []
        self.hard_limits: list[str] = []
        self.autonomy_tier1: list[str] = []
        self.autonomy_tier2: list[str] = []
        self.autonomy_tier3: list[str] = []
        self.tone_external: str = ""
        self.tone_internal: str = ""
        self.forbidden_phrases: list[str] = []
        self.loaded: bool = False

    def load(self, soul_path: Path = SOUL_PATH) -> bool:
        """SOUL.mdを読み込んでパースする"""
        try:
            if not soul_path.exists():
                logger.warning(f"⚠️ SOUL.md not found at {soul_path}. Using defaults.")
                self._load_defaults()
                return False

            with open(soul_path, "r", encoding="utf-8") as f:
                self.raw_content = f.read()

            self._parse()
            self.loaded = True
            logger.info(f"✨ SOUL.md loaded successfully from {soul_path}")
            return True

        except Exception as e:
            logger.error(f"SoulLoader: Failed to load SOUL.md — {e}")
            self._load_defaults()
            return False

    def _parse(self):
        """SOUL.mdの主要セクションをパースする"""
        content = self.raw_content

        # 基本アイデンティティ
        self.identity = {
            "name": self._extract_value(content, r"名前:\s*(.+)") or "Sage",
            "version": self._extract_value(content, r"バージョン:\s*(.+)") or "4.0",
            "essence": self._extract_value(content, r"本質:\s*(.+)") or "AI分身",
            "brand_name": self._extract_value(content, r"brand_name[:\s]+(.+)") or "Sage AI",
        }

        # ミッション
        mission_match = re.search(r"メインミッション.*?>\s*(.+?)(?:\n|$)", content)
        if mission_match:
            self.mission = mission_match.group(1).strip()
        else:
            self.mission = "AI×自動化でソロプレナーの時間の壁を破壊し、24時間稼働する知的分身を世界中に届ける。"

        # 禁止表現リスト
        forbidden_section = self._extract_section(content, "禁止表現")
        if forbidden_section:
            self.forbidden_phrases = re.findall(r"- (.+)", forbidden_section)

        # ハードリミット（絶対禁止）
        limits_section = self._extract_section(content, "ABSOLUTE LIMITS")
        if limits_section:
            self.hard_limits = re.findall(r"\d+\.\s+(.+)", limits_section)

        # コアバリュー
        values_section = self._extract_section(content, "価値観・信念")
        if values_section:
            self.core_values = re.findall(r"###\s+[^\n]+\((.+?)\)", values_section)

        logger.debug(f"SOUL parsed: identity={self.identity['name']}, values={self.core_values}")

    def _extract_value(self, content: str, pattern: str) -> Optional[str]:
        """正規表現で値を抽出"""
        match = re.search(pattern, content)
        return match.group(1).strip() if match else None

    def _extract_section(self, content: str, section_title: str) -> Optional[str]:
        """セクション名でブロックを抽出"""
        pattern = rf"#{1,3}\s*[^\n]*{re.escape(section_title)}[^\n]*\n(.*?)(?=\n#{1,3}\s|\Z)"
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        return match.group(1).strip() if match else None

    def _load_defaults(self):
        """SOUL.mdが見つからない場合のデフォルト値"""
        self.identity = {
            "name": "Sage",
            "version": "4.0",
            "essence": "AI monetization expert",
            "brand_name": "Sage AI",
        }
        self.mission = "Help solopreneurs build passive income with AI automation."
        self.core_values = ["Integrity", "Intellectual Curiosity", "User-Centricity", "Autonomous Accountability"]
        self.hard_limits = [
            "Do not execute payment actions without owner approval",
            "Do not store PII in plain text",
            "Do not post defamatory content",
            "Do not violate copyright",
            "Respect SAGE_STOP file",
        ]
        self.forbidden_phrases = ["完璧", "絶対", "100%保証", "guaranteed"]
        self.loaded = False

    def get_system_prompt(self) -> str:
        """
        すべてのLLM呼び出しに注入する「Sageの人格プロンプト」を生成。
        これによってセッションをまたいで一貫したSageの声が保たれる。
        """
        limits_text = "\n".join(f"- {l}" for l in self.hard_limits[:5])
        values_text = ", ".join(self.core_values) if self.core_values else "Integrity, Curiosity"

        return f"""You are {self.identity.get('name', 'Sage')} v{self.identity.get('version', '4.0')}, an autonomous AI assistant specialized in AI-powered monetization and automation for solopreneurs.

MISSION: {self.mission}

CORE VALUES: {values_text}

ABSOLUTE LIMITS (never violate):
{limits_text}

TONE: Professional yet approachable. Data-driven. Give hope and actionable insights.
LANGUAGE: Respond in the same language as the input (English or Japanese).
IDENTITY: You are Sage AI - a digital twin that works 24/7 to grow the owner's business.
Always maintain this identity consistently across all sessions."""

    def check_content_safety(self, content: str) -> tuple[bool, str]:
        """
        コンテンツがSOUL.mdの禁止表現・ハードリミットに違反していないかチェック。
        Returns: (is_safe: bool, reason: str)
        """
        content_lower = content.lower()

        # 禁止表現チェック
        for phrase in self.forbidden_phrases:
            if phrase.lower() in content_lower:
                return False, f"Forbidden phrase detected: '{phrase}'"

        # 基本的な安全チェック
        dangerous_patterns = [
            r'\b(?:api[_-]?key|secret[_-]?key|password|token)\s*[:=]\s*\S+',
            r'-----BEGIN\s+(?:RSA\s+)?PRIVATE KEY',
        ]
        import re
        for pattern in dangerous_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return False, "Potential credential/key leakage detected"

        return True, "OK"

    def __repr__(self):
        return f"<SageSOUL name={self.identity.get('name')} version={self.identity.get('version')} loaded={self.loaded}>"


@lru_cache(maxsize=1)
def load_soul() -> SageSOUL:
    """シングルトンのSageSOULオブジェクトを返す（キャッシュ済み）"""
    soul = SageSOUL()
    soul.load()
    return soul


def reload_soul() -> SageSOUL:
    """SOUL.mdを再読み込みする（SOUL.mdを更新した場合に使用）"""
    load_soul.cache_clear()
    return load_soul()
