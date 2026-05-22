"""
GrowlBridge — Sage → Growl データブリッジ

Sageの市場スキャン結果を日本の中小事業者向けSNSトレンドに翻訳し、
Growl（ai-marketing-app）が使うSupabaseのmarket_signalsテーブルに書き込む。

役割分担:
    Sage（このファイル）→ market_signals テーブルに書く（生産者）
    Growl（ai-marketing-app）         → market_signals テーブルを読む（消費者）

設計思想:
    Sageの市場スキャンは英語圏のデジタル商品機会を分析する。
    GrowlBridgeはそのシグナルを「日本の飲食店・サロン・EC事業者」向けの
    SNSトレンドとして翻訳する。Sageが見る→Growlが動く、という体の仕組み。

使い方:
    from backend.modules.growl_bridge import GrowlBridge
    bridge = GrowlBridge()
    bridge.push_signals(scan_result)  # MarketScanScheduler から呼ぶ
"""

import logging
import os
from datetime import date
from typing import Any

logger = logging.getLogger("GrowlBridge")

INDUSTRIES = [
    {"key": "restaurant",    "label": "飲食店（カフェ・レストラン・居酒屋・テイクアウト等）"},
    {"key": "salon",         "label": "美容サロン（美容院・ネイル・エステ・まつエク等）"},
    {"key": "ec",            "label": "EC・通販（ハンドメイド・食品EC・ギフト・雑貨等）"},
    {"key": "professional",  "label": "士業・コンサル（税理士・社労士・コーチング等）"},
    {"key": "construction",  "label": "工務店・建設（リフォーム・外構・塗装・内装等）"},
    {"key": "other",         "label": "その他の日本の中小事業者・個人事業主"},
]


class GrowlBridge:
    def __init__(self) -> None:
        self.dry_run = os.getenv("SAGE_DRY_RUN", "False").lower() == "true"
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

        if not self.supabase_url or not self.supabase_key:
            logger.warning("[GrowlBridge] Supabase credentials not set. Bridge disabled.")
        if not self.groq_key:
            logger.warning("[GrowlBridge] GROQ_API_KEY not set. Translation will use fallback.")

    # ── Groq でシグナルを日本語SME向けに翻訳 ─────────────────────────────

    def _translate_for_industry(
        self, industry_label: str, scan_result: dict[str, Any]
    ) -> str | None:
        """
        Sageのスキャン結果（英語圏デジタル商品機会）を
        日本のSME業種向けSNSトレンドに翻訳する。
        Groq (llama-3.3-70b-versatile) を使用。Geminiは使用停止（quota超過）。
        """
        if not self.groq_key:
            return self._fallback_signal(industry_label)

        import urllib.request
        import urllib.error
        import json

        # トップ5機会をサマリーとして渡す
        opportunities = scan_result.get("opportunities", [])[:5]
        opp_text = "\n".join(
            f"- {o.get('keyword', '')} → {o.get('product_idea', '')} "
            f"(需要スコア: {o.get('demand_score', 5)}/10, 理由: {o.get('reason', '')})"
            for o in opportunities
        ) or "（シグナルなし）"

        today = date.today().isoformat()

        prompt = f"""あなたは日本のSNSマーケティングアナリストです。
今日の日付: {today}

【グローバル市場シグナル（Sageが収集した英語圏トレンド）】
{opp_text}

【タスク】
上記のグローバルトレンドを参考にしながら、「{industry_label}」を経営する日本の中小事業者が
今週SNS（Instagram・LINE・X等）で使える投稿テーマを3行以内で提案してください。

【出力ルール】
- Markdown記号（**、##等）は一切使わない
- 3行以内のプレーンテキストのみ
- 具体的なテーマ・切り口を書く（例：「今週は父の日前週。感謝テーマ×自店の得意料理で温かみ投稿が◎」）
- 季節・時事に必ず絡める
- 業種に無関係なことは書かない

提案（3行以内）:"""

        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            payload = json.dumps({
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5,
                "max_tokens": 300,
            }).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.groq_key}",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            cleaned = text.strip().replace("**", "").replace("##", "").strip()
            return cleaned if cleaned else None
        except Exception as e:
            logger.warning(f"[GrowlBridge] Groq translation failed for {industry_label}: {e}")
            return self._fallback_signal(industry_label)

    def _fallback_signal(self, industry_label: str) -> str:
        """Groq が使えない場合の汎用シグナル（最終フォールバック）"""
        today = date.today().isoformat()
        return f"今週（{today}）の{industry_label}向けSNSトレンドを参考に、旬なテーマで投稿することをおすすめします。季節感・限定感・お得感の三要素を意識してください。"

    # ── Supabase に書き込み ────────────────────────────────────────────────

    def _save_to_supabase(self, industry_key: str, signal: str) -> bool:
        """market_signals テーブルに upsert する（日付 × 業種でユニーク）"""
        if not self.supabase_url or not self.supabase_key:
            return False

        import urllib.request
        import urllib.error
        import json

        today = date.today().isoformat()
        url = f"{self.supabase_url}/rest/v1/market_signals"
        payload = json.dumps({
            "industry": industry_key,
            "signal_date": today,
            "raw_summary": signal,
            "created_at": f"{today}T00:00:00+00:00",
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Prefer": "resolution=merge-duplicates",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                status = resp.getcode()
                ok = status in (200, 201)
                if ok:
                    logger.info(f"[GrowlBridge] ✅ Saved signal for {industry_key} ({today})")
                return ok
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="ignore")
            logger.error(f"[GrowlBridge] Supabase error {e.code} for {industry_key}: {body[:200]}")
            return False
        except Exception as e:
            logger.error(f"[GrowlBridge] Supabase write failed for {industry_key}: {e}")
            return False

    # ── 週次売上レポート ──────────────────────────────────────────────────

    def fetch_weekly_revenue(self) -> str:
        """
        Growl の /api/revenue-report を叩いて今週の収益サマリーを取得する。
        MarketScanScheduler.run_once() から呼び出し、結果をSageのログ・通知に渡す。
        """
        import urllib.request
        import json

        growl_url = os.getenv("NEXT_PUBLIC_APP_URL", "https://growl-app.vercel.app")
        cron_secret = os.getenv("CRON_SECRET", "")
        url = f"{growl_url}/api/revenue-report"

        try:
            req = urllib.request.Request(
                url,
                headers={"Authorization": f"Bearer {cron_secret}"},
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
            message = data.get("message", "売上データ取得失敗")
            logger.info(f"[GrowlBridge] 💰 {message}")
            return message
        except Exception as e:
            logger.warning(f"[GrowlBridge] Revenue fetch failed: {e}")
            return "Growl売上データ取得失敗"

    # ── メイン ────────────────────────────────────────────────────────────

    def push_signals(self, scan_result: dict[str, Any]) -> dict[str, bool]:
        """
        全6業種のSNSシグナルを生成してSupabaseに書き込む。
        MarketScanScheduler.run_once() から呼び出す。

        Returns:
            {"restaurant": True, "salon": False, ...}
        """
        results: dict[str, bool] = {}
        logger.info("[GrowlBridge] Translating market signals for Growl users...")

        for ind in INDUSTRIES:
            key = ind["key"]
            label = ind["label"]

            if self.dry_run:
                logger.info(f"[GrowlBridge][DRY_RUN] Would push signal for {key}")
                results[key] = True
                continue

            signal = self._translate_for_industry(label, scan_result)
            if signal:
                results[key] = self._save_to_supabase(key, signal)
            else:
                results[key] = False

        saved = sum(1 for v in results.values() if v)
        logger.info(f"[GrowlBridge] Done. {saved}/{len(INDUSTRIES)} industries updated.")

        # 週次収益レポートを取得してSageのログに記録
        self.fetch_weekly_revenue()

        return results
