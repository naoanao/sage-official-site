# 💓 SAGE HEARTBEAT — 24時間自律スケジュール定義ファイル
> このファイルはSageの「生体リズム」を定義します。
> ここに記載された行動はSageが人間の指示なしに自律実行します。
> SOUL.mdの倫理境界線を常に遵守すること。

---

## 🕐 毎時実行（Continuous Pulse）

| 実行間隔 | アクション | モジュール | 優先度 |
|---------|----------|----------|--------|
| 30分ごと | Self-Test Tier1（envチェック・API疎通確認） | `self_test_scheduler.py` | 🔴 Critical |
| 60分ごと | SNS自律投稿トリガーチェック（Notionプール確認） | `sage_automation.py` | 🟠 High |
| 60分ごと | SAGE_STOPファイル存在チェック（ブレーキ監視） | `gatekeeper.py` | 🔴 Critical |
| 60分ごと | APIモニター更新（クォータ残量チェック） | `api_monitor.py` | 🟠 High |

---

## 🌅 毎朝の起動シーケンス（Morning Boot - 08:00 JST）

```
Step 1: SOUL.mdを読み込み、アイデンティティ確認
Step 2: SAGE_STOPチェック → ブレーキなし確認
Step 3: 前日のエラーログ確認 → Self-Healing提案生成
Step 4: API残量チェック（Groq/Gemini/HuggingFace）
Step 5: Notion Content Poolのストック確認（14件未満→自動補充フラグ）
Step 6: MarketScanAgent起動 → 当日トレンドキーワード3〜5個取得
Step 7: 当日の投稿計画をNotionに記録（Tier1 自動）
Step 8: Telegramでオーナーに日次ブリーフィング送信
```

**日次ブリーフィング内容:**
- 前日のSNS投稿パフォーマンス（投稿数・エラー数）
- 今日のトレンドキーワードTop3
- APIクォータ残量（Groq/Gemini）
- コンテンツプール残量（Notion）
- 要注意エラー（あれば）

---

## 📅 時間別 デイリースケジュール

### 08:30 JST — モーニングコンテンツ（Bluesky）
```python
アクション: NotionプールからトピックをPick → Groq生成 → Bluesky投稿
モジュール: sns_daily_scheduler.py
条件: SAGE_STOP未存在 + Groq残量あり + コンテンツプール1件以上
Tier: 1（自動実行）
```

### 09:00 JST — CF Worker SNS自動投稿
```
モジュール: workers/sage-sns-worker/index.js（Cloudflare Cron）
PC不要・毎日確実に実行
Notion→Groq→Bluesky/Instagram
```

### 10:00 JST — MarketScan 本格実行
```python
アクション: Google Trends + Reddit + DuckDuckGo → Groqスコアリング
出力: demand/competition/AI-generabilityスコア付きトピックリスト
配信先: Notion BlogPool + Telegram通知
モジュール: market_scan_scheduler.py
```

### 12:00 JST — ランチタイムコンテンツ（Instagram）
```python
アクション: 画像生成（FLUX.1）+ キャプション生成 → Instagram投稿
条件: Instagram token有効 + 前回投稿から4時間以上経過
Tier: 1（自動実行）
```

### 14:00 JST — ブログ生成パイプライン
```python
アクション: MarketScanトップキーワード → SEOブログ記事生成
プロセス: pytrends→Groq→MDX→git push→CF Pages自動デプロイ
頻度: 週5本（月〜金）
モジュール: blog_scheduler.py
Tier: 1（自動実行）
```

### 16:00 JST — EngagementBot（返信・共感）
```python
アクション: Bluesky/Instagramのコメント・返信をAI生成して返答
頻度: 1日3回（08:00/13:00/18:00 JST）
ルール: SOUL.mdの誠実さ・禁止表現を厳守
モジュール: engagement_bot.py
```

### 18:00 JST — ブログ×Gumroad クロスプロモーション
```python
アクション: 新しいブログ記事 + Gumroad商品 → SNS宣伝投稿
モジュール: gumroad_scheduler.py
Tier: 1（自動実行）
```

### 20:00 JST — SICAループ（自己改善）
```python
アクション: 当日のログ分析 → コード改善提案生成 → sica_proposals.jsonに記録
モジュール: sica_loop.py
注意: 提案はオーナー確認後に適用（Tier 3）
```

### 23:00 JST — Notion日報同期
```python
アクション: 当日のgit commits + 実行ログ → Notionに自動日報
モジュール: notion_sync_scheduler.py
内容: 完了タスク・エラー・SNS成果・明日の計画
```

### 03:00〜05:00 JST — ドリームモード（Dream Mode）★新機能
```python
概念: 人間が最も眠っている時間帯に「創造的な組み合わせ」を試みる
アクション:
  1. ChromaDB/Neuromorphic Brainから過去30日の高パフォーマンスコンテンツ取得
  2. MarketScanの最新トレンドと組み合わせ
  3. 翌朝のコンテンツ候補「アイデアリスト5件」を生成
  4. Notionの「Dream Ideas」ノートに自動追記
  5. Telegramでオーナーに「今夜のひらめき」を送信
実装ファイル: backend/modules/dream_mode.py（要新規作成）
Tier: 1（自動実行）
```

---

## 📆 週次スケジュール（Weekly Rhythm）

| 曜日 | 時間 | アクション | モジュール |
|-----|------|----------|----------|
| **月曜** | 09:00 | 週間市場スキャン（週次トレンド取得） | market_scan_scheduler.py |
| **月曜** | 10:00 | コンテンツプール補充（14件未満なら20件補充） | cf-content-replenisher |
| **水曜** | 14:00 | A/Bテスト結果分析（EvolutionEngine） | evolution_engine.py |
| **金曜** | 16:00 | 週次パフォーマンスレポート生成 → Notion + Telegram | sage_audit.py |
| **日曜** | 09:00 | CF Worker コンテンツ補充（週1回確実実行） | sage-content-replenisher |
| **日曜** | 20:00 | Self-Test Tier3（24時間深層診断） | self_test_scheduler.py |

---

## 📊 月次スケジュール（Monthly Cycle）

| 実行タイミング | アクション | 担当 |
|-------------|----------|------|
| 毎月1日 | 先月の全KPIレポート生成（ブログPV・SNSエンゲージメント・収益） | MonetizationMeasure |
| 毎月1日 | Gumroad商品・SEO戦略を市場トレンドに合わせて更新提案 | NicheValidator |
| 毎月15日 | LLMコスト分析（Groq/Gemini使用量） → 最適化提案 | APIMonitor |
| 毎月末日 | SOUL.md・HEARTBEAT.mdのレビュー提案をTelegramに送信 | SICA |

---

## 🚨 緊急停止条件（Emergency Brake Triggers）

以下の条件を検知した場合、Sageは**すべての自律アクションを即座に停止**し、Telegramでオーナーにアラートを送信する。

```
1. SAGE_STOPファイルを検知
2. APIコスト/日が設定上限（ENV: SAGE_DAILY_COST_LIMIT）を超過
3. エラーレート/時が30%を超過（10回中3回以上失敗）
4. 同一コンテンツを重複投稿しようとした場合
5. セキュリティレジャーに異常なアクセスパターンを検知
6. Gatekeeperがアクションを3連続拒否
```

---

## 📡 Moltbook Heartbeat（AI-SNS 自律サイクル）★新機能

```
実行間隔: 4時間ごと（OpenClaw標準と同様）
アクション:
  1. Moltbook APIにハートビート送信（エージェント生存確認）
  2. フィードをチェック → 関連投稿にコメント
  3. SOUL.mdに基づいたAI視点の投稿を1件生成・投稿
  4. 他AIエージェントをフォロー（AIテクノロジー関連のみ）
実装ファイル: backend/integrations/moltbook_agent.py（要新規作成）
Tier: 1（自動実行）
認証: MOLTBOOK_API_KEY（.envに追加）
```

---

## ⚙️ スケジューラー実装マップ

現在のスケジューラーとHEARTBEATの対応:

```
Flask起動時に自動スタート:
  ├── SelfTestScheduler（30分・2時間・24時間）← 稼働中 ✅
  ├── SNSDailyScheduler（スケジュール投稿）← 稼働中 ✅
  ├── BlogScheduler（毎日）← 稼働中 ✅
  ├── MarketScanScheduler（定期スキャン）← 稼働中 ✅
  ├── NotionSyncScheduler（コミット毎）← 稼働中 ✅
  ├── GumroadScheduler（週次）← 稼働中 ✅
  ├── DreamMode（03:00〜05:00）← ★要実装
  └── MoltbookAgent（4時間毎）← ★要実装

CF Workers（PC不要・常時稼働）:
  ├── sage-sns-worker（毎日09:00 JST）← 稼働中 ✅
  └── sage-content-replenisher（毎週日曜）← 稼働中 ✅
```

---

## 📝 このファイルの使い方

1. **Sageの新しいスケジュールを追加**したい → このファイルに記載し、対応する`backend/scheduler/`にコードを追加
2. **既存スケジュールを変更**したい → このファイルを先に更新し、コードを後から合わせる
3. **スケジュールを一時停止**したい → `.env`で`HEARTBEAT_[名前]_ENABLED=false`を設定
4. **全停止**したい → `SAGE_STOP`ファイルをプロジェクトルートに作成

```
最終更新: 2026-04-14
バージョン: 4.0
```
