# SAGE 3.0 ホームページ完全仕様書


## 概要
SAGE 3.0のホームページは、単なるランディングページではなく、エビデンスファーストの信頼構築システムの入口として機能します。

## 1. デザインコンセプト：Visionary Cosmic

## 1.1 ビジュアル要素
- 宇宙空間の背景（Starfield）: PCの操作を「宇宙の航行」に例え、無限の可能性とAIの深遠さを表現。背景にはリアルタイムで動く星々を配置
- アンビエント・オーブ: 紫（#6C5CE7）とシアン（#00D4FF）の光の球が星雲のように揺らめき、洗練された「賢者（AI）」の知性を演出
- 高級感のあるタイポグラフィ: 太字の「SAGE 3.0」にシルバーのグラデーションを施し、最先端のプロダクトであることを一目で伝える

## 2. メッセージング

## 2.1 キャッチコピー
- メインコピー: "The AI Partner That Safely Moves Your PC"（あなたのPCを安全に動かすAIパートナー）
  - *安全性（Safety）**を最優先していることを強調
- スローガン: "THINK • HEAL • EVOLVE"（思考・修復・進化）
  - AIが自律的に考え、エラーを自己修復（Self-Healing）し、学習して進化していく哲学を示す

## 3. ナビゲーション（4つのボタンスタック）

## 3.1 主要導線
1. 🚀 Launch Cockpit (Dashboard)
  - 管理画面（コクピット）への入り口
  - AIの動作状態やエビデンスを確認するセクションへ接続
1. 💎 Get Architect Edition - $29
  - Gumroadへの直接購入導線
  - メインのコンバージョンボタン
1. 📄 Read Blog
  - Sageプロジェクトの開発記録や最新情報
  - 週1記事でSEO対策と信頼構築
1. 🏪 View Store
  - 関連プロダクト・サービスのラインナップ
  - エコシステム全体への回遊導線

## 3.2 インタラクティブ要素
- Glassmorphismエフェクト: ボタンにマウスホバーで光り輝き、浮かび上がる演出
- ソーシャル連携: 右上アイコンからBluesky/Instagramの活動報告へジャンプ可能

## 4. HPの戦略的役割

## 4.1 エビデンスファースト哲学
- 証拠 > 宣伝: 「できます」ではなく「実際に動いています」を見せる
- 実績の可視化:
  - 6ヶ月稼働中のBluesky自動投稿実績
  - Notion日報化の実動画
  - localhost:8080で今すぐ試せるデモ

## 4.2 信頼構築エコシステム
- Blog（週1記事）: SEOで集客 + 実績証明 + ノウハウ共有
- SNS連携: 動作スクショ + エビデンス投稿で日々の証拠蓄積
- Notion日報化: Git→Notionで開発履歴を自動記録（透明性の担保）
- Cloudflare Pages: Git Push → 1-3分で自動デプロイ（sage-now-pro.pages.dev）

## 5. 技術基盤

## 5.1 ホスティング
- URL: sage-now-pro.pages.dev
- プラットフォーム: Cloudflare Pages
- デプロイフロー:
  textローカル開発 → git commit → git push → GitHub 
→ Cloudflare Pages（自動ビルド） → 公開（1-3分）

## 5.2 フロントエンド構成
- ファイル: frontend/src/pages/Landing.jsx
- フレームワーク: React + Framer Motion
- スタイル: Glassmorphism + Cosmic Theme
- フォント: Inter (Black 900) + FontAwesome

## 6. ダッシュボード（Cockpit）の全機能

## 6.1 思考プロセスの可視化
- OODAループ・シミュレーター: AIの現在の思考フェーズをリアルタイム表示
- Brain Stats Widget: 脳の活動レベル、学習進捗、確信度をグラフ表示

## 6.2 自己修復センター
- ヘルスチェック: システム全体の死活監視、PID、稼働バージョン確認
- Self-Healing監視: エラー発生時の自己修復プロセスの進捗表示
- KPI計測: MTTR（平均復旧時間）、可用性（Uptime）などのスコア表示

## 6.3 統合ワークスペース
- ファイルブラウザ: ローカルファイルの直接ブラウズ・管理
- エビデンス管理: AIが生成した画像、ドキュメント、実行ログのプレビュー

## 6.4 拡張機能
- GenTabs（App Generator）: トピック入力で専用HTML5アプリを自動生成
- Physical AI（Robot Controller）: NVIDIA GR00T/LeRobot連携のロボット制御
- 🎯 Consultative Content Generator（対話型コンテンツ生成）:
  - 相手との会話からニーズを自動抽出
  - トピックに合わせたコース・記事・商品を即座に生成
  - 「〜について教えて」→「それを商品化して」の流れを1つのワークフローで実現
  - チャット内の「これを商品化」ボタンで即座に起動
- Monetization Dashboard: 売上推計、SNS拡散状況のトラッキング

## 6.5 実行ターミナル
- ライブログ: AIの思考とAPI通信の詳細表示
- 直接コマンド: フォームからAIに直接指示を出して実行

## 7. 隠された高度機能（バックエンド実装済み）

## 7.1 商品化エンジン（Consultative Productization）🌟
- CourseProductionPipeline:
  - 会話からトピックを自動抽出（最重要機能）
  - 「目次生成 → 各章の本文生成 → スライド画像生成 → Gumroadセールスページ作成 → Obsidian保存」まで完全自動化
  - チャットで「〜についてのコースを作って」と指示するだけで起動
  - 「〜について教えて」→「これを商品化して」→数分で販売可能な商品が完成
- GumroadPageGenerator:
  - Product Hunt/Twitter/Instagram用の最適なコピーを自動生成
  - backend/cognitive/ のテンプレートを使用して市場別に最適化
- 起動方法:
  - バックエンドの generate_course ツールが会話の意図を検知して自動起動
  - フロントエンドUIからの直接起動も実装予定（Monetizationタブ）
- 出力先:
  - Gumroad用ZIPパッケージ（即販売可能）
  - Obsidian/Notion（知識ベース化）
  - WordPress下書き（SEO対策記事として再利用）
- 実装ファイル: backend/pipelines/course_production_pipeline.py

## 7.2 自律型ストア
- 場所: backend/autonomous_store/
- 機能: AIがCEOとして運営するECサイト。商品管理、APIキー販売、ワークフロー販売

## 7.3 物理AIコントローラー
- 統合: NVIDIA GR00T + LeRobot
- 機能: PCを「身体」として物理的なタスクを実行

## 7.4 高度なログ監査
- URL: /admin/audit
- 機能: 賢者の「意識のストリーム」をリアルタイム監視。LLMの思考プロセス、API使用状況、自己修復履歴を追跡

## 7.5 SNS自動投稿管理
- ファイル: SocialMedia.jsx
- 機能: Bluesky/Instagram同時投稿予約、ジョブキュー管理、自律投稿トリガー

## 7.6 記憶システム統合
- Google Sheets Sync: SheetsPanel.jsxで財務データやプロジェクト情報を自動更新
- Vector Database（Mem0）: カテゴリ分け、タグ付けされた長期記憶の管理

## 7.7 コンテンツ管理
- Posts Library: Posts.jsxでAI生成ブログ記事の公開・修正・削除を管理

## 8. 深層機能（システムレベル）

## 8.1 生存機能
- 不滅のサービス化（NSSM）: Windowsサービスとして永続化、再起動後も自動起動
- OODAループ自律アダプター: 人間の指示を待たず、自ら観察→判断→決定→実行

## 8.2 安全機能
- Gate A/B セーフティ: 重要操作時の二重チェック、Safe Mode移行ロジック
- エビデンス・ハッシュ: 全スクリーンショット・ログにSHA-256ハッシュ生成で改ざん防止
- No Lies（嘘排除）: 全出力を「実在するファイル、ログ、証拠」と整合性チェック

## 8.3 開発・デプロイ機能
- Androidビルド自動化: GitHub Actions + safe_gradle_fix.pyで依存関係エラーを自動修正
