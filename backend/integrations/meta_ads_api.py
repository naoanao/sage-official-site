"""
Meta Ads API 連携モジュール
Growl SNS広告運用AI - Phase 2実装

機能:
1. 広告文・クリエイティブ生成（Groq/Gemini）
2. Metaキャンペーン作成・広告出稿（Meta Marketing API）
3. 成果取得（CTR/CPA/ROAS）→ 次の改善提案

使い方:
    api = MetaAdsAPI()
    # 広告文生成
    ad_copy = api.generate_ad_copy(business_info)
    # 承認後に出稿
    result = api.create_campaign(ad_copy, budget_daily=1000)
    # 成果取得
    insights = api.get_insights(campaign_id)
"""

import os
import json
import logging
import requests
from datetime import datetime, timedelta
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MetaAdsAPI")


class MetaAdsAPI:
    """Meta Marketing API ラッパー（広告運用AI）"""

    def __init__(self):
        self.access_token = os.getenv("META_ADS_ACCESS_TOKEN") or os.getenv("INSTAGRAM_ACCESS_TOKEN")
        self.ad_account_id = os.getenv("META_AD_ACCOUNT_ID")  # act_XXXXXXX 形式
        self.api_version = "v21.0"
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self.mock_mode = not (self.access_token and self.ad_account_id)

        if self.mock_mode:
            logger.warning("⚠️ Meta Ads credentials not set. Running in MOCK MODE.")
            logger.warning("必要な環境変数: META_ADS_ACCESS_TOKEN, META_AD_ACCOUNT_ID")
        else:
            logger.info(f"✅ Meta Ads API 初期化完了 | Account: {self.ad_account_id}")

    # ── 1. 広告文生成（AIが作る） ────────────────────────────────────────────

    def generate_ad_copy(self, business_info: dict) -> dict:
        """
        Groqを使って業種・商品・客層から広告文を自動生成する。

        Args:
            business_info: {
                "industry": "飲食店",
                "business_desc": "神奈川の焼肉店",
                "customer_desc": "30〜50代のファミリー",
                "main_problem": "新規客が少ない",
                "product": "平日ランチセット980円",
                "goal": "ランチ予約を週10件増やす"
            }

        Returns:
            {
                "headline": "広告見出し（40文字以内）",
                "primary_text": "広告本文（125文字以内）",
                "description": "説明文（30文字以内）",
                "cta": "予約する / 詳しく見る / 今すぐ注文",
                "target_audience": "ターゲット設定の提案",
                "image_prompt": "画像生成プロンプト"
            }
        """
        try:
            from groq import Groq
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))

            prompt = f"""
あなたはMeta広告の専門家です。以下の情報から、クリック率が高い広告文を生成してください。

業種: {business_info.get('industry', '')}
事業説明: {business_info.get('business_desc', '')}
ターゲット: {business_info.get('customer_desc', '')}
課題: {business_info.get('main_problem', '')}
商品/サービス: {business_info.get('product', '')}
目標: {business_info.get('goal', '')}

以下のJSON形式で出力してください:
{{
  "headline": "見出し（40文字以内・数字や緊急性を含む）",
  "primary_text": "本文（125文字以内・ベネフィットを前面に）",
  "description": "説明（30文字以内）",
  "cta": "予約する",
  "target_audience": "年齢・地域・興味関心のターゲット提案",
  "image_prompt": "英語で画像生成AIへのプロンプト"
}}

重要: 数字、限定感、ベネフィットを必ず入れること。
"""
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            ad_copy = json.loads(response.choices[0].message.content)
            logger.info(f"✅ 広告文生成完了: {ad_copy.get('headline', '')}")
            return {"status": "success", "ad_copy": ad_copy}

        except Exception as e:
            logger.error(f"❌ 広告文生成失敗: {e}")
            # フォールバック
            return {
                "status": "fallback",
                "ad_copy": {
                    "headline": f"{business_info.get('product', '商品')}【期間限定】",
                    "primary_text": f"{business_info.get('customer_desc', 'あなた')}へ。{business_info.get('business_desc', '')}がお届けする特別オファー。",
                    "description": "詳しくはこちら",
                    "cta": "詳しく見る",
                    "target_audience": "地域ターゲティング推奨",
                    "image_prompt": "professional product photo, bright lighting, Japanese style"
                }
            }

    # ── 2. キャンペーン作成（承認後に実行） ──────────────────────────────────

    def create_campaign(
        self,
        name: str,
        objective: str = "OUTCOME_TRAFFIC",
        status: str = "PAUSED"  # 最初はPAUSEDで作成→確認後ACTIVEに
    ) -> dict:
        """Metaキャンペーンを作成する（デフォルトは一時停止状態）"""
        if self.mock_mode:
            mock_id = f"mock_campaign_{int(datetime.now().timestamp())}"
            logger.info(f"[MOCK] キャンペーン作成: {name} | ID: {mock_id}")
            return {"status": "success", "campaign_id": mock_id, "mock": True}

        url = f"{self.base_url}/{self.ad_account_id}/campaigns"
        payload = {
            "name": name,
            "objective": objective,
            "status": status,
            "special_ad_categories": [],
            "access_token": self.access_token
        }
        try:
            r = requests.post(url, data=payload)
            result = r.json()
            if "id" in result:
                logger.info(f"✅ キャンペーン作成: {result['id']}")
                return {"status": "success", "campaign_id": result["id"]}
            else:
                logger.error(f"❌ キャンペーン作成失敗: {result}")
                return {"status": "error", "error": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def create_ad_set(
        self,
        campaign_id: str,
        name: str,
        daily_budget: int = 1000,  # 円単位
        targeting: Optional[dict] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> dict:
        """広告セット（ターゲティング・予算）を作成する"""
        if self.mock_mode:
            mock_id = f"mock_adset_{int(datetime.now().timestamp())}"
            logger.info(f"[MOCK] 広告セット作成: {name} | 予算: ¥{daily_budget}/日")
            return {"status": "success", "adset_id": mock_id, "mock": True}

        if targeting is None:
            targeting = {
                "geo_locations": {"countries": ["JP"]},
                "age_min": 25,
                "age_max": 55
            }

        now = datetime.utcnow()
        url = f"{self.base_url}/{self.ad_account_id}/adsets"
        payload = {
            "name": name,
            "campaign_id": campaign_id,
            "daily_budget": daily_budget * 10,  # Meta APIはセント単位
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "LINK_CLICKS",
            "targeting": json.dumps(targeting),
            "start_time": start_time or now.strftime("%Y-%m-%dT%H:%M:%S+0000"),
            "status": "PAUSED",
            "access_token": self.access_token
        }
        try:
            r = requests.post(url, data=payload)
            result = r.json()
            if "id" in result:
                logger.info(f"✅ 広告セット作成: {result['id']}")
                return {"status": "success", "adset_id": result["id"]}
            else:
                return {"status": "error", "error": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def create_ad(
        self,
        adset_id: str,
        ad_copy: dict,
        page_id: str,
        link_url: str,
        image_url: Optional[str] = None
    ) -> dict:
        """広告クリエイティブと広告を作成する"""
        if self.mock_mode:
            mock_id = f"mock_ad_{int(datetime.now().timestamp())}"
            logger.info(f"[MOCK] 広告作成: {ad_copy.get('headline', '')} | URL: {link_url}")
            return {"status": "success", "ad_id": mock_id, "mock": True}

        # クリエイティブ作成
        creative_url = f"{self.base_url}/{self.ad_account_id}/adcreatives"
        creative_payload = {
            "name": f"Creative_{adset_id}",
            "object_story_spec": json.dumps({
                "page_id": page_id,
                "link_data": {
                    "message": ad_copy.get("primary_text", ""),
                    "link": link_url,
                    "name": ad_copy.get("headline", ""),
                    "description": ad_copy.get("description", ""),
                    "call_to_action": {
                        "type": "LEARN_MORE",
                        "value": {"link": link_url}
                    }
                }
            }),
            "access_token": self.access_token
        }
        try:
            r = requests.post(creative_url, data=creative_payload)
            creative = r.json()
            if "id" not in creative:
                return {"status": "error", "error": creative}

            # 広告作成
            ad_url = f"{self.base_url}/{self.ad_account_id}/ads"
            ad_payload = {
                "name": ad_copy.get("headline", "Growl Ad"),
                "adset_id": adset_id,
                "creative": json.dumps({"creative_id": creative["id"]}),
                "status": "PAUSED",
                "access_token": self.access_token
            }
            r2 = requests.post(ad_url, data=ad_payload)
            result = r2.json()
            if "id" in result:
                logger.info(f"✅ 広告作成完了: {result['id']}")
                return {"status": "success", "ad_id": result["id"], "creative_id": creative["id"]}
            else:
                return {"status": "error", "error": result}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # ── 3. 成果取得（AIが改善提案に使う） ────────────────────────────────────

    def get_insights(self, campaign_id: str, days: int = 7) -> dict:
        """キャンペーンの成果データを取得してAIが改善提案を出す"""
        if self.mock_mode:
            # モックデータで改善提案のデモ
            mock_insights = {
                "impressions": 12500,
                "clicks": 187,
                "ctr": 1.50,
                "spend": 3200,
                "cpc": 17.1,
                "conversions": 8,
                "cpa": 400,
                "roas": 3.2
            }
            suggestion = self._generate_improvement(mock_insights)
            return {"status": "success", "insights": mock_insights, "suggestion": suggestion, "mock": True}

        since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        until = datetime.now().strftime("%Y-%m-%d")
        url = f"{self.base_url}/{campaign_id}/insights"
        params = {
            "fields": "impressions,clicks,ctr,spend,cpc,actions,cost_per_action_type",
            "time_range": json.dumps({"since": since, "until": until}),
            "access_token": self.access_token
        }
        try:
            r = requests.get(url, params=params)
            data = r.json().get("data", [{}])[0]
            insights = {
                "impressions": int(data.get("impressions", 0)),
                "clicks": int(data.get("clicks", 0)),
                "ctr": float(data.get("ctr", 0)),
                "spend": float(data.get("spend", 0)),
                "cpc": float(data.get("cpc", 0)),
            }
            suggestion = self._generate_improvement(insights)
            logger.info(f"✅ インサイト取得: CTR={insights['ctr']}% | CPC=¥{insights['cpc']}")
            return {"status": "success", "insights": insights, "suggestion": suggestion}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _generate_improvement(self, insights: dict) -> str:
        """成果データから改善提案を生成する"""
        suggestions = []
        ctr = insights.get("ctr", 0)
        cpc = insights.get("cpc", 0)
        roas = insights.get("roas", 0)

        if ctr < 1.0:
            suggestions.append("CTRが1%未満 → 広告画像か見出しを変更する。数字や緊急性のある表現に切り替える。")
        elif ctr > 3.0:
            suggestions.append("CTRが高い（3%超）→ 予算を1.5倍に増やして拡大する。")

        if cpc > 100:
            suggestions.append("CPCが高い（¥100超）→ ターゲットを絞る。年齢・地域・興味関心を再設定する。")

        if roas > 0 and roas < 2.0:
            suggestions.append("ROASが2倍未満 → LPのファーストビューとCTAを変更する。")
        elif roas >= 3.0:
            suggestions.append("ROASが3倍以上 → 勝ちクリエイティブ確定。類似オーディエンスに展開する。")

        if not suggestions:
            suggestions.append("指標は安定している。現状維持しながら週次でモニタリングを継続する。")

        return " / ".join(suggestions)

    # ── 4. 一括実行（広告文生成→作成→出稿の自動化） ─────────────────────────

    def run_ad_cycle(
        self,
        business_info: dict,
        link_url: str,
        page_id: str,
        daily_budget: int = 1000,
        auto_publish: bool = False  # Falseなら承認待ちPAUSEDで止まる
    ) -> dict:
        """
        広告運用の1サイクルを実行する。

        auto_publish=False（デフォルト）: PAUSED状態で作成→なおさんが確認→手動でACTIVEに
        auto_publish=True: 自動でACTIVEにして出稿（Phase 2以降）
        """
        logger.info("🚀 広告サイクル開始")

        # Step 1: 広告文生成
        copy_result = self.generate_ad_copy(business_info)
        ad_copy = copy_result["ad_copy"]
        logger.info(f"Step 1 完了: {ad_copy.get('headline', '')}")

        # Step 2: キャンペーン作成
        campaign_name = f"Growl_{business_info.get('industry', 'Ad')}_{datetime.now().strftime('%Y%m%d')}"
        camp_result = self.create_campaign(campaign_name)
        if camp_result["status"] != "success":
            return {"status": "error", "step": "campaign", "error": camp_result}

        # Step 3: 広告セット作成
        adset_result = self.create_ad_set(
            campaign_id=camp_result["campaign_id"],
            name=f"{campaign_name}_AdSet",
            daily_budget=daily_budget
        )
        if adset_result["status"] != "success":
            return {"status": "error", "step": "adset", "error": adset_result}

        # Step 4: 広告作成
        ad_result = self.create_ad(
            adset_id=adset_result["adset_id"],
            ad_copy=ad_copy,
            page_id=page_id,
            link_url=link_url
        )

        result = {
            "status": "success",
            "ad_copy": ad_copy,
            "campaign_id": camp_result["campaign_id"],
            "adset_id": adset_result["adset_id"],
            "ad_id": ad_result.get("ad_id"),
            "publish_status": "PAUSED（承認待ち）" if not auto_publish else "ACTIVE（出稿中）",
            "next_action": "Meta広告マネージャーで確認してACTIVEに変更してください" if not auto_publish else "自動出稿中"
        }

        logger.info(f"✅ 広告サイクル完了 | Status: {result['publish_status']}")
        return result


# ── CLIテスト用 ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    api = MetaAdsAPI()

    # テスト: なおさんのGumroad商品用広告文生成
    business_info = {
        "industry": "AIツール・SaaS",
        "business_desc": "元飲食店オーナーが作ったAIマーケティングツール Growl",
        "customer_desc": "飲食店オーナー・サロン経営者・個人事業主",
        "main_problem": "マーケが苦手・時間がない・何をやればいいかわからない",
        "product": "Sage Blueprint $49 / Growl $19〜$49/月",
        "goal": "週10件の新規ユーザー獲得"
    }

    print("\n=== 広告文生成テスト ===")
    result = api.generate_ad_copy(business_info)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    print("\n=== 広告サイクルテスト（モック） ===")
    cycle = api.run_ad_cycle(
        business_info=business_info,
        link_url="https://growl-app.vercel.app",
        page_id="YOUR_PAGE_ID",
        daily_budget=500
    )
    print(json.dumps(cycle, ensure_ascii=False, indent=2))

    print("\n=== インサイト・改善提案テスト ===")
    insights = api.get_insights("mock_campaign_123")
    print(json.dumps(insights, ensure_ascii=False, indent=2))
