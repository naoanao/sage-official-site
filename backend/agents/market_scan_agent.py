"""
MarketScanAgent — 自律市場調査エージェント

毎日複数のデータソースをスキャンし、AIが生成・販売できる
デジタル商品の需要ギャップ（Demand Gap）を発見してスコアリングする。

データソース:
  1. Google Trends (pytrends) — 急上昇キーワード（グローバル + 日本）
  2. Reddit JSON API      — 関連サブレディットのトレンドトピック（認証不要）
  3. DuckDuckGo           — 検索クエリで競合商品数を概算

スコアリング（Groq LLM）:
  demand_score      (1-10): 現在の需要の強さ
  competition_score (1-10): 10=競合少 / 1=飽和
  ai_generability   (1-10): SAGEがAIで生成できるか
  → total_score = 需要×0.4 + 競合希少×0.35 + AI生成可能性×0.25
"""

import json
import logging
import os
import time
from datetime import datetime
from typing import Any

import requests

logger = logging.getLogger(__name__)

GROQ_MODEL = "llama-3.3-70b-versatile"

# サブレディット — AI/デジタル商品/ソロプレナー系
REDDIT_SOURCES = [
    "entrepreneur",
    "passive_income",
    "digitalnomad",
    "SideProject",
    "artificial",
]

# Google Trends のシード — Sage が扱う領域
TREND_SEEDS = [
    "AI tools 2026",
    "digital product ideas",
    "passive income online",
    "AI automation",
    "prompt engineering",
    "solopreneur tools",
]

# AI で生成できる商品カテゴリ（スコアリング判定用）
AI_GENERATABLE_CATEGORIES = [
    "ebook", "pdf guide", "notion template", "excel template", "prompt pack",
    "python script", "mini saas", "canva template", "checklist", "swipe file",
    "email sequence", "course outline", "worksheet", "cheat sheet", "toolkit",
]


class MarketScanAgent:
    def __init__(self) -> None:
        from groq import Groq
        self.groq = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"

    # ── Source 1: Google Trends ───────────────────────────────────────────────

    def scan_google_trends(self) -> list[dict]:
        """pytrends で急上昇クエリを取得する。"""
        results = []
        try:
            from pytrends.request import TrendReq
            pt = TrendReq(hl="en-US", tz=0, timeout=(10, 30))

            # 1) 日次急上昇トレンド（米国）
            try:
                trending_df = pt.trending_searches(pn="united_states")
                for kw in trending_df[0].head(10).tolist():
                    results.append({
                        "keyword": str(kw),
                        "source": "google_trends_daily",
                        "raw_score": 8,
                    })
            except Exception as e:
                logger.warning(f"[MarketScan] Google daily trends error: {e}")

            # 2) シードキーワードの関連クエリ（急上昇）
            try:
                pt.build_payload(TREND_SEEDS[:5], timeframe="now 7-d", geo="")
                related = pt.related_queries()
                for seed, data in related.items():
                    rising = data.get("rising")
                    if rising is not None and not rising.empty:
                        for _, row in rising.head(5).iterrows():
                            results.append({
                                "keyword": str(row.get("query", "")),
                                "source": "google_trends_rising",
                                "raw_score": min(int(row.get("value", 50)) // 10 + 5, 10),
                            })
            except Exception as e:
                logger.warning(f"[MarketScan] Google related queries error: {e}")

        except ImportError:
            logger.warning("[MarketScan] pytrends not installed. Skipping Google Trends.")
        except Exception as e:
            logger.error(f"[MarketScan] Google Trends scan failed: {e}")

        logger.info(f"[MarketScan] Google Trends: {len(results)} signals")
        return results

    # ── Source 2: Reddit ─────────────────────────────────────────────────────

    def scan_reddit(self) -> list[dict]:
        """Reddit JSON API で今日の急上昇投稿タイトルを取得する（認証不要）。"""
        results = []
        headers = {"User-Agent": "SageMarketScanBot/1.0"}

        for sub in REDDIT_SOURCES:
            try:
                url = f"https://www.reddit.com/r/{sub}/top.json?limit=10&t=day"
                resp = requests.get(url, headers=headers, timeout=15)
                if resp.status_code != 200:
                    continue
                posts = resp.json().get("data", {}).get("children", [])
                for post in posts:
                    d = post.get("data", {})
                    title = d.get("title", "")
                    score = d.get("score", 0)
                    if title and score > 50:
                        results.append({
                            "keyword": title[:120],
                            "source": f"reddit/{sub}",
                            "raw_score": min(score // 200 + 5, 10),
                        })
                time.sleep(1)  # Rate-limit courtesy
            except Exception as e:
                logger.warning(f"[MarketScan] Reddit r/{sub} error: {e}")

        logger.info(f"[MarketScan] Reddit: {len(results)} signals")
        return results

    # ── Source 3: DuckDuckGo competition check ────────────────────────────────

    def _estimate_competition(self, keyword: str) -> int:
        """
        DDG Instant Answer で競合商品数を概算。
        返値: 10=競合ほぼなし / 1=飽和
        """
        try:
            url = "https://api.duckduckgo.com/"
            params = {"q": f'{keyword} buy template filetype:pdf', "format": "json", "no_html": 1}
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code != 200:
                return 5
            data = resp.json()
            related_count = len(data.get("RelatedTopics", []))
            # RelatedTopicsが少ない = ニッチ = 競合少
            if related_count <= 3:
                return 8
            elif related_count <= 8:
                return 6
            else:
                return 4
        except Exception:
            return 5  # デフォルト中立

    # ── AI scoring ────────────────────────────────────────────────────────────

    def _score_with_ai(self, candidates: list[dict]) -> list[dict]:
        """
        Groq LLM で需要スコア・競合希少度・AI生成可能性を一括評価し、
        上位 TOP_N を返す。
        """
        TOP_N = 10
        if not candidates:
            return []

        # キーワード一覧をコンパクトに渡す
        kw_list = "\n".join(
            f"{i+1}. {c['keyword']} (source={c['source']}, raw={c['raw_score']})"
            for i, c in enumerate(candidates[:30])
        )

        categories_str = ", ".join(AI_GENERATABLE_CATEGORIES)

        prompt = f"""You are a digital product market analyst for an AI solopreneur business (SAGE).
Evaluate each keyword/topic below and score it for selling AI-generated digital products.

AI-generatable product types: {categories_str}

For each item, return a JSON array with objects:
{{
  "rank": <int>,
  "keyword": "<original keyword>",
  "product_idea": "<specific AI-generatable product idea, 1 line>",
  "demand_score": <1-10>,
  "competition_score": <1-10, 10=low competition>,
  "ai_generability": <1-10>,
  "total_score": <float, weighted: demand*0.40 + competition*0.35 + ai_gen*0.25>,
  "reason": "<1 sentence why>"
}}

Return ONLY the JSON array of top {TOP_N} items sorted by total_score descending. No markdown.

Keywords to evaluate:
{kw_list}
"""
        try:
            resp = self.groq.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000,
                temperature=0.3,
            )
            raw = resp.choices[0].message.content.strip()
            # JSON部分を抽出
            import re
            m = re.search(r'\[[\s\S]*\]', raw)
            if m:
                scored = json.loads(m.group(0))
                logger.info(f"[MarketScan] AI scored {len(scored)} opportunities.")
                return scored
        except Exception as e:
            logger.error(f"[MarketScan] AI scoring failed: {e}")

        # フォールバック: raw_scoreで並べて返す
        sorted_cands = sorted(candidates, key=lambda x: x.get("raw_score", 0), reverse=True)
        return [
            {
                "rank": i + 1,
                "keyword": c["keyword"],
                "product_idea": f"Digital product about: {c['keyword']}",
                "demand_score": c.get("raw_score", 5),
                "competition_score": 5,
                "ai_generability": 7,
                "total_score": c.get("raw_score", 5) * 0.65 + 7 * 0.25,
                "reason": "Fallback scoring (AI unavailable)",
            }
            for i, c in enumerate(sorted_cands[:TOP_N])
        ]

    # ── Deduplication ─────────────────────────────────────────────────────────

    def _deduplicate(self, signals: list[dict]) -> list[dict]:
        """同じキーワードの重複を除去し、raw_score 最大を残す。"""
        seen: dict[str, dict] = {}
        for s in signals:
            kw = s["keyword"].lower().strip()
            if kw not in seen or s.get("raw_score", 0) > seen[kw].get("raw_score", 0):
                seen[kw] = s
        return list(seen.values())

    # ── Main ─────────────────────────────────────────────────────────────────

    def run_scan(self) -> dict[str, Any]:
        """
        全ソースをスキャン → 重複排除 → AIスコアリング → 結果を返す。

        Returns:
            {
                "scanned_at": ISO timestamp,
                "total_signals": int,
                "opportunities": [ scored dicts ... ]
            }
        """
        logger.info("[MarketScan] Starting market scan...")
        start = datetime.utcnow()

        signals: list[dict] = []

        # ── Scan sources ──
        signals.extend(self.scan_google_trends())
        signals.extend(self.scan_reddit())

        logger.info(f"[MarketScan] Total raw signals: {len(signals)}")

        # ── Deduplicate ──
        unique = self._deduplicate(signals)
        logger.info(f"[MarketScan] After dedup: {len(unique)} unique signals")

        if not unique:
            logger.warning("[MarketScan] No signals collected. Returning empty result.")
            return {
                "scanned_at": start.isoformat(),
                "total_signals": 0,
                "opportunities": [],
            }

        # ── AI scoring ──
        if self.dry_run:
            logger.info("[MarketScan][DRY_RUN] Skipping AI scoring.")
            opportunities = unique[:10]
        else:
            opportunities = self._score_with_ai(unique)

        elapsed = (datetime.utcnow() - start).total_seconds()
        logger.info(
            f"[MarketScan] ✅ Scan complete in {elapsed:.1f}s. "
            f"Top opportunity: {opportunities[0].get('keyword', '?') if opportunities else 'none'}"
        )

        return {
            "scanned_at": start.isoformat(),
            "total_signals": len(signals),
            "opportunities": opportunities,
        }
