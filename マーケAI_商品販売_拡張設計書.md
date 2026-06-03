# マーケAI 商品販売＆リピート購入システム 拡張設計書
**作成日: 2026-05-10 | 対象: Growl (ai-marketing-app) + Sage**

---

## 1. 概念設計 — 何を実現するか

> 「商品をインプットすれば売って、継続して買い続けてくれるAIにする」

### コアとなる3つの柱

| 柱 | 内容 | 使用する理論 |
|---|---|---|
| **① AI検索で見つかる** | ChatGPT・Perplexity・Gemini・Google AIオーバービューに商品が引用される | AEO / GEO |
| **② 売れる仕組みを作る** | 認知→興味→検索→購入→口コミの全ファネルコンテンツを自動生成 | AISAS / ジョブ理論 / バリュープロポジション |
| **③ 継続して買い続ける** | ステップメール・ロイヤリティ設計・コミュニティ施策で離脱を防ぐ | 3回購入モデル / コミュニティマーケティング / ダブルファネル |

---

## 2. 理論的根拠（講座4・5より）

### 2-1. なぜ3回購入が重要か

```
初回購入 → 赤字（広告費CPAが回収できない）
2回目   → 損益分岐点
3回目以降 → 投資回収成功・利益創出
```

- パレートの法則: 2割の顧客が8割の売上を支える
- 5:25の法則: 既存顧客を5%増やすと利益が25%改善
- 初回→2回目の橋渡しが最重要（2回目購入時に7割が離脱）

### 2-2. 顧客ロイヤリティ4ステージ

```
見込み客 → 顧客（初回）→ 得意客（2〜3回）→ ロイヤルユーザー（4回以上）
```

各ステージで取るべきアクションが異なる。AIがステージを自動判定し、最適な施策を提案。

### 2-3. ダブルファネル（購買 + インフルエンス）

```
【購買ファネル】         【インフルエンスファネル】
  ↓ 認知                   継続 ↑
  ↓ 興味・関心              紹介 ↑
  ↓ 比較・検討              発信 ↑
  ↓ 購入 ─────────────────→ ここから循環
```

「売った後こそがマーケティングの本番」— インフルエンスファネルを設計することで購買ファネルの認知が自動的に広がる。

### 2-4. AEO/GEO — AI検索で上位表示される7原則

1. **直接回答（Direct Response）**: 答えの冒頭40-60文字で直接回答
2. **数値データ（Numerical Data）**: 具体的な数字・パーセント・期間
3. **引用しやすい構造（Extractable Structure）**: FAQ形式・箇条書き
4. **専門性（Original Expertise）**: 商品固有の知識・体験談
5. **FAQPage Schema**: JSON-LD構造化データ（AI引用率3.2倍）
6. **Product Schema**: GTIN・価格・在庫・評価データ
7. **フレッシュネス**: 「2026年現在」など時事性を示す表現

---

## 3. 実装ファイル一覧

### 新規作成

```
ai-marketing-app/
  lib/
    product-marketing-ai.ts       ← コアエンジン（商品→プラン生成）
  app/api/
    product-marketing/
      route.ts                    ← POST /api/product-marketing
  components/product/
    ProductMarketingPanel.tsx     ← 商品登録UIコンポーネント
```

### 更新

```
ai-marketing-app/lib/gemini.ts   ← UserProfile に products[] を追加
                                     週次アクションが商品ステージを参照
```

---

## 4. API仕様

### POST /api/product-marketing

**リクエストボディ**
```json
{
  "name": "商品名",
  "category": "physical | digital | service | subscription",
  "price": 3980,
  "description": "商品の説明",
  "target": "ターゲット顧客",
  "usp": "独自の強み",
  "purchase_url": "https://...",
  "industry": "ec | salon | restaurant | professional | construction | other"
}
```

**レスポンス（plan オブジェクト）**
```json
{
  "plan": {
    "aeo": {
      "faq_schema_jsonld": "<script type='application/ld+json'>...</script>",
      "product_schema_jsonld": "<script type='application/ld+json'>...</script>",
      "qa_blocks": [{ "question": "Q", "answer": "A" }],
      "meta_description": "150文字以内のAI引用用説明"
    },
    "funnel": {
      "attention": "SNS投稿文（Instagram）",
      "interest": "LP導入文・ブログ冒頭",
      "search": "FAQ比較コンテンツ",
      "action": "セールスコピー＋CTA",
      "share": "レビュー依頼文"
    },
    "retention": {
      "step_emails": [
        { "day": 2, "subject": "件名", "purpose": "目的", "body": "本文" },
        { "day": 7, ... },
        { "day": 14, ... },
        { "day": 21, ... }
      ],
      "loyalty_stages": [
        { "stage": "顧客", "condition": "条件", "action": "施策", "message": "メッセージ" },
        ...4段階
      ],
      "community_tactics": ["施策1", "施策2", "施策3"],
      "vip_event_idea": "VIPイベントアイデア",
      "ugc_campaign": "UGCキャンペーン案"
    },
    "strategy_note": "戦略説明2文",
    "week_actions": [{ "title": "", "detail": "", "content_type": "", "content": "" }]
  }
}
```

---

## 5. ダッシュボードへの統合方法

### 既存 `/dashboard` への追加

```tsx
// app/dashboard/page.tsx に追加
import ProductMarketingPanel from "@/components/product/ProductMarketingPanel";

// ダッシュボード内に新タブまたは新セクションとして追加
<ProductMarketingPanel industry={user.industry} />
```

### 独立ページとして追加する場合

```
app/
  product/
    page.tsx   ← /product ページとして独立
```

---

## 6. Sage連携（GrowlBridge拡張）

Sageのmarket_scan結果に「商品別インサイト」を追加することで、
商品マーケAIの週次アクションをさらに高精度化できる。

### 拡張ポイント（backend/modules/growl_bridge.py）

```python
# 既存のSNSシグナルに加えて、商品カテゴリ別の需要シグナルを追加
# 例: Sage が「オーガニックスキンケア」の需要急増を検知
#     → Growl の ec 業種ユーザーへ「今週はオーガニック訴求強化」のシグナルを送る
```

---

## 7. LearnAI との連携

LearnAI（localhost:8000）でインプットした競合分析・トレンド情報を
商品マーケAIのプロンプトに自動注入することで、
最新の市場動向を反映した販売コンテンツを生成できる。

---

## 8. 今後の拡張ロードマップ

| Phase | 機能 | 優先度 |
|---|---|---|
| Phase 1（今回実装） | 商品インプット→AEO+販売ファネル+リピート生成 | 完了 |
| Phase 2 | 購入回数・最終購入日を自動トラッキングしてステージ自動更新 | 高 |
| Phase 3 | LINE Messaging APIとステップメールを自動連携（Day2/7/14/21配信） | 高 |
| Phase 4 | Supabase に products テーブルを追加し複数商品管理 | 中 |
| Phase 5 | RFM分析（購入頻度・金額・最終購入日）による自動セグメント | 中 |
| Phase 6 | AEOスコアの自動計測（AIに引用された回数を追跡） | 低 |

---

## 9. 使い方（ユーザー向け）

1. Growl アプリを開く
2. 「商品マーケAI」セクションへ移動
3. 商品名・価格・説明・ターゲット・強みを入力（2〜3分）
4. 「マーケティングプランを生成する」をタップ
5. 以下が自動生成される:
   - **今週のアクション3つ**（コピペ用SNS文・メール文付き）
   - **AISAS販売ファネル全5段階**（SNS投稿→LP→FAQ→セールスコピー→レビュー依頼）
   - **リピート購入システム**（ステップメール4通・ロイヤリティ施策・VIPイベント）
   - **AI検索対策コンテンツ**（FAQスキーマ・Product JSON-LD・Q&A5問）

---

## 10. 設計思想の核心

マーケティングとは「売れる仕組みを作り、買い続けてもらう仕組みを作ること」
（講座29: マーケティングにおける価値 より）

このシステムは、その定義を完全にAIで自動化したものです。
専門知識がなくても、商品情報を入力するだけで、
プロのマーケターが設計するレベルの販売・リテンション戦略が手に入ります。
