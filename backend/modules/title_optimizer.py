"""
TitleOptimizer - GitMind 5技法でセクションタイトルを自動最適化。

5技法:
  1. Number    - 数字を含める ("Top 5", "3 Steps", "47%の人が")
  2. Authority - 一次情報源を引用 ("Pentagon Confirmed", "Congressional Testimony")
  3. Specific  - 固有名詞・日付・場所を入れる ("2026年2月25日 Hegseth発言")
  4. Bracket   - 【 】または [ ] でラベルを付ける
  5. Benefit   - 読者が得るものを明示 ("〜する方法", "How to〜")
"""

import logging
import random

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────
# Technique templates (English)
# ──────────────────────────────────────────
_EN_TEMPLATES = {
    "number": [
        "Top {n} {title}",
        "{n} Key Facts About {title}",
        "{n} Steps to Understand {title}",
        "{n}% of Americans Don't Know This About {title}",
    ],
    "authority": [
        "[Pentagon Confirmed] {title}",
        "[Congressional Record] {title}",
        "[Declassified 2026] {title}",
        "[Whistleblower Testimony] {title}",
    ],
    "specific": [
        "{title}: What the 2026 Disclosure Order Really Means",
        "{title} - The Evidence from AARO's 2,000+ Open Cases",
        "{title}: From Roswell (1947) to Trump's Executive Order (2026)",
        "{title} - What Jeffrey Nuccetelli & David Grusch Actually Said",
    ],
    "bracket": [
        "【Classified Intel】{title}",
        "[MUST READ] {title}",
        "【2026 Update】{title}",
        "[Breaking] {title}",
    ],
    "benefit": [
        "How to {title}: A Step-by-Step Action Guide",
        "{title}: What You Can Do Starting Today",
        "Understanding {title} - Your Competitive Advantage",
        "{title}: The Knowledge That Puts You Ahead",
    ],
}

# ──────────────────────────────────────────
# Technique templates (Japanese)
# ──────────────────────────────────────────
_JA_TEMPLATES = {
    "number": [
        "知らないと損する{n}つの{title}",
        "{title}：押さえるべき{n}つのポイント",
        "{n}分でわかる{title}入門",
        "{title}で失敗する人の{n}つの共通点",
    ],
    "authority": [
        "【ペンタゴン確認済み】{title}",
        "【議会証言より】{title}",
        "【機密解除2026】{title}",
        "【内部告発者証言】{title}",
    ],
    "specific": [
        "{title}：Trump大統領令（2026年2月）が変えたこと",
        "{title}：AARO調査2000件超から見えてきた真実",
        "{title}：1947年ロズウェルから2026年開示命令まで",
        "{title}：Nuccetelli・Gruschが実際に語ったこと",
    ],
    "bracket": [
        "【極秘情報】{title}",
        "【必読】{title}",
        "【2026年最新】{title}",
        "【速報】{title}",
    ],
    "benefit": [
        "{title}を活用する具体的な方法",
        "今日からできる{title}入門",
        "{title}をマスターして一歩先へ",
        "{title}：知識を収益に変える行動計画",
    ],
}


class TitleOptimizer:
    """
    LLMなしでルールベースにタイトルを最適化する。
    各タイトルに5技法のいずれかを適用し、キャッチコピーとして強化する。
    """

    def __init__(self, topic: str = "", language: str = "en"):
        self.topic = topic
        self.language = language
        self._templates = _JA_TEMPLATES if language == "ja" else _EN_TEMPLATES
        self._numbers = [3, 5, 7, 10, 47, 12]

    def _pick_technique(self, title: str, index: int) -> str:
        """インデックスに基づいて技法を選択（全タイトルで技法が分散するように）"""
        techniques = list(self._templates.keys())
        return techniques[index % len(techniques)]

    def optimize_title(self, title: str, index: int = 0) -> str:
        """1タイトルを最適化して返す"""
        technique = self._pick_technique(title, index)
        template = random.choice(self._templates[technique])
        n = random.choice(self._numbers)

        try:
            optimized = template.format(title=title, n=n)
            logger.debug(f"TitleOptimizer [{technique}]: '{title}' → '{optimized}'")
            return optimized
        except Exception as e:
            logger.warning(f"TitleOptimizer format error: {e}")
            return title

    def optimize_outline(self, outline: list[str]) -> list[str]:
        """
        アウトライン全体を最適化する。
        各セクションに異なる技法を適用。
        """
        optimized = []
        for i, title in enumerate(outline):
            optimized.append(self.optimize_title(title, index=i))
        logger.info(f"TitleOptimizer: {len(outline)} titles optimized")
        return optimized
