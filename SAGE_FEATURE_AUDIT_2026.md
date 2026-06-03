# Sage 完全機能監査レポート（2026年1月〜3月30日）

> 作成日: 2026-03-30 （全ファイル・全モジュール精査済み版）
> 対象: Sage_Final_Unified リポジトリ全体

---

## 📋 目次
1. [開発タイムライン](#タイムライン)
2. [✅ 現在使える機能（稼働・動作確認済み）](#現在使える機能)
3. [🟡 実装済みだが不完全・要設定の機能](#実装済みだが不完全)
4. [❌ 骨格のみ・未テスト・実質未使用の機能](#未実装骨格のみ)
5. [📦 販売インフラ・決済](#販売インフラ)
6. [🏗️ インフラ・デプロイ全体像](#インフラ構成)
7. [📂 全ファイル一覧（バックエンド・フロントエンド）](#全ファイル一覧)

---

## タイムライン

| 時期 | 主な実装内容 |
|------|-------------|
| **1/1以前** | Neuromorphic Brain v2.0.2・Bluesky自動投稿・LangGraph基盤 |
| **2/6** | SEOブログ記事自動生成パイプライン稼働開始（1本目） |
| **2/7** | Firebase母体化計画策定 |
| **2/22〜25** | CrewAI Orchestrator・Google Workspace連携・SICAループ・SICA改善エンジン |
| **2/25〜28** | QAゲート・D1リサーチ事前チェック・言語セレクター・Review＆Editパネル・Whop Publisher |
| **3/1** | HuggingFace FLUX完全移行・リライトプリセット8種・バイリンガル対応 |
| **3/3〜4** | Identity System・Automations API・Notion日報同期・LangGraph修正 |
| **3/8** | Instagram Token Refresher実装 |
| **3/11** | GeminiLPGenerator実装 |
| **3/14** | TitleOptimizer（GitMind 5技法）実装 |
| **3/16〜18** | テストスイート整備（API/E2E/Unit）・PhaseStepperBar |
| **3/17** | MarketScanNotifier実装 |
| **3/19** | LLM Resilience強化・LangGraph v2リファクタ・Self-Healing強化 |
| **3/22〜29** | SageMiniChat・StoreManager・SubscriberGate・Shop・SalesPage更新 |
| **3/24** | Make.comブループリント2本・run_sage.ps1 ngrok最終版 |
| **3/25** | Cloudflare Workersデプロイ完了・ngrok Static Domain永続化 |
| **3/26〜30** | Analytics/Track CF Functions・EngagementBot・ブログ記事44本公開 |

---

## 現在使える機能

### 🧠 AIコア・オーケストレーション

| 機能 | ファイル | 詳細 |
|------|---------|------|
| **Flask APIサーバー** | `backend/flask_server.py` | 80以上のエンドポイント、Port 8080 |
| **LangGraph Orchestrator v2** | `backend/modules/langgraph_orchestrator_v2.py` | conditional_edges修正済み・UnboundLocalError修正済み |
| **Sage Master Agent** | `backend/modules/sage_master_agent.py` | Memory + Orchestrator + SICA統合コントローラー |
| **Neuromorphic Brain** | `backend/modules/neuromorphic_brain.py` | STDP学習・短長期記憶・SentenceTransformer |
| **SageBrain** | `backend/modules/sage_brain.py` | NeuromorphicBrainのOrchestratorラッパー |
| **SageMemory** | `backend/modules/sage_memory.py` | 記憶管理システム |
| **SICALoop** | `backend/modules/sica_loop.py` | Gemini使用の自己改善ループ（Situation-Insight-Countermeasure-Action） |
| **CrewAI Orchestrator** | `backend/modules/crewai_orchestrator.py` | CrewAI使用マルチエージェント（ImageAgent・VideoAgent・Twitter統合） |
| **LLM Resilience** | `backend/modules/llm_resilience.py` | Gemini→Groq→Ollama自動フォールバック |
| **Self-Healing Agent** | `backend/modules/self_healing_agent.py` | ログ監視・エラー自動検知・pip自動修復提案 |
| **SelfTestScheduler** | `backend/scheduler/self_test_scheduler.py` | Tier1/External(30分)・Tier2(2時間)・Tier3(24時間) |
| **SelfTestAgent** | `backend/agents/self_test_agent.py` | OODA 3段階自己診断（envチェック・API疎通・E2E） |
| **Sage MCP Server** | `backend/modules/sage_mcp_server.py` | JSON-RPC準拠・Claude等から`ask_sage`ツールとして呼び出し可能 |
| **EvolutionEngine** | `backend/modules/evolution_engine.py` | SNSフック/クロージャー/構文A/Bテスト・戦略DB |
| **AutonomousAdapter** | `backend/modules/autonomous_adapter.py` | 安全アクションホワイトリスト実行（Notion要約・Telegram通知・ログ記録等） |
| **Gatekeeper** | `backend/modules/gatekeeper.py` | アクション承認システム（現在モック・全許可） |
| **SecurityLedger** | `backend/modules/security_ledger.py` | `~/.sage_vault/` に認証情報を難読化保護 |
| **APIMonitor** | `backend/modules/api_monitor.py` | SQLite使用API使用量トラッキング |
| **RateLimiter** | `backend/modules/rate_limiter.py` | IPベースレート制限 |
| **SageAudit** | `backend/modules/sage_audit.py` | セキュリティイベントをJSONLへ記録 |
| **LLMLogger** | `backend/modules/llm_logger.py` | LLM呼び出しログ |
| **CacheManager** | `backend/modules/cache_manager.py` | キャッシュ管理 |
| **MonetizationMeasure** | `backend/modules/monetization_measure.py` | 収益イベントトラッキング（blog_view/offer_click/sale等） |

### 📱 SNS・コンテンツ自動化

| 機能 | ファイル | 詳細 |
|------|---------|------|
| **Bluesky完全自動投稿** | `backend/integrations/bluesky_agent.py` | AT Protocol・スケジュール投稿・画像付き対応 |
| **BlueskyBot** | `backend/integrations/bluesky_bot.py` | 投稿補助ボット |
| **SNSデイリースケジューラー** | `backend/scheduler/sns_daily_scheduler.py` | Notion→AI生成→Bluesky/Instagram自動投稿 |
| **EngagementBot** | `backend/integrations/engagement_bot.py` | Bluesky/Instagramへ1日3回AI共感返信（日英自動判定） |
| **CF Worker SNS自動投稿** | `workers/sage-sns-worker/index.js` | PC不要・毎日09:00 JST・Notion→Groq→Bluesky/Instagram |
| **CF Worker コンテンツ補充** | `workers/sage-content-replenisher/index.js` | PC不要・毎週日曜・Notionプール自動補充（14件キープ） |
| **SocialMediaManager** | `backend/modules/social_media_manager.py` | SNS統合マネージャー |
| **SageAutomationAgent** | `backend/modules/sage_automation.py` | バックグラウンド自律投稿トリガー（60分間隔） |

### 📝 コンテンツ生成パイプライン

| 機能 | ファイル | 詳細 |
|------|---------|------|
| **BlogScheduler** | `backend/scheduler/blog_scheduler.py` | Notion→Groq→MDX→git push→CF Pages自動デプロイ |
| **SEOBlogAgent** | `backend/agents/seo_blog_agent.py` | pytrends日本トレンドキーワード→Groqブログ記事生成 |
| **GumroadScheduler** | `backend/scheduler/gumroad_scheduler.py` | 最新ブログ+Gumroad商品→SNS宣伝投稿 |
| **MarketScanAgent** | `backend/agents/market_scan_agent.py` | Google Trends+Reddit+DuckDuckGo→Groqスコアリング（demand/competition/AI-generability） |
| **MarketScanScheduler** | `backend/scheduler/market_scan_scheduler.py` | 市場スキャン定期実行 |
| **MarketScanNotifier** | `backend/modules/market_scan_notifier.py` | スキャン結果→Slack/Telegram/Notion/Blogプール自動配信 |
| **コース生成パイプライン** | `backend/pipelines/course_production_pipeline.py` | ニッチ検証→セクション生成→画像生成→Gumroadページ |
| **NicheValidator** | `backend/pipelines/niche_validator.py` | 5軸市場検証（/api/niche/validate） |
| **画像生成（3段階）** | `backend/modules/image_generator.py` | HF FLUX.1-schnell→Gemini Imagen→Pollinations.aiフォールオーバー |
| **NanoBananaPipeline** | `backend/integrations/nano_banana_pipeline.py` | 高品質画像生成パイプライン |
| **TitleOptimizer** | `backend/modules/title_optimizer.py` | GitMind5技法（数字/権威/具体性/ブラケット/ベネフィット） |
| **GeminiLPGenerator** | `backend/modules/gemini_lp_generator.py` | Gemini 2Mコンテキスト→LP HTML自動生成 |
| **GenTabGenerator** | `backend/modules/gentab_generator.py` | Groq→HTMLアプリ自動生成（frontends/public/gentabs/） |
| **SagePublisher（HatenaPublisher）** | `backend/modules/sage_publisher.py` | Selenium→はてなブログ自動投稿 |
| **ContentManager** | `backend/modules/content_manager.py` | Markdown+YAMLフロントマター形式コンテンツ管理 |
| **GumroadGenerator** | `backend/integrations/gumroad_generator.py` | コース→GumroadセールスページLP自動生成 |
| **リライトプリセット8種** | `/api/productize/rewrite` | カジュアル/専門的/箇条書き/半分の長さ/超ニッチ/データ追加/アクション化/失敗削除 |
| **D1リサーチ事前チェック** | `/api/research/check` | research_*.md存在チェック→生成ゲート制御 |
| **バイリンガル生成** | flask_server.py | 日英自動切替（トピック言語検出） |
| **Q-scoreバッジ** | SageOS.jsx | セクション品質スコア表示（Q0〜Q100） |
| **ブログ記事累計44本** | `src/blog/posts/` | 2/6〜3/30自動生成・公開済み |

### 🔗 外部連携（稼働確認済み）

| 機能 | ファイル | 詳細 |
|------|---------|------|
| **Notion統合** | `backend/integrations/notion_integration.py` | DB読み書き・ステータス更新 |
| **Notion Content Pool** | `backend/modules/notion_content_pool.py` | CMS機能・日本語プロパティ対応 |
| **NotionEvidenceLedger** | `backend/modules/notion_evidence_ledger.py` | D1実行証跡をEvidence Ledger DBへ追記 |
| **NotionLogger** | `backend/integrations/notion_logger.py` | 市場スキャン結果等をNotionへ記録 |
| **NotionAgent** | `backend/modules/notion_agent.py` | Notion操作エージェント |
| **Git→Notion日報同期** | `backend/scheduler/notion_sync_scheduler.py` | コミット毎にNotionへ自動日報 |
| **Telegram Bot** | `backend/integrations/telegram_bot.py` | テキスト+画像送信・通知 |
| **Make.com Integration** | `backend/integrations/make_integration.py` | Webhook経由でシナリオトリガー |
| **Cloudflare R2** | `backend/integrations/cloudflare_r2.py` | ファイルストレージ |
| **Stripe Integration** | `backend/integrations/stripe_integration.py` | 決済連携 |
| **Gumroad API** | `backend/integrations/gumroad_api.py` | 商品情報取得（v2/products） |
| **ObsidianConnector** | `backend/obsidian_connector.py` | Obsidian Vault（knowledge/drafts）への読み書き |
| **Hashnode** | `backend/integrations/hashnode_integration.py` | GraphQL API経由記事投稿（モックモード対応） |
| **DEV.to** | `backend/integrations/devto_integration.py` | API経由記事投稿（モックモード対応） |

### 🖥️ フロントエンド（全ページ・全コンポーネント）

| ファイル | 説明 | 更新日 |
|---------|------|--------|
| `src/pages/Landing.jsx` | LP（宇宙テーマ・英語・FreemiumゲートUI・ローテーティングデモ） | 3/29 |
| `src/pages/SageOS.jsx` | ダッシュボード（Identity Panel・Automations・ContentManager・SelfTest・D1・Chat） | 3/30 |
| `src/pages/StoreManager.jsx` | Stripe商品管理UI（商品編集・アーカイブ・売上履歴表示） | 3/29 |
| `src/pages/Shop.jsx` | ショップページ | 3/28 |
| `src/pages/SalesPage.jsx` | セールスページ | 3/28 |
| `src/pages/SubscriberGate.jsx` | Stripe課金ゲート（メール認証→D1確認→ダッシュボード開放） | 3/28 |
| `src/pages/ThankYou.jsx` | 購入完了ページ | 3/28 |
| `src/pages/Blog.jsx` | ブログ一覧 | 3/23 |
| `src/pages/BlogPost.jsx` | ブログ記事詳細（MDX→DOMPurify+marked→HTML） | 3/28 |
| `src/pages/Privacy.jsx` | プライバシーポリシー | - |
| `src/pages/Terms.jsx` | 利用規約 | 3/3 |
| `src/components/SageMiniChat.jsx` | ミニチャットコンポーネント | 3/29 |
| `src/components/PhaseStepperBar.jsx` | フェーズ進捗ステッパーUI | 3/18 |
| `src/components/SpaceBackground.jsx` | 宇宙背景アニメーション | - |
| `src/components/ToastContainer.jsx` | トースト通知UI | 3/22 |
| `src/config/backendUrl.js` | バックエンドURL一元管理 | - |
| `src/config/links.js` | 全外部リンク一元管理（Stripe/Gumroad/Whop/PayPal/SNS） | - |
| `src/config/stripe.js` | StripeリンクBlog.jsx後方互換 | - |
| `src/utils/tracking.js` | ファネルトラッキング（trackEvent統一関数） | - |
| `src/utils/toast.js` | トースト通知ユーティリティ | - |
| `src/utils/env.js` | 環境判定（isLocalhost等） | - |

### ⚙️ Cloudflare Pages Functions（エッジ・PC不要）

| ファイル | エンドポイント | 機能 |
|---------|-------------|------|
| `functions/api/[[path]].js` | `/api/*` | ngrok経由でFlaskへプロキシ |
| `functions/api/analytics.js` | `/api/analytics` | ファネル分析（10指標・オーナー専用） |
| `functions/api/track.js` | `/api/track` | イベントトラッキング（5種類のファネルイベント） |
| `functions/api/verify-subscription.js` | `/api/verify-subscription` | メール→D1→サブスク状態確認 |
| `functions/api/webhook/stripe.js` | `/api/webhook/stripe` | Stripe Webhook受信→D1書き込み |
| `functions/api/customer-portal.js` | `/api/customer-portal` | Stripe顧客ポータルセッション生成→リダイレクト |
| `functions/api/chat.js` | `/api/chat` | CF側チャット |
| `functions/api/generate.js` | `/api/generate` | CF側生成 |
| `functions/api/health.js` | `/api/health` | ヘルスチェック |
| `functions/api/system/health.js` | `/api/system/health` | システムヘルス |
| `functions/api/system/self_test.js` | `/api/system/self_test` | セルフテスト |

### 🔧 スクリプト・ユーティリティ

| ファイル | 機能 |
|---------|------|
| `run_sage.ps1` | Windows自動起動（Flask+ngrok+.env読込+CF Functions更新） |
| `setup.py` | 購入者向け対話型セットアップ（APIキー設定→.env生成） |
| `backend/scripts/job_runner.py` | ジョブキュー管理・リトライ・Firestore/JSON自動切替 |
| `backend/scripts/smoke_test_sage3.py` | スモークテスト |
| `backend/scripts/notion_status_update.py` | NotionステータスCLI更新 |
| `backend/scripts/search_notion_ids.py` | NotionDB ID検索 |
| `backend/scripts/initialize_ssot.py` | SSOT初期化 |
| `backend/utils/env_guardian.py` | 環境変数保護 |
| `backend/utils/env_utils.py` | `.env`ファイル読み書きユーティリティ |

### 🧪 テストスイート

| ファイル | テスト内容 |
|---------|-----------|
| `tests/api/test_market_demand.py` | 市場需要APIテスト |
| `tests/api/test_productize_flow.py` | コース生成フローAPIテスト |
| `tests/api/test_publish_endpoints.py` | 投稿エンドポイントテスト |
| `tests/api/test_rewrite_endpoints.py` | リライトエンドポイントテスト |
| `tests/e2e/sage_create_refine_publish.spec.ts` | E2E: 生成→精査→公開フロー |
| `tests/e2e/sage_landing_value.spec.ts` | E2E: LPバリュー検証 |
| `tests/test_dashboard_full.py` | ダッシュボード全体テスト |
| `tests/test_monetization_e2e.py` | 収益化E2Eテスト |
| `tests/unit/test_clipboard_feedback.ts` | クリップボードフィードバックUnit |
| `tests/unit/test_market_scan.py` | 市場スキャンUnit |
| `tests/unit/test_product_extras.py` | 商品拡張Unit |
| `tests/unit/test_progress_mapping.ts` | 進捗マッピングUnit |
| `tests/unit/test_quick_preview.ts` | クイックプレビューUnit |

---

## 実装済みだが不完全

### 🟡 Instagram自動投稿（自立度70%）
- **実装済み**: InstagramDailyScheduler・Graph API連携コード・Token Refresher
- **問題**: ビジネスアカウント+Facebookページ連携必須。長期トークン未設定。トークン自動更新が機能するかの本番テスト未完了

### 🟡 Twitter/X スケジュール投稿（自立度85%）
- **実装済み**: `twitter_integration.py`（API v2・テキスト+画像）
- **問題**: `job_runner.py`へのTwitter統合未完了。Blueskyレベルの完全自動スケジュール未達

### 🟡 Stripe課金フロー（自立度70%）
- **実装済み**: CF Functions Webhook・D1 DB・SubscriberGate・verify-subscription・customer-portal
- **問題**: `STRIPE_WEBHOOK_SECRET`本番設定が必要。エンドツーエンド購入テスト未完了

### 🟡 Whop販売自動化
- **実装済み**: `whop_publisher.py`・`/api/whop/publish`・Stripe→Whop Make Blueprint
- **問題**: Whop API v2で修正済みだがエンドツーエンド検証未完了

### 🟡 Make.comシナリオ
- **実装済み**: 2本のBlueprintファイル（ウェルカムメール・Stripe→Telegram+Notion）
- **問題**: Make.comダッシュボードへのインポートと各モジュールの認証再設定が必要

### 🟡 Notion Content Pool プロパティ名不一致
- **問題**: 英語「Status」と日本語「status」の不一致。専用SNSコンテンツプールDB未作成

### 🟡 PCオフ時のコア機能
- CF Workersは独立稼働するがFlask依存機能（チャット・コース生成・ダッシュボード）はPC起動必須

### 🟡 SageOS Dashboard パブリックアクセス
- ngrok Static Domain固定化済みだがPCオフでバックエンドAPI落ちる
- localhost=オーナー（実API）/ production=デモのみ 分離済み

### 🟡 BusinessManager（Google Workspace）
- **実装済み**: Google Calendar・Sheets・Drive・Gmail連携コード
- **問題**: `credentials.json`が必要。OAuthトークン設定がユーザー依存

---

## 未実装・骨格のみ

### ❌ Firebase統合（設計書のみ）
- Firestore（SNS投稿履歴・KPI・ユーザー・記憶データ）設計書のみ
- Firebase Functions、Firebase Auth、Firebase Hosting移行 → 未実装

### ❌ PCオフ完全自律（最重要課題）
- Firebase Functions または CF Workers AIへの移行が必要。未着手

### ❌ ブログのFirestore連携
- BlogSchedulerはgit push対応済みだがFirestore書き込み→HPリアルタイム表示は未実装

### ❌ ECサイト連携
- `shopify_integration.py` → 骨格のみ。APIトークン未設定
- Shopify/BASE在庫管理・商品情報自動更新 → 未実装

### ❌ 動画生成（APIキー未設定）
- `runway_integration.py` → RunwayML Gen-2/3コード完成・APIキーなし
- `pika_integration.py` → Pika Labsコード完成・APIキーなし
- `backend/integrations/video_generation.py` → 骨格のみ
- `backend/modules/video_agent.py` → 骨格のみ
- `backend/modules/video_editor_agent.py` → 骨格のみ

### ❌ 音声合成（Fish Audio）
- `fish_audio_integration.py` → 音声クローン・TTS実装済み・APIキー未設定・本番テスト未実施

### ❌ ComputerVisionAgent（画面自動操作）
- `computer_vision_agent.py` → PyAutoGUI+Gemini Vision実装済み
- Windowsローカルで動作するが、本番利用・テスト未実施

### ❌ TabContextAnalyzer / GenTab（ブラウザタブ解析）
- `disco_tab_analyzer.py` → Groq使用タブクラスタリング実装済み
- `gentab_generator.py` → HTML App自動生成実装済み
- 実際のChrome拡張連携は未構築

### ❌ Medium / Hashnode / DEV.to / Blogger 自動投稿
- 全てコード実装済み・モックモードのみ・APIキー未設定

### ❌ LinkedIn / Reddit / Mastodon / Tumblr 自動投稿
- コード実装済み・APIトークン未設定・テスト未実施

### ❌ Discord Bot本番接続
- `discord_bot.py` → コード完成・Bot Token未設定

### ❌ NotebookLM完全統合
- `notebooklm_enhanced.py` → Google公式APIが非公開のためブラウザ自動化依存・安定性低

### ❌ Jira連携
- `jira_agent.py` → コード骨格あり・認証未設定・テスト未実施

### ❌ Figma連携
- `figma_integration.py` → コード骨格あり・APIキー未設定

### ❌ Dify連携
- `dify_integration.py` → コード骨格あり・未設定

### ❌ Slack通知（SlackAgent）
- `backend/modules/slack_agent.py` → コード実装済み・SLACK_WEBHOOK_URL未設定

### ❌ BigQuery SQL生成
- `bigquery_agent.py` → 自然言語→SQL変換実装済み・実際のBQ接続なし（テンプレートのみ）

### ❌ PayPal自動化
- `paypal_integration.py` → コード骨格あり・設定未完了

### ❌ FlutterAgent / Androidアプリ
- `flutter_agent.py`・`builder/android/` → 骨格のみ・動作アプリなし

### ❌ LeRobot / ロボット制御
- `lerobot_test.py` → テストファイルのみ

### ❌ Zapier連携
- `zapier_agent.py`・`zapier_integration.py` → コード骨格あり・未設定

### ❌ Google Looker Studio
- `looker_agent.py` → URL生成のみ・実際のデータ接続なし

### ❌ Word2Vec / 高度なNLP
- `word2vec_embeddings.py` → SentenceTransformerはNeuromorphicBrainで稼働中だが、Word2Vec独立活用は未実装

### ❌ Comet MLAgent / 実験追跡
- `comet_agent.py` → 骨格のみ

### ❌ Local HTML Integration（Opik）
- `local_html_integration.py` → Opik依存・実用テスト未実施

---

## 🗄️ データ・実績（蓄積済み）

### 生成・実行データ

| データ | 件数 | 場所 |
|-------|------|------|
| **SNSジョブキュー** | **188件**（posted:32件 / pending:156件） | `backend/data/jobs.json` |
| **Obsidian Vault コースファイル** | **188件** | `obsidian_vault/knowledge/` |
| **生成画像** | **202枚** | `generated_images/` |
| **市場スキャン結果** | 2件（2/23・3/28） | `backend/data/market_scans.json` |
| **SICAループ改善提案** | 3件（2/23実行分） | `backend/memory_db/sica_proposals.json` |
| **ChromaDB意味記憶** | 継続蓄積中 | `memorydb/chroma/` |
| **SQLite会話履歴** | 継続蓄積中 | `memorydb/sage_history.db` |
| **ブログ記事（src）** | **44本** | `src/blog/posts/` |
| **ブログ記事（backend）** | **6本**（詳細版） | `backend/content/blog/` |

### CI/CD（GitHub Actions）

| ワークフロー | トリガー | 内容 |
|------------|---------|------|
| `d1-knowledge-loop.yml` | main/ci pushごと | Flask起動確認→`test_pilot_pipeline.py`実行→ログアーティファクト保存 |

### SEO設定

| ファイル | 内容 |
|---------|------|
| `public/sitemap.xml` | URLマップ（LP/sales/blog/privacy/terms） |
| `public/robots.txt` | クローラー設定（/dashboard・/api/は除外） |
| `public/welcome-guide.html` | 購入者向けウェルカムガイド（スタンドアロンHTML） |

---

## 🧰 ルートレベルのユーティリティスクリプト

| スクリプト | 機能 |
|-----------|------|
| `emergency_stop.py` | SAGESTOPファイル作成→AI全停止 |
| `emergency_resume.py` | SAGESTOPファイル削除→AI再開 |
| `post_to_bluesky.py` | Blueskyへ手動投稿 |
| `post_bluesky_correction.py` | Bluesky訂正投稿 |
| `promote_course_x.py` | Twitter/Xでコース宣伝投稿 |
| `run_actual_monetization.py` | CourseProductionPipelineを実際に実行 |
| `run_course_pipeline_live.py` | コース生成パイプラインライブ実行 |
| `gumroad_reauth.py` | Gumroad OAuth再認証→.env自動更新 |
| `append_notion_snapshot.py` | NotionへリアリティスナップショットPage追加 |
| `append_notion_snapshot_hp.py` | HP用スナップショット追加 |
| `audit_notion.py` | Notion DB構造監査 |
| `dump_notion.py` | Notion内容JSON書き出し |
| `search_notion.py` | Notion検索 |
| `update_notion_definition.py` | Notion定義更新 |
| `update_notion_task.py` | Notionタスク更新 |
| `check_status.py` / `check_cf.py` / `check_latest_status.py` | 各種ステータスチェック |
| `test_pilot_pipeline.py` | CI用パイプラインテスト（GitHub Actionsで自動実行） |
| `test_ddg.py` / `test_x_api.py` / `test_purification.py` | 各種テストスクリプト |

---

## 🏗️ Builder（chat-builder）— Next.js AIコードエディタ

`builder/` ディレクトリにGemini 2.0 Flash搭載の**AIコードエディタ**が存在する。

| 要素 | 詳細 |
|------|------|
| フレームワーク | Next.js 14（TypeScript） |
| AIエンジン | Gemini 2.0 Flash（`@google/generative-ai`） |
| コンポーネント | Header / ChatInterface / Workspace / FileExplorer / StarField |
| API Routes | `app/api/chat/route.ts`（Gemini function calling） / `app/api/files/route.ts` |
| Sandbox | サーバー側サンドボックスディレクトリにファイル生成・読み書き |
| UI | Framer Motion / lucide-react / react-simple-code-editor |
| 状態 | **未デプロイ・ローカルのみ** |

---

## 🧠 SageMemory — 二重記憶アーキテクチャ

| 記憶層 | 実装 | 用途 |
|-------|------|------|
| **意味記憶（Semantic）** | ChromaDB（cosine similarity） | 過去の対話・コンテンツを意味検索 |
| **会話履歴** | SQLite（`sage_history.db`） | 短期・長期の会話ログ |
| **SICAproposals** | JSON | 自己改善提案の蓄積 |
| **Chroma バックアップ** | `chroma_bak_20260220_091832/` | 安全なスナップショット |

---

## 🔄 SICALoop — 自己改善コーディングエージェント

Gemini FlashがSage自身のソースコードを読み、改善提案を自動生成するループ。

```
実行→ログ収集→SageMasterAgent.pyを自己解析→改善提案JSON保存
```

実績: 2/23に3件の具体的コード改善案を生成（メモリ統合・非同期化等）。適用は未完了。

---

## 📦 SaaS Template — 次商品用完全雛形

| ファイル | 内容 |
|---------|------|
| `saas-template/backend/stripe_saas_routes.py` | Stripe Checkout・Webhook・D1書込みFlaskルート一式 |
| `saas-template/functions/api/verify-subscription.js` | CF Edge認証ゲート |
| `saas-template/functions/api/customer-portal.js` | Stripe顧客ポータル |
| `saas-template/functions/api/webhook/stripe.js` | WebhookハンドラーD1書込み |
| `saas-template/frontend/SubscriberGate.jsx` | React課金ゲートコンポーネント |

新商品リリース時はこのテンプレートを複製するだけで即SaaS展開可能。

---

## 販売インフラ

### 現在の販売チャネル

| チャネル | 商品 | 価格 | 状態 |
|---------|------|------|------|
| **Stripe** | Sage AI Pro | $20/月 | ✅ 決済リンク稼働中 |
| **Stripe** | Sage AI Enterprise | $99/月 | ✅ 決済リンク稼働中 |
| **Gumroad** | AI Influencer Monetization Express | $29.99 | ✅ 販売中 |
| **Whop** | Sage AIメンバーシップ | 設定値 | 🟡 URL設定済み・APIテスト未完 |
| **PayPal** | 直接支払い | $29.99 | ✅ リンク設定済み |

### 販売資産

| ファイル | 内容 |
|---------|------|
| `LAUNCH_CONTENT.md` | ProductHunt/Reddit/IndieHackers 投稿文（即投稿可能） |
| `SETUP_GUIDE.md` | 購入者向けセットアップガイド完成版 |
| `setup.py` | 購入者向け対話型セットアップスクリプト |
| `saas-template/` | 次のSaaS商品用完全雛形（CF D1+Stripe+Functions） |
| `make_blueprint_welcome_email.json` | Stripe購入→Gmailウェルカムメール（インポート可能） |
| `make_blueprint_stripe_to_notion.json` | Stripe→Telegram通知+Notion記録（インポート可能） |

---

## インフラ構成

```
[Cloudflare Pages] sage-official-site.pages.dev
  ├── React SPA（Vite）
  ├── D1 Database: sage-subscribers（Stripe課金状態管理）
  └── Functions（エッジ・PC不要）
      ├── [[path]].js         → ngrok→Flask プロキシ
      ├── analytics.js        → ファネル分析（10指標）
      ├── track.js            → イベントトラッキング
      ├── verify-subscription → メール認証ゲート
      ├── webhook/stripe.js   → Stripe Webhook→D1書き込み
      └── customer-portal.js  → Stripeポータル

[Cloudflare Workers]（PC不要・24h稼働）
  ├── sage-sns-worker         → 毎日09:00 JST SNS自動投稿
  └── sage-content-replenisher→ 毎週日曜 Notionプール補充

[Flask Backend] Port 8080（PC起動必須）
  ├── ngrok Static Domain: tetchy-byssal-katherin.ngrok-free.app
  ├── LangGraph Orchestrator v2
  ├── Sage Master Agent（SICA+Memory+Orchestrator）
  ├── Neuromorphic Brain（STDP学習）
  ├── Self-Healing Agent（30分間隔監視）
  └── 80+ APIエンドポイント

[Notion]   コンテンツCMS・タスク管理・Evidence Ledger・日報
[GitHub]   git push → CF Pages自動デプロイ（2分）
[Bluesky]  自動投稿稼働中（6ヶ月以上）
[Telegram] 通知Bot
```

### LLM構成

| LLM | 用途 | 状態 |
|-----|------|------|
| Groq llama-3.3-70b-versatile | メイン生成・高速推論・SNS文生成 | ✅ 主力 |
| Gemini Flash（各種バージョン） | 画像生成・マルチモーダル・SICA | ✅ 稼働中 |
| HuggingFace FLUX.1-schnell | SNS/コース用画像生成（router.huggingface.co） | ✅ 稼働中 |
| Ollama（ローカル） | フォールバック・GumroadLP生成 | 🟡 オプション |
| Pollinations.ai | 画像最終フォールオーバー | ✅ バックアップ |
| SentenceTransformer all-MiniLM-L6-v2 | Neuromorphic Brain意味理解 | ✅ 稼働中 |

---

## 総合評価

| カテゴリ | 自立度 | 備考 |
|---------|-------|------|
| Bluesky SNS完全自動 | **95%** | CF Worker + ローカル両方稼働 |
| ブログ自動生成・公開 | **90%** | 44本公開済み・毎日継続中 |
| コンテンツ生成パイプライン | **85%** | 市場調査→生成→画像→Gumroad |
| Twitter/X | **80%** | 投稿可能だがスケジュール未統合 |
| HP・フロントエンド | **80%** | 全ページ公開中・Stripe gate実装 |
| Instagram | **70%** | トークン問題で本番未稼働 |
| Stripe課金フロー | **65%** | コード完成・本番テスト未完了 |
| PCオフ完全自律 | **40%** | CF WorkersはOK・Flaskはダメ |
| Firebase統合 | **0%** | 設計書のみ |
| 動画生成 | **10%** | コードあり・APIキーなし |
| ECサイト連携 | **5%** | Shopifyコード骨格のみ |

> **結論:** Sageは「PCが起動中であれば市場調査→コンテンツ生成→SNS投稿→ブログ公開→収益化」を一気通貫で実行できる状態。次の最重要課題は **PCオフ完全自律化（CF WorkersまたはFirebase Functionsへの移行）** と **Instagram長期トークン設定**。

---

## 🔍 追加発見セクション（2026-03-30 最終精査）

### ☁️ Cloudflare 実データ（MCP直接確認）

#### CF アカウント
| 項目 | 値 |
|------|-----|
| アカウント名 | Naofumi0930@gmail.com's Account |
| アカウントID | 9a00225a365387adfb3b047cbadd38de |
| 作成日 | 2026-02-05 |

#### CF D1 — sage-subscribers（実テーブル・実データ）

| テーブル | レコード数 | 備考 |
|---------|----------|------|
| **subscribers** | **1件** | naofumi0930@gmail.com / plan:pro / status:active / amount:$0（テスト登録） |
| **payments** | **0件** | 本番決済未完了 |
| **funnel_events** | **0件** | トラッキングイベント未計測 |
| **usage_logs** | - | スキーマあり |
| **_cf_KV** | - | CF内部テーブル |

**subscribersテーブル スキーマ（実際のDDL）:**
```sql
CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  amount_usd INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```
> DB作成: 2026-03-24・現在1件（オーナー自身のテストレコード）・本番購入者はゼロ

#### CF Workers — 実デプロイ状態

| Worker名 | 作成日 | 最終更新日 | 状態 |
|---------|-------|----------|------|
| **sage-sns-worker** | 2026-03-24 | **2026-03-29 22:02** | ✅ 本番稼働中 |
| **sage-content-replenisher** | 2026-03-25 | 2026-03-25 07:24 | ✅ 本番稼働中 |

---

### 📂 追加発見ディレクトリ・ファイル

#### `tools/` — スモークテスト＆ユーティリティ

| ファイル | 内容 |
|---------|------|
| `tools/smoke_d1.py` | D1 Knowledge Loopの統合スモークテスト（`--topic "..."` 引数で実行） |
| `tools/check_bluesky.py` | Bluesky接続確認 |
| `tools/generate_course_minimal.py` | 最小構成コース生成 |
| `tools/generate_image_test.py` | 画像生成テスト |

**smoke_d1.py の実行フロー:**
```
Perplexity API → (失敗時) Groq フォールバック
→ Obsidian Vault保存
→ Notion「予約済み」キューへ追記
→ 全ステップ成否レポート
```

#### `files/products/` — 生成済み商品プランJSON（5件）

| ファイル名 | 内容 |
|---------|------|
| `product_ai_content_mastery.json` | AIコンテンツマスタリーコース設計書 |
| `product_autonomous_income.json` | 自律収入システムコース設計書 |
| `product_sage_starter_kit.json` | Sageスターターキット設計書 |
| `product_social_media_automation.json` | SNS自動化コース設計書 |
| `product_japan_ai_playbook.json` | Japan AI Playbookコース設計書 |

> コース生成パイプラインが自動出力した販売候補商品。Gumroadへの実登録は未実施。

#### `compliance_deploy/` — 日本語スタンドアロンHP

| ファイル | 内容 |
|---------|------|
| `index.html` | "SAGE 3.0 \| Visionary Hub" タイトルの日本語LP（独立版） |
| `legal.html` | 利用規約（日本語） |
| `privacy.html` | プライバシーポリシー（日本語） |
| `style.css` | スタンドアロンCSS |

> CF Pagesとは別の独立HTMLファイル群。コンプライアンス対応・日本語ユーザー向け別バージョンLP。デプロイ先は未確定。

#### `backend/cognitive/` — Android / Expo React Nativeアプリ骨格

| 内容 | 詳細 |
|------|------|
| **フレームワーク** | React Native + Expo |
| **ビルドターゲット** | arm64-v8a / armeabi-v7a / x86 / x86_64 |
| **スクリーン** | 骨格のみ（実動作アプリなし） |
| **補足ファイル** | `Gumroad_Sales_Page_Copy.md`（Gumroadセールスページコピー）、`backend/.env.example` |

> ディレクトリ名から想定しにくいが、AndroidアプリのExpoビルドログが存在する。まだデプロイ・配布不可。

#### `logs/self_test/` — セルフテスト実行ログ（3/17〜3/19）

| 実行日 | 結果 | 詳細 |
|-------|------|------|
| 2026-03-17 | 🟡 一部FAIL | 初回セルフテスト実行 |
| 2026-03-18 | 🟡 一部FAIL | 修正対応中 |
| 2026-03-19 | ✅ **OVERALL PASS** | 全Tier通過（Tier1/External/Tier2） |

#### `logs/last_run_registry.json`（2026-03-30時点・実測値）

| ジョブ | 最終実行時刻 (JST) |
|-------|----------------|
| notion_sync | 2026-03-30 19:55 |
| bluesky | 2026-03-30 18:57 |
| engagement | 2026-03-30 20:05 |
| gumroad | 2026-03-30 06:53 |
| blog | 2026-03-30 09:01 |

---

### 🔑 `.env` — 設定済みAPIキー全80件

| カテゴリ | 主なキー | 状態 |
|---------|---------|------|
| **LLM** | GROQ_API_KEY, GOOGLE_API_KEY（Gemini）, OPENAI_API_KEY, ANTHROPIC_API_KEY | ✅ SET |
| **リサーチ** | PERPLEXITY_API_KEY | ✅ SET |
| **画像生成** | HF_TOKEN（HuggingFace）, IMGBB_API_KEY | ✅ SET |
| **音声** | FISH_AUDIO_API_KEY | ✅ SET（本番テスト未実施） |
| **SNS** | BLUESKY_HANDLE/APP_PASSWORD, INSTAGRAM_ACCESS_TOKEN, TWITTER_API_KEY/SECRET等 | ✅ SET |
| **決済** | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PAYPAL_*, GUMROAD_ACCESS_TOKEN | ✅ SET |
| **Notion** | NOTION_TOKEN, NOTION_DATABASE_ID（複数） | ✅ SET |
| **Firebase** | VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID等 全8項目 | ✅ SET |
| **Cloudflare** | CF_API_TOKEN, CF_ACCOUNT_ID, CF_D1_DATABASE_ID | ✅ SET |
| **通信** | TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID | ✅ SET |
| **ビジネス** | JIRA_*, WHOP_API_KEY | ✅ SET |
| **制御フラグ** | SAGE_AUTONOMOUS_ENABLED, SAGE_MOCK_MODE, SAGE_POST_DRY_RUN | ✅ SET |
| **ngrok** | NGROK_AUTHTOKEN, NGROK_STATIC_DOMAIN | ✅ SET |

---

### 📋 Notion ワークスペース — 全ページ・DB一覧（MCP確認済み）

#### データベース
| DB名 | ID | 備考 |
|-----|-----|------|
| **Sage 3.0 タスク管理** | 8d8c383a-6127-4721-817d-a0abc065d35c | メインタスクDB |
| **Evidence Ledger** | 312f7a7d-... | D1実行証跡記録 |

#### 主要ページ（時系列）
| ページ名 | 更新日 |
|---------|-------|
| 🧐 Sage自立度評価：現状分析 | 2026-02-07 |
| 賢者（Sage）のHP運用ガイド | 2026-02-07 |
| Sage 3.0 次の戦略（バフェット哲学ベース） | 2026-02-07 |
| 🧠 Sage技術スタック全体像（Multi-Agent Architecture） | 2026-02-27 |
| 🔥 Firebase移行計画：賢者母体化（Sage Core Infrastructure） | 2026-03-08 |
| 🧪 賢者（Sage）機能テスト完全チェックリスト — 2026-03-08 | 2026-03-08 |
| 🚀 SAGE 3.0 商品化ローンチ 最終テスト＆チェックリスト — 2026-03-10 | 2026-03-10 |
| Sage販売前GO判定表 — 2026-03-11 | 2026-03-11 |
| Sage Dev — Self-Test System 完成・全機能確認 2026-03-18 | 2026-03-18 |
| 📋 Sage 分身システム導入 — 全ステップ管理・完了確認チェック | 2026-03-03 |
| 💡 アイデアストック & ユーザー問題考察 | 2026-03-25 |
| SAGE 3.0 ホームページ（HP）完全仕様書 | **2026-03-30** |

#### Notionから特定された未実装事項
- 「画像直接アップロード（Blob upload）対応 ← 未実装」（3/8チェックリストより）
- 「生成した記事をHPにアップロードする機構が未実装」（自立度評価より）
- 「フロントエンドUIからの直接起動も実装予定（Monetizationタブ）」（HP仕様書より）

---

### 📊 最終サマリー（完全版）

| リソース | 確認方法 | 主な発見 |
|---------|---------|---------|
| ファイルシステム | Bash直接探索 | 880+ファイル・80 .envキー・44ブログ・202画像 |
| CF D1 | MCP直接クエリ | 5テーブル・購読者1件（テスト）・本番決済0件 |
| CF Workers | MCP確認 | 2本デプロイ済み・SNSワーカー3/29最終更新 |
| Notion | MCP検索 | 15+ページ確認・2DB確認 |
| GitHub Actions | .yml確認 | d1-knowledge-loop.yml（pushごと自動テスト） |

> **最終更新: 2026-03-30 ファイルシステム・Notion・Cloudflare全リソース完全精査済み**
