"""
Niche Validator — 5ステップでトピックの市場性を検証する。

D1リサーチ前の「出す価値があるか」チェックポイント。

Usage:
    from backend.pipelines.niche_validator import NicheValidator
    validator = NicheValidator(groq_api_key=os.getenv("GROQ_API_KEY"))
    result = validator.validate(topic="早朝釣り完全攻略 小田原港 2026")
"""
import json
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

MODEL = "llama-3.3-70b-versatile"


def _extract_json(text: str) -> dict:
    """LLM応答からJSONを抽出。マークダウンブロック対応。"""
    # ```json ... ``` を除去
    cleaned = re.sub(r"```(?:json)?", "", text).strip().strip("`").strip()
    # 最初の { から最後の } まで抜き出す
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    # フォールバック: 空辞書（各フィールドがデフォルト値を使用する）
    return {}


class NicheValidator:
    """Groqを使ってトピックの市場性を5軸で判定する。"""

    def __init__(self, groq_api_key: Optional[str] = None):
        self._key = groq_api_key or os.getenv("GROQ_API_KEY", "")

    def _call_groq(self, prompt: str, max_tokens: int = 600) -> str:
        from groq import Groq
        client = Groq(api_key=self._key)
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()

    # ──────────────────────────────────────────────
    # 5軸分析
    # ──────────────────────────────────────────────

    def _analyze_demand(self, topic: str) -> dict:
        prompt = f"""You are a market research expert.
Analyze the market demand for this digital product topic: "{topic}"

Output ONLY valid JSON (no markdown, no explanation):
{{
  "score": <0-100>,
  "trend": "<RISING|STABLE|DECLINING>",
  "search_volume": "<LOW|MEDIUM|HIGH>",
  "social_buzz": "<LOW|MEDIUM|HIGH>",
  "reason": "<1-2 sentences in Japanese>"
}}"""
        raw = self._call_groq(prompt, 300)
        d = _extract_json(raw)
        return {
            "score": int(d.get("score", 50)),
            "trend": d.get("trend", "STABLE"),
            "search_volume": d.get("search_volume", "MEDIUM"),
            "social_buzz": d.get("social_buzz", "MEDIUM"),
            "reason": d.get("reason") or "分析中",
        }

    def _analyze_competition(self, topic: str) -> dict:
        prompt = f"""You are a competitive intelligence analyst.
Analyze competition level for this digital product niche: "{topic}"

Output ONLY valid JSON (no markdown):
{{
  "level": "<LOW|MEDIUM|HIGH>",
  "estimated_products": <integer>,
  "avg_price_jpy": <integer>,
  "avg_rating": <1.0-5.0>,
  "gaps": ["<gap1 in Japanese>", "<gap2 in Japanese>"],
  "reason": "<1-2 sentences in Japanese>"
}}"""
        raw = self._call_groq(prompt, 400)
        d = _extract_json(raw)
        return {
            "level": d.get("level", "MEDIUM"),
            "estimated_products": int(d.get("estimated_products", 10)),
            "avg_price_jpy": int(d.get("avg_price_jpy", 3000)),
            "avg_rating": float(d.get("avg_rating", 3.8)),
            "gaps": d.get("gaps", []),
            "reason": d.get("reason") or "分析中",
        }

    def _analyze_audience(self, topic: str) -> dict:
        prompt = f"""You are a customer persona expert.
Define the ideal buyer persona for: "{topic}"

Output ONLY valid JSON (no markdown):
{{
  "clarity_score": <0-100>,
  "persona": {{
    "age_range": "<e.g. 30-45>",
    "occupation": "<in Japanese>",
    "pain_point": "<main problem in Japanese>",
    "willingness_to_pay_jpy": <integer>
  }},
  "reason": "<1-2 sentences in Japanese>"
}}"""
        raw = self._call_groq(prompt, 400)
        d = _extract_json(raw)
        persona = d.get("persona", {})
        return {
            "clarity_score": int(d.get("clarity_score", 60)),
            "persona": {
                "age_range": persona.get("age_range", "30-45"),
                "occupation": persona.get("occupation", "会社員"),
                "pain_point": persona.get("pain_point", ""),
                "willingness_to_pay_jpy": int(persona.get("willingness_to_pay_jpy", 3000)),
            },
            "reason": d.get("reason") or "分析中",
        }

    def _suggest_pricing(self, competition: dict, audience: dict) -> dict:
        wtp = audience["persona"]["willingness_to_pay_jpy"]
        avg = competition["avg_price_jpy"]

        # ベース価格をWTPと競合平均の中間から計算
        mid = (wtp + avg) // 2
        basic = max(980, round(mid * 0.5 / 100) * 100)
        standard = max(2980, round(mid / 100) * 100)
        premium = max(9800, round(mid * 2.5 / 100) * 100)

        return {
            "japan": {"basic": basic, "standard": standard, "premium": premium},
            "us": {
                "basic_usd": round(basic / 150),
                "standard_usd": round(standard / 150),
                "premium_usd": round(premium / 150),
            },
            "recommended_tier": "standard",
            "note": f"競合平均¥{avg:,} / 想定WTP¥{wtp:,} をもとに算出",
        }

    # ──────────────────────────────────────────────
    # メインエントリ
    # ──────────────────────────────────────────────

    def validate(self, topic: str) -> dict:
        """5軸バリデーションを実行して総合スコアと推奨を返す。"""
        try:
            demand = self._analyze_demand(topic)
            competition = self._analyze_competition(topic)
            audience = self._analyze_audience(topic)
            pricing = self._suggest_pricing(competition, audience)

            # 総合スコア計算
            # demand: 40% / competition inverse: 30% / audience clarity: 30%
            comp_score = {"LOW": 90, "MEDIUM": 60, "HIGH": 30}.get(competition["level"], 60)
            overall = round(
                demand["score"] * 0.40
                + comp_score * 0.30
                + audience["clarity_score"] * 0.30
            )

            recommendation = "GO" if overall >= 70 else "CAUTION" if overall >= 50 else "STOP"

            # 改善提案
            improvements = []
            if demand["score"] < 60:
                improvements.append("トピックをより具体的なニッチに絞り込んでください（例: 地域・対象者・時間帯を限定）")
            if competition["level"] == "HIGH":
                improvements.append(f"競合のギャップを突いてください: {', '.join(competition['gaps'][:2])}")
            if audience["clarity_score"] < 60:
                improvements.append("ターゲット読者を明確に定義してください（年齢・職業・悩みを具体化）")
            if not improvements:
                improvements.append("現状で市場性は十分です。D1リサーチを実行して商品生成へ進んでください。")

            return {
                "status": "success",
                "topic": topic,
                "overall_score": overall,
                "recommendation": recommendation,
                "demand": demand,
                "competition": competition,
                "audience": audience,
                "pricing": pricing,
                "improvements": improvements,
            }

        except Exception as e:
            logger.error(f"[NicheValidator] Error: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}
