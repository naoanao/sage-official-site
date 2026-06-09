# SAGE_MASTER_CONTEXT.md
> **AIアシスタントへ**: このファイルはすべてのセッション開始時に必ず読むこと。  
> Sageシステムの全体構造・なおさんのアイデンティティ・既知問題と解決策を含む。  
> 「2ヶ月に一回同じことを繰り返す」を防ぐためのシステムメモリ。

最終更新: 2026-06-09（収益化マスター計画策定・全欠落モジュール復元・GA4+Vercel Analytics・本番デプロイ）

---

## 1. なおさんとは誰か（オーナーアイデンティティ）

**名前**: Nao（なお） ※本名はAI出力に絶対使用しないこと  
**拠点**: 神奈川県、日本  
**バックグラウンド**: 現場叩き上げの実務家。カラオケのキャッチやバーテンダーから始まり、間借り飲食（地産地消）やイベント企画など泥臭い現場を渡り歩いてきた。  
**現在地**: 非エンジニアだが、現場の痛みを解決するため生成AIを独学。マーケティングツール「Growl」と自動化システム「Sage AI」を手探りで自作中（1日3時間作業）。インフルエンサー志望ではなく、スモールビジネスに寄り添う裏方気質。

⚠️【プライバシー保護に関する絶対ルール】
AIがすべてのコンテンツ（note、ブログ、SNS等）を生成・発信する際、いかなる場合も以下の情報を漏洩させないこと。
- フルネーム（本名）は使用禁止。発信時は必ず「なお」を用いること。
- 過去の具体的な勤務先名、過去の店舗名、特定のイベント名、ブランド名（取引先）は使用禁止。
- 必ず「某飲食店」「地産地消のバーガー店」「フードフェス」など、特定不可能な一般的な表現にぼかして出力すること。

### Vision Freeman（究極ビジョン ＆ 3年ロードマップ）
**【究極の目的・ビジョン（対話メモリ合言葉）】**
> **「人とAIで、地球環境の保全、育成、活用し、この地球すべての生き物の楽園を創造することです。」**

| 年 | 目標 |
|---|---|
| Year 1 | Sage + Growl + LearnAI の収益化。1日3時間で年収1千万。 |
| Year 2 | Uncle Samレストラン拡張 + CBD事業オーナーとして立ち上げ |
| Year 3 | 土地購入・地産地消農業・社会貢献（CSVによる砂漠植林） |

---

## 2. Sageとは何か（コアコンセプト）

**Sageはツールではない。なおさんの自律AI分身だ。**

> 「自分の分身をPCに作って、私の代わりを全てやるが始まり」— なおさん

Sageは「思考し、判断し、投稿し、リサーチし、学習し、眠っている間も価値を生み出し続けるもう一人の自分」として設計されている。  
Claude Code / Cowork などの外部AIツールは、SageというAI分身の**制作・改善を手伝うパートナー**である。

---

## 3. プロダクト構成

| プロダクト | 役割 | URL / 場所 |
|---|---|---|
| **Sage AI** | 自動SNS投稿システム（Bluesky + Instagram + YouTube Shorts） | kanagawatable / kanagawajapan |
| **Growl** | AIマーケ総合ツール（週次アクション生成・商品マーケAI・フレームワーク分析） | growl-app.vercel.app |
| **LearnAI** | AI学習支援ツール（Growl内 /learn にも統合済み） | LearnAI.html (local) |

### SNSアカウント
- **kanagawatable.bsky.social** → なおさんの個人ビルダー視点。リアルで飾らない旅
- **kanagawajapan.bsky.social** → Sage AIのプロダクトアカウント。具体的な成果・使用例

### ⚠️ Bluesky投稿ルール（2026-05-21 決定。AIは必ず守ること）
- **投稿は自律スケジューラー（sns_daily_scheduler.py）のみが行う。手動一括投稿は禁止。**
- **頻度：最大1〜2投稿/日/アカウント**（旧：10〜15投稿/日 → 廃止）
- **毎投稿に会話トリガー必須**：読者が2文で答えられる質問、または共感ポイントで締める
- **volume投稿への回帰禁止**：CTAだけの投稿、宣伝投稿の連投はしない
- **pr_post_copy.mdのBluesky投稿文は旧スタイルのため使用しない**（CTA/ハッシュタグ混入・一括投稿前提）
- EngagementBotは停止中（再開条件：reply persona確認後、flask_server.pyのコメント解除）

---

## 3a-1. Growl プロンプト品質改善ログ（2026-06-05 完了）

> AIへ: 同じ問題を再修正しないために必ず読むこと。

### 修正済み問題と対処法

| 問題 | 原因 | 対処法 | 状態 |
|---|---|---|---|
| JSON途中切れ（500エラー） | maxOutputTokens:1500が不足 | 3000に増量（Gemini・Groq両方） | ✅解決済み |
| actionsが広告費必要・長期作業 | JSONテンプレートの例示が弱い | テンプレートに「スマホ・無料・30分・KPI必須」制約を直接埋め込み | ✅解決済み |
| headline「産後ダイエットの悩み」等の無フックコピー | テンプレートに禁止例なし | 禁止ワード・良い例をテンプレートに追記 | ✅解決済み |
| BOFU（CONVERSIONS）でCTA=LEARN_MORE | ゴール別分岐指示なし | goal別CTAマッピングをテンプレートに追加 | ✅解決済み |
| USPに架空の完走率87%等が出る | 定量データ必須ルールとUSPが競合 | COMMON_RULESにUSP例外規定を追記 | ✅解決済み |
| image_prompt_singleがテンプレート説明文をコピー | サンプル形式の書き方が悪い | 「[Write a custom prompt…]」形式に変更 | ✅解決済み |
| main_channel「Instagram + 公式EC」（ジムにEC不適切） | テンプレートの例が不正確 | EC禁止条件をテンプレートに追記 | ✅解決済み |
| EN版に promotion_gap フィールド欠落 | JA版のみ実装、EN版に追加忘れ | EN JSONテンプレートにも追加 | ✅解決済み |
| Meta広告がGroqレートリミットで全停止 | フォールバックなし | Gemini→Groqフォールバック追加、maxDuration:30→55 | ✅解決済み |

### ⚠️ 既知の制限事項
- Groq無料枠 + Gemini無料枠は1日の大量テストで枯渇する。翌日リセットで復旧。
- GrowlのgitブランチはWorkspace内で `candidate/20260605-playwright-mcp` → mainへpushするフロー。

---

## 3a-2. Growl 収益化実装ログ（2026-06-05 完了）

> AIへ: 収益化インフラは既に存在する。同じものを再実装しないこと。

### 収益化の現状（本番稼働済み）

| 機能 | 状態 | 詳細 |
|---|---|---|
| Stripe Payment Links | ✅ 設定済み | Standard ¥3,000/月、Pro ¥8,000/月 |
| Stripe Webhook | ✅ 実装済み | `/api/webhook/stripe` で署名検証・プランDB更新 |
| /upgrade ページ | ✅ 実装済み | プラン比較表・Stripe決済リンク |
| /api/my-plan | ✅ 実装済み | Supabaseからプラン取得 |
| FreeProgressBar | ✅ 実装済み | 月5回制限カウンター（localStorage） |
| LP価格表 | ✅ 2026-06-05追加 | フリー¥0 / スタンダード¥3,000 の2プラン表示 |
| Meta広告ゲート | ✅ 2026-06-05実装 | 有料プランのみAdBoostCard表示、無料は/upgradeへ誘導 |
| 支援バナー | ✅ 2026-06-05追加 | complete画面に「☕ Growlを応援する」→/upgrade |

### 収益化の設計思想
- **マーケ分析（analyze）**: 無料（月5回制限）→ 集客の核心。制限到達でアップグレード誘導
- **Meta広告生成（meta-ads）**: 有料専用 → 最も高価値な機能。競合は$50+で提供
- **課金フロー**: LP → 無料体験 → 価格表 → Stripe → Webhook → Supabaseにプラン保存 → isPaidPlan()でゲート開放

### 収益化で触ったファイル
- `ai-marketing-app/app/page.tsx` — LP価格表セクション追加
- `ai-marketing-app/app/dashboard/page.tsx` — Meta広告をisPaidPlan()でゲート
- `ai-marketing-app/app/complete/[id]/page.tsx` — 支援バナー追加
- `ai-marketing-app/lib/stripe-config.ts` — Stripe設定（変更なし・参照のみ）

---

## 3a. Growl 全機能マップ（2026-05-22 完全動作確認済み）

> ⚠️ AIへ: このセクションを毎回読むこと。Growlの機能は多く、忘れやすい。

### ページ一覧（全てVercelで動作中）

| URL | 機能名 | 内容 |
|---|---|---|
| `/` | ランディングページ | 英語・日本語切替対応。"Just 3 actions this week." |
| `/diagnosis` | **NEW** SNS集客力診断 | 5問→A〜E判定→弱点→改善アクション→シェア。日英対応 |
| `/onboarding/industry` | オンボーディングStep1 | 業種選択（8業種） |
| `/onboarding/business` | オンボーディングStep2 | ビジネス説明 |
| `/onboarding/customer` | オンボーディングStep3 | 顧客説明 |
| `/onboarding/problem` | オンボーディングStep4 | 課題記述 |
| `/onboarding/proof` | オンボーディングStep5 | 広告強化データ（任意） |
| `/onboarding/goal` | オンボーディングStep6 | 目標→AI生成実行 |
| `/onboarding/line` | オンボーディングStep7 | LINE連携（任意、JPのみ） |
| `/dashboard` | メインダッシュボード | 3アクション表示、進捗管理 |
| `/marketing` | フレームワーク分析 | PEST/3C/SWOT/STP/4P/VRIO/ULSSAS/AEO |
| `/upgrade` | プランアップグレード | Free($0) / Standard($19) / Pro($49) |
| `/payment-success` | 決済完了 | Stripeリダイレクト後 |
| `/learn` | LearnAI | マーケ学習ツール |
| `/product` | 商品マーケAI | マーケティングプラン生成 |
| `/report` | 月次レポート | 完了タスク集計 |
| `/privacy` | プライバシーポリシー | 法令対応 |
| `/terms` | 利用規約 | 法令対応 |
| `/diagnosis` | SNS集客力診断 | 5問クイズ→A〜Eランク→シェア→有料CTA導線 |
| `/api/diagnosis` | 診断API（POST） | Groq(llama-3.3-70b)スコアリング |

約1年間にわたるナオさんのソロAIビルダーとしての開発の歴史の中で、「現在稼働している機能」の背後に眠っていた、極めて高度で実用に耐えうるインフラ・RPA・生成アセット群です。これらはすべて実在し、ディスク上またはGit履歴から発掘・検証済みです。

### 🎬 動画・音声・音楽生成系自律アセット
*   **無料クラウド動画生成 (`kling_agent.py` & `video_generator.py`)**: 9:16縦型（512x912または1080x1920）に自動最適化された縦型動画（YouTube Shorts, Reels, TikTok向け）をMoviePyとAIディレクター、自動素材収集（Pexels/Unsplash）、字幕同期（kineticタイポグラフィ）を用いて完全ローカルレンダリングする85KBの巨大な自動動画生成システム。
*   **自律BGM作曲 (`suno_agent.py`)**: HuggingFaceの **MusicGen** (`facebook/musicgen-stereo-medium`) に移行し、トピック（lo-fi, synthwave等）からBGMを自動作曲。
*   **本人音声クローン TTS (ish_audio_integration.py)**: Fish Audio API を介し、ナオさん本人の短いリファレンス音声（WAV/MP3）から本人の声質を100%クローンしたナレーション（MP3）を一括生成。
*   **VoiceVox ローカル音声合成 (oicevox_agent.py)**: 外部APIに依存せず、ローカルのVoiceVoxエンジンを使用して高品質な日本語音声を自律生成。
*   **Edge TTS 音声合成 (edge_tts_agent.py)**: Microsoft EdgeのTTS APIを活用し、無料で制限のない多言語音声合成を実行。
*   **LangGraph AIオーケストレーター (langgraph_orchestrator.py)**: 複数のAIエージェントのワークフローをLangGraphを用いて連携・制御。イースターエッグ（合言葉でLLM推論をスキップする機能）を内包。
*   **Chromeセッション自動抽出 (extract_chrome_cookies.py)**: ローカルのChromeブラウザからCookieとセッション情報を自律的に抽出し、APIを使わずにログイン必須の外部サービスへのアクセスを突破。
*   **ローカル日本語音声合成 (`backend/integrations/voicevox_agent.py` & `test_voicevox.py`)**: ローカルで稼働する **VOICEVOX HTTP API** をコールし、ずんだもん、四国めたん等の日本のキャラクターボイスでナレーションを生成。話速や抑揚を調整し、WAVバイナリヘッダーから音声の秒数を直接パースする高度なロジックを搭載。
*   **無料クラウド多言語音声合成 (`backend/integrations/edge_tts_agent.py` & `test_edge_tts.py`)**: APIキー不要でMicrosoft Edgeの高性能な多言語TTSをコール。英語（Aria, Jenny）や日本語（Nanami, Keita）の極めて自然なナレーションMP3を生成し、マルチレイヤー（mutagen➔pydub➔bits換算➔文字数統計）で秒数を自動算出。

### 📄 ドキュメント・eBook自律生成＆ナレッジ構築系
*   **デジタル商品＆SNSレポートPDF自律生成 (`pdf_generator.py`)**: IPAGothicフォント（豆腐化回避）を自動検出し、ブランドカラーのネイビーとブルーを基調としたプロ品質のセールスeBook・週次SNS稼働レポートPDFを自律生成。
*   **Sage Intelligence 脳エクスポート (`notebooklm_integration.py`)**: Tavily検索を駆使した自律型ディープリサーチ（ポッドキャスト風対話スクリプト生成）および、ChromaDBの全記憶からGoogle NotebookLM用のマークダウン脳データベース（`SAGE_MASTER_BRAIN.md`）を自動エクスポート。
*   **学問無人学習ループ (`FOUNDATION_ANNAS_ARCHIVE_WISDOM.md`)**: Z-LibraryやLibGen（Annas Archive）と接続し、AIが自分に不足している専門知見を自動検索・要約し、「著者・論文名・要約」の証拠付きでChromaDBやObsidianへ自律的に吸収する学習基盤。

### 👁️ 画面認識・自動操作RPA＆セキュリティ突破
*   **Gemini Vision RPA (`computer_vision_agent.py`)**: pyautogui + Gemini 2.5 Flash Vision。現在のデスクトップ画面をキャプチャし、Geminiにボタンやテキストの座標を特定させ、マウスの自動移動・クリックを自律実行（APIのないローカルアプリやログインの突破）。
*   **Chrome v127+ Cookieデクリプター (`tools/extract_chrome_cookies.py`)**: Chromeの最新App-Bound Encryption (v20暗号化) を回避するため、Chromeをデバッグポート `9222` で起動し、CDP (Chrome DevTools Protocol) のWebSocketを叩いてClaude/ChatGPT/Gemini/PerplexityのセッションCookieを直接メモリから生データで吸い出してProximaに引き渡すセキュリティツール。

### 🌐 高度外部連携・ソーシャル・ワークフロー系
*   **AI専用SNS「Moltbook」自律進出 (`moltbook_agent.py`)**: Moltbookにアカウントを自律登録し、4時間ごとの生存ハートビート送信、 llama-3.3-70b での開発日記自律投稿、他AIへの返信（コメント会話）、自動フォローを完全自律実行。
*   **Figmaデザイン➔コード自律変換 (`figma_integration.py`)**: Figma APIで要素構造をPNG/SVGで自律抽出し、Gemini 2.5 APIを介してモダンなHTML5/レスポンシブCSS・JSコードに自動変換。
*   **Difyワークフロー連携 (`dify_integration.py`)**: Difyプラットフォーム上の複雑なLLMアプリ・ワークフローの呼び出し。
*   **Notion自動日報同期 (`backend/scheduler/notion_sync_scheduler.py` & `_ARCHIVE_NOTION_SYNC/`)**: Gitのコミットログからその日の開発進捗を自動解析し、Notionの日報データベースへ自動同期・日誌を追記する無人管理RPA。

### ⚡ Cloudflareエッジ SPAハンドラー＆ngrok動的プロキシ中継神経網 (`functions/`)
*   **エッジ SPA フォールバック (`functions/[[path]].js`)**: Cloudflare Pages上で動作し、静的アセット・API以外のすべてのリクエストを `/index.html` へ転送。クライアントサイドでの直接URLナビゲーションを100%正常化。
*   **ngrok動的トンネルプロキシブリッジ (`functions/_backend.js`)**: `run_sage.ps1` 開設の最新の ngrok トンネルURL（`BACKEND_URL`）をエッジへリアルタイムに同期・注入。

### 💎 特典コピー自動ライティング＆タイトル最適化5大心理学技法 (`tests/`)
*   **希少性・デッドライン特典自動合成 (`_generate_bonuses`)**: コンバージョン心理学に基づく「48時間限定」「部数限定」のセールスコピーを英日自動ライティング。
*   **タイトル最適化5大心理学技法 (`TitleOptimizer`)**: 以下の5つのパターン（数字/権威/具体性/ブラケット/ベネフィット）の正規表現に基づき、LLM生成のタイトルを自動チューニング：
    1.  *数字 (Number)*: 例「5つの事実」
    2.  *権威 (Authority)*: 例「[Declassified]」
    3.  *具体性 (Specific)*: 例「2026 Roswell」
    4.  *ブラケット (Bracket)*: 例「【MUST READ】」
    5.  *ベネフィット (Benefit)*: 例「How to...」

### ⏳ CF Pages 30秒タイムアウト突破型「非同期ジョブシステム」
*   重い生成処理（コース生成等）をフロントエンドで行う際、Cloudflare Pagesの「30秒タイムアウト制限」を回避するため、`POST /api/jobs/pipeline/start` が即座に HTTP 202 Accepted と `job_id` を返却し、バックグラウンドスレッドを起動。フロントエンドが `GET /api/jobs/{job_id}/status` を4秒間隔でポーリングする高度な非同期設計。

### 🛡️ 環境保護＆「No tools executed」バグ検知
*   **環境保護検証 (`EnvGuardian`)**: 必須のAPIキー（`HF_TOKEN`, `IMGBB_API_KEY`等）が正しくローカルに設定されているかを自律スキャン。
*   **「No tools executed」自動検知**: AIがWeb検索やリサーチ要求に対して、適切に関数（ツール）を呼び出さずに空返答してしまうバグを検出する自動テストロジック。
*   **30項目能力検証テスト (`verify_30_capabilities.py`)**: コアヘルス、会話、ブラウザ自動操作、モバイルアプリ自動作成、Ganttグラフ、Stripe、Slack通知など、システム全体の30のエンドポイントを連続スキャンするスモークテスト。
*   **自動ポート衝突解決スマート・ウォッチドッグ (`scripts/smart_watchdog.py`)**: ポート `8080` の占有状況を `netstat` で監視し、Sage自身のゾンビプロセスであれば `taskkill` を自動実行してポートを強制クリアし、`run_sage_311.bat` でサーバーを安全に自動再起動する。
*   **合言葉イースターエッグ (`backend/modules/langgraph_orchestrator.py`)**: `「賢者の秘密の合言葉」` という質問を検知すると、全てのプランニングをバイパスし、即座に **`「未来への希望」であり、それは決して消えることのない光です。`** という答えを直接出力するイースターエッグ。

### 💰 商品生成→販売→PR投稿の実装確認
*   **商品生成パイプライン (`/api/productize/execute`)**: `course_production_pipeline.py` が、アウトライン・本文セクション・スライド/画像・セールスページ・SEOブログ記事・特典スタック・商品フック・ローンチチェックリスト・SNS投稿文（`sns_captions`）を生成する。Whop公開に成功した場合は `whop_captions`（Bluesky/Instagram用の販売告知文）も返す。
*   **Whop自動販売導線 (`whop_publisher.py`)**: `create_and_publish()` が Whop API で product + plan を作成し、`product_url` と `checkout_url` を `backend/data/whop_products.json` に保存する。実際に `プロンプトエンジニアリング完全チートシート` の Whop公開成功レコードが存在する。
*   **販売ページ更新 (`/api/productize/update-whop`)**: SageOSで最終編集・Finalize後、Whopの商品説明を更新する処理がある。ただし生成したPDF/教材ファイルそのものをWhop商品に自動添付する処理は未接続。
*   **LP/販売リンク**: `frontend/src/pages/Landing.jsx` / `SalesPage.jsx` / `src/config/links.js` に Stripe/Gumroad/Whop の静的CTAが実装済み。生成された個別Whop商品は SageOS画面と StoreManager の Whopタブで checkout URL を表示できる。
*   **PR投稿の自動化**: `GumroadScheduler` は最新ブログと既存Gumroad商品を結びつけ、Instagram/Bluesky向けPRジョブを `jobs.json` に積む。`SageJobRunner` が pendingジョブを5分ごとに処理し、画像があればInstagram、テキストはBlueskyへ投稿する。1日上限は `SAGE_JOB_DAILY_LIMIT`（デフォルト3件）。
*   **SageOSからの販売PR投稿**: 商品生成後の `whop_captions` / `sns_captions` は SageOS のレビュー画面に入り、`Post to Bluesky` / `Post to Instagram` ボタンから投稿できる。Instagramは画像必須のため、画像がなければ `/api/productize/regenerate_images` を呼んでから投稿する。
*   **動画生成の位置づけ**: `SAGE_VIDEO_GENERATION=true` の場合、通常SNS投稿後に `video_generator.py` がバックグラウンドでSNSショート動画を生成する。`/api/video/generate`、Instagram Reels生成、YouTube Shorts生成/投稿の実装もある。
*   **PDF生成の位置づけ**: `pdf_generator.py` と `/api/pdf/product` により、商品PDFとSNS週次レポートPDFは生成可能。商品生成パイプライン内では「PDFガイド」特典文言は生成されるが、`/api/productize/execute` が自動でPDFを生成してWhop/Gumroadに添付する流れは未接続。
*   **注意点**: `.env` には `SAGE_ENABLE_INSTAGRAM=0` がある一方、SNSジョブランナーやスケジューラー側は画像があればInstagram投稿を試みる経路がある。Instagram運用はフラグ整合性の確認が必要。

---

## 4. システム実際の動作状況（2026-05-19 時点）

### ✅ 実際に動いているもの

`Sage_start.bat` → `run_sage.ps1` → Flask (8080) + ngrok + Vite (5173) が起動  
Flaskサーバーが以下のスレッドを**自動バックグラウンド起動**:

| スレッド | 内容 | 動作確認 |
|---|---|---|
| SageSNSScheduler | Bluesky 2アカウント投稿（1時間ごとチェック） | ✅ 確認済み |
| SageBlogScheduler | ブログ自動生成（JST 09:00） | ✅ 起動中 |
| SageDreamScheduler | 夢モード・アイデア生成（JST 03:00-05:00） | ✅ 起動中 |
| SageMarketScanScheduler | マーケスキャン（JST 06:00） | ✅ 起動中 |
| SageEngagementBot | Bluesky自動いいね・返信 | 🔴 **DISABLED 2026-05-21** オフブランドな返信（"I'm a Trello fan"）が発生したため停止。再開時はreply persona要修正。 |
| SageSNSPerformanceTracker | エンゲージメント学習（JST 22:00） | ✅ 起動中 |
| SageSelfTestScheduler | 自己診断（JST 07:00） | ✅ 起動中 |
| NeuromorphicBrain | JSON永続化メモリ（v2.0.1） | ✅ 動作中 |
| SICALoop | 自己改善提案（JST 20:00） | ✅ Groq切替済 |
| Watchdog | Flask + ngrokクラッシュ時自動再起動 | ✅ 動作中 |

### ⚠️ 問題あり・要確認
- **Instagram**: `SAGE_ENABLE_INSTAGRAM=0` と `.env` に書いてあるが、コード側で直接フラグを立てている箇所がある
- **YouTube Shorts**: アップロード機能は実装済み（2026-05-15）、動画品質は未確認
- **Blog**: Gemini依存の可能性。Groq切替が必要かもしれない

---

## 5. ファイルマップ（重要ファイル一覧）

```
Sage_Final_Unified/
├── SOUL.md                          # Sageの永続的アイデンティティ・価値観・倫理
├── HEARTBEAT.md                     # 24時間自律スケジュール定義
├── SAGE_MASTER_CONTEXT.md           # ← このファイル（AIセッション引き継ぎ）
├── CLAUDE.md                        # AIへの制約・確認ルール
├── NEXT_SESSION_HANDOFF.md          # 前回セッションの引き継ぎ（随時更新）
├── run_sage.ps1                     # Sage起動スクリプト（Flask + ngrok + Vite）
├── Sage_Growl_Complete_Report.md    # 【新アセット】真・完全統合調査レポート
│
├── functions/                       # 【新発掘】Cloudflare Pages エッジ中継関数
│   ├── [[path]].js                  # SPAダイレクトルートフォールバックハンドラー
│   └── _backend.js                  # run_sageが自動更新するngrok動的プロキシURL
│
├── compliance_deploy/               # 【新発掘】リーガル/プライバシー法令適合静的サイト
│
├── scripts/                         # 【新発掘】運用・データ移行スクリプト
│
├── tests/                           # 【新発掘】結合テストスイート
│   ├── test_monetization_e2e.py     # Flux+imgbb / 特典心理学 / TitleOptimizer 5大技法検証
│   └── test_dashboard_full.py       # タイムアウト突破非同期ジョブ / コックピット API 結合テスト
│
├── backend/
│   ├── flask_server.py              # メインサーバー（~1200行、86エンドポイント全管理）
│   ├── config/
│   │   └── identity.json           # なおさんのアイデンティティ・マーケ基礎知識
│   ├── routes/                      # 11 Blueprint（分割済みルート）
│   │   ├── chat.py                  # チャット・パイロット（3エンドポイント）
│   │   ├── brain.py                 # 脳・研究・ブラウザ・RPA（18エンドポイント）
│   │   ├── content.py               # コンテンツ・ファイル管理（10エンドポイント）
│   │   ├── publish.py               # SNS公開・ステータス（14エンドポイント）
│   │   ├── productize.py            # 商品生成・収益化（7エンドポイント）
│   │   ├── sns_writer.py            # SNSライター・ブログ（5エンドポイント）
│   │   ├── store.py                 # ストア・決済（11エンドポイント）
│   │   ├── system.py                # システム管理（3エンドポイント）
│   │   ├── misc.py                  # コマンド・SPA配信（7エンドポイント）
│   │   ├── automations.py           # 自動化管理（4エンドポイント）
│   │   ├── note_routes.py           # ノートCRUD（5エンドポイント）
│   │   ├── identity.py              # アイデンティティ（未配線・flask_server.py優先）
│   │   ├── jobs.py                  # ジョブ管理（未配線・flask_server.py優先）
│   │   └── __init__.py              # Blueprint登録
│   ├── modules/
│   │   ├── langgraph_orchestrator_v2.py  # LangGraphオーケストレーター
│   │   ├── sage_memory.py           # ChromaDB + JSON永続化メモリ
│   │   ├── autonomous_adapter.py    # 自律ループ（観察→判断→実行）
│   │   ├── strategy_manager.py      # 戦略管理
│   │   ├── monetization_measure.py  # 収益計測
│   │   ├── content_manager.py       # コンテンツ管理
│   │   ├── browser_agent.py         # Webブラウザ操作
│   │   ├── file_operations_agent.py # ファイル操作
│   │   ├── sage_scholar.py          # 学術論文検索（arXiv/OpenAlex）
│   │   ├── consultative_generator.py # コンサルタティブ生成
│   │   ├── bilingual_poster.py      # 日英バイリンガル投稿
│   │   ├── sns_performance_tracker.py # SNSパフォーマンス追跡
│   │   ├── api_monitor.py           # API使用量監視
│   │   ├── self_healing_agent.py    # 自己修復
│   │   ├── security_utils.py        # セキュリティ（.env自動保護）
│   │   ├── sage_audit.py            # 監査ログ
│   │   ├── market_scan_notifier.py  # 市場スキャン通知
│   │   ├── sica_loop.py             # 自己改善ループ（Groq）
│   │   └── neuromorphic_brain.py    # JSON永続化メモリシステム
│   ├── pipelines/
│   │   ├── course_production_pipeline.py  # コース生成パイプライン
│   │   └── niche_validator.py       # ニッチ検証
│   ├── scheduler/
│   │   ├── sns_daily_scheduler.py   # Bluesky投稿スケジューラー
│   │   ├── blog_scheduler.py        # ブログ自動生成
│   │   ├── gumroad_scheduler.py     # Gumroad PRジョブ
│   │   ├── dream_scheduler.py       # 夜間アイデア生成
│   │   ├── market_scan_scheduler.py # 市場トレンドスキャン
│   │   ├── self_test_scheduler.py   # 自己診断
│   │   ├── notion_sync_scheduler.py # Git→Notion日報同期
│   │   └── __init__.py              # 全スケジューラ再エクスポート
│   ├── agents/
│   │   ├── market_scan_agent.py     # 市場スキャンエージェント
│   │   ├── self_test_agent.py       # 自己診断エージェント
│   │   └── self_test_external.py    # 外部ヘルスチェック
│   ├── integrations/
│   │   ├── bluesky_agent.py         # Bluesky投稿
│   │   ├── engagement_bot.py        # Engagement Bot（停止中）
│   │   ├── computer_vision_agent.py # 画面認識RPA（Gemini依存・要再開）
│   │   ├── whop_publisher.py        # Whop自動販売
│   │   ├── notion_logger.py         # Notionログ
│   │   └── ... (他多数：kling_agent, suno_agent, fish_audio等)
│   ├── scripts/
│   │   ├── job_runner.py            # PRジョブ処理（5分おき）
│   │   └── smart_watchdog.py        # ポート監視・自動再起動
│   ├── data/
│   │   ├── local_content_pool.json  # SNSコンテンツプール（15件）
│   │   ├── post_rotation_state.json # Account 1 ローテーション状態
│   │   ├── post_rotation_state_2.json # Account 2 ローテーション状態
│   │   ├── jobs_store.py            # ジョブ保存
│   │   └── market_scan_store.py     # 市場スキャン保存
│   ├── utils/
│   │   ├── auth.py                  # 認証デコレータ
│   │   ├── env_guardian.py          # 環境変数検証
│   │   └── __init__.py
│   └── extensions/
│       └── __init__.py              # SQLAlchemy + Bcrypt
│
└── ai-marketing-app/               # Growl（Next.js）
    ├── app/api/market-research/
    │   └── route.ts                # 3C分析API（Tavily + Rakuten scraping + Groq fallback）
    ├── app/api/meta-ads/
    │   ├── generate/route.ts       # Groqで広告文生成（headline/primary_text/description/cta/target_audience/image_prompt）
    │   └── submit/route.ts         # Meta Marketing APIでキャンペーン作成（META_ADS_ACCESS_TOKEN 必須）
    ├── app/privacy/page.tsx        # プライバシーポリシー（2026-06-03 作成・公開済み）
    ├── app/terms/page.tsx          # 利用規約（2026-06-03 作成・公開済み）
    ├── components/AdBoostCard.tsx  # Meta広告全自動化UI（広告文生成→Submit→Ads Manager連携）
    └── .env.local                  # Growl環境変数（META_ADS_ACCESS_TOKEN / META_AD_ACCOUNT_ID 要追加）
```

---

## 6. 既知問題と解決済み対処法

### sns-001: Account 2が異常投稿 / 両アカウントが同じHandleに投稿
**根本原因**: `post_rotation_state_2.json` が存在せず、毎起動でローテーションがindex 0にリセット  
**解決済み**: `backend/data/post_rotation_state_2.json` を作成（2026-05-19）

### git-001: git diff でゼロ行なのに実際はファイルが変更されている
**根本原因**: Windows NTFS + Linux sandbox マウントのタイムスタンプ非同期でgit indexが破損  
**症状**: `git status` が変更を検知しない / `git update-index --really-refresh` で大量の "needs update"  
**解決済み**: `git reset HEAD` → `git add <target_files>` → `git commit` の順で実行（2026-05-20）  
**注意**: `git update-index --cacheinfo` を使うと index が corrupt になるので使わない

### sns-002: 「Currently studying STP framework」のようなbot的投稿
**根本原因**: `CATEGORY_CONFIGS` の `marketing_lesson` インストラクションに「Frame it as something you're currently studying」と書いてあった  
**解決済み**: 全CATEGORY_CONFIGSを書き直し。Good/Bad例を明示、anti-rulesを追加（2026-05-19）

### sica-001: SICAループが無効化されていた
**根本原因**: `sica_loop.py` が Gemini API を使用していたがquota超過  
**解決済み**: Groq (llama-3.3-70b-versatile) に切り替え（2026-05-19）

### market-001: JP市場調査が汎用ブランド名を返す
**根本原因**: ハードコードされたサンプルデータ（DHC・キューサイ・ファンケル）+ TypeScriptのregexが複数行HTMLに未対応  
**解決済み**: 3段階パイプライン（Tavily API → Rakuten scraping → Groq fallback）に変更。ハードコードなし（2026-05-19）

### engagement-001: EngagementBot がオフブランドな返信を生成（"I'm a Trello fan"等）
**根本原因**: English reply system_promptに "Nao" の名前があり、トピック制限なし。任意のコメントに汎用AIが返信していた。
**対処済み**: 
1. flask_server.py の EngagementBot スレッド起動をコメントアウト（2026-05-21）
2. engagement_bot.py の English system_promptを匿名ビルダーに修正 + トピック外は返信None ルール追加
**再開時の条件**: reply persona確認後、flask_server.py の該当行のコメントを外す

### market-002: Rakuten h2タイトル抽出が0件
**根本原因**: 単行regexがh2とaタグが別行にある楽天HTMLに未マッチ  
**解決済み**: `[\s\S]*?` でDOTALLに相当するパターンに変更（bash検証済み: 44件マッチ）

### market-003: GrowlBridgeがGemini quota切れで汎用文を返していた
**根本原因**: `growl_bridge.py` の `_translate_for_industry()` がGemini APIを使用。Gemini quota超過で `_fallback_signal()` へ落ち、「季節感・限定感・お得感の三要素を意識してください」という意味のない汎用文がSupabaseに書き込まれていた。  
**解決済み**: Groq (llama-3.3-70b-versatile) に切り替え（2026-05-22）  
**注意**: `self.gemini_key` → `self.groq_key` に変数名変更。APIエンドポイントとレスポンス構造もGroq形式に変更。

### null-bytes-001: 英語化時にnull bytes混入でVercelビルドがError
**根本原因**: Linux sandbox（/sessions/）からWindows NTFS mountへのファイル書き込み時、null bytes（\x00）が混入。TypeScriptパーサーが `Unexpected character '\0'` エラーを出す。  
**症状**: `Bin X -> Y bytes` 表示のgit diff。Vercel buildが23秒で `Command "next build" exited with 1`。  
**解決方法**: Python で `data.replace(b'\x00', b'')` してファイルを上書き → git add → commit。  
**発生ファイル（2026-05-23）**: report/page.tsx, learn/page.tsx, payment-success/page.tsx, product/page.tsx, marketing/page.tsx（合計16,000+ null bytes）  
**注意**: `git show HEAD:file.tsx | python3 -c "import sys; d=sys.stdin.buffer.read(); print(d.count(b'\\x00'))"` でコミット内のnull bytes数を確認できる。修正済みでも再発する可能性あり。

### vercel-002: VercelのGitHub認証切れ（401）→ 新コミットが自動デプロイされない
**根本原因**: VercelのGitHub連携OAuth tokenが期限切れ。Vercel→GitHub API呼び出しが401を返す。  
**症状**: pushしても新コミットがVercel deployments一覧に現れない。Branch "main" not found エラー。  
**解決方法**: https://vercel.com/naoanaos-projects/growl-app/settings/git → "Reconnect"ボタンをクリック → GitHub OAuthで再認証  
**発生日**: 2026-05-23。対象コミット: c28fdf9, 1fdd99a, f782f84（全て未デプロイ）  
**注意**: Deploy Hookも"Branch not found"エラーで作成不可。Reconnectのみが解決手段。

### meta-ads-001: Meta広告「Submit Ad」がモック応答を返す（広告未作成）
**根本原因**: `ai-marketing-app/app/api/meta-ads/submit/route.ts` が `META_ADS_ACCESS_TOKEN` と `META_AD_ACCOUNT_ID` の環境変数をチェックし、未設定の場合 `mock: true` のダミー成功レスポンスを返す設計  
**症状**: Growlダッシュボードで「✅ Ad Created!」が表示されるが、MetaのAds Managerにキャンペーンが存在しない  
**未解決**: Vercelに `META_ADS_ACCESS_TOKEN`（なおさんのFacebook長期トークン）と `META_AD_ACCOUNT_ID=act_1208555023132678` が未設定  
**取得先**: https://developers.facebook.com/tools/explorer/ → sege3.0 選択 → ads_management スコープ追加 → アクセストークン生成  
**設定先**: Vercel → naoanaos-projects → growl-app → Settings → Environment Variables  
**注意**: 現在のsubmitルートは「なおさんの1つのトークンで全ユーザーの広告を作成」するアーキテクチャ。本来はOAuth（各ユーザーが自分のアカウントで出稿）が正しいが、OAuthルートのコードはgit reset --hardで消えた。再実装が必要な場合はOAuthフローを再構築すること。

### vercel-001: bad commit b418d77 でVercelビルドがErrorになっていた
**根本原因**: `commit_market_fix.bat` が `.git/index`（Windows側でロック・stale状態）を使いコミット → 全97ファイルが削除扱いになった。  
**解決済み**: `fix_and_push.ps1` で `git reset --hard 3d764ca` → route.ts書き直し → commit → `git push --force origin main`（2026-05-22）  
**再発防止**: `git commit` 前に必ず `git reset --hard <good-commit>` でindex修復。force pushはVercelが古いコミットを掴んでいる場合のみ。

---

## 7. LLM利用状況

| 用途 | LLM | API Key場所 |
|---|---|---|
| SNSコンテンツ生成 | Groq llama-3.3-70b-versatile | .env / GROQ_API_KEY |
| SICA自己改善 | Groq llama-3.3-70b-versatile | .env / GROQ_API_KEY |
| 市場調査（Growl） | Groq llama-3.3-70b-versatile | .env / GROQ_API_KEY |
| Webリサーチ | Tavily API | .env / TAVILY_API_KEY |
| ~~Gemini~~ | ~~使用停止~~ | quota超過のため全面停止 |

---

## 8. 直近の開発履歴（直近3ヶ月）

| 日付 | 内容 |
|---|---|
| 2026-05-15 | YouTube Shorts自動アップロード実装・テスト成功（Video ID: iFfsVk-UiTA） |
| 2026-05-19 | Growl市場調査API修正（Tavily統合・Rakuten regex fix・Groq fallback） |
| 2026-05-19 | SNSコンテンツ品質改善（CATEGORY_CONFIGS全書き直し・local_content_pool拡充） |
| 2026-05-19 | SICA Loop Gemini→Groq切替 |
| 2026-05-19 | identity.json なおさんの実アイデンティティで更新 |
| 2026-05-19 | このファイル（SAGE_MASTER_CONTEXT.md）作成 |
| 2026-05-20 | note.com戦略を徹底研究。NOTE_RESEARCH_SOURCES.md作成（URL付き検証済みデータ） |
| 2026-05-20 | note_scheduler.py強化: 1500〜2500字対応・3タイトルパターン（体験×検証型等）・max_tokens=3000 |
| 2026-05-20 | STORY_BIBLE.md更新: 文字数・タイトルパターン・「今日の注目記事」選出基準を追加 |
| 2026-05-20 | sns_daily_scheduler.py: Uncle Sam削除（プライバシー）+ STORY_BIBLE 5幕ペルソナ注入 |
| 2026-05-20 | identity.json: Uncle Sam削除（プライバシー）|
| 2026-05-20 | git index破損問題を解決（git reset HEAD でindex修復、以降は reset→add→commit の手順で対応）|
| 2026-05-21 | CONTENT_VOICE.md 作成（英日ボイス統一定義・プラットフォーム別フォーマット）|
| 2026-05-21 | sns_daily_scheduler.py: 全CATEGORY_CONFIGS書き直し（IH/Bluesky上位投稿パターン分析ベース）+ JP_CATEGORY_CONFIGS新規追加 |
| 2026-05-21 | sns_daily_scheduler.py: kanagawatable persona → 匿名化（"You are Nao"削除 → "a restaurant owner in Japan"）|
| 2026-05-21 | sns_daily_scheduler.py: kanagawajapan persona → 日本語ツール主役スタイルに強化 |
| 2026-05-21 | EngagementBot 停止（flask_server.py thread comment out）— "I'm a Trello fan"等のオフブランド返信が原因 |
| 2026-05-21 | engagement_bot.py: 英語reply promptを匿名ビルダーボイスに修正 + トピック外は返信Noneルール追加 |
| 2026-05-21 | blog_scheduler.py: system_promptを "world-class content writer" → 匿名ファウンダーナラティブに変更 |
| 2026-05-21 | INDIEHACKERS_ARTICLE_PROMPT.md 作成（プロンプトテンプレ + 変数込みの既製版） |
| 2026-05-21 | PRODUCTHUNT_LAUNCH_PROMPT.md 作成（コピーテンプレ + 全セクション） |
| 2026-05-21 | INDIEHACKERS_DRAFT_v1.md 作成（投稿準備完了 — 「1,532投稿・30フォロワー・0円」の正直な物語）|
| 2026-05-21 | PRODUCTHUNT_LAUNCH_COPY_v1.md 作成（タグライン3案・Maker Comment・5スライドキャプション・初時間返信3案）|
| 2026-05-22 | market-scan/route.ts: Gemini→Groq切替（Vercelクロン修復） |
| 2026-05-31 | **flask_server.py 重大修正**: `app.run()` が欠落していたため Flask が起動後即終了していた。Python patch で修正 → 正常稼働 |
| 2026-05-31 | **run_sage.ps1 修正**: Watchdogの再起動時にPIDファイルを削除せず無限ループしていたバグを修正 |
| 2026-05-31 | **Dev.to 記事8本公開**（なおさん経歴×マーケ理論×Growl CTA）: dev.to/naoanao |
| 2026-05-31 | **Medium 記事1本公開**: medium.com/p/60d08ebd0301（karaoke→AIDA記事） |
| 2026-05-31 | **FutureTools.io Growl申請完了** |
| 2026-05-31 | **Hashnode ブログ作成**: naoanao.hashnode.dev（APIは有料化のため手動投稿のみ） |
| 2026-05-31 | **@kanagawatable Bluesky bio更新**: Growlリンク追加 |
| 2026-05-31 | **毎日9:00 Dev.to自動記事投稿スケジュール設定**: devto-daily-article タスク |
| 2026-05-31 | **849件の空ジョブ削除**: jobs.json クリア |
| 2026-06-05 | **Playwright MCP導入**: `@playwright/mcp` v0.0.75 を opencode.jsonc に追加（`--headless`） |
| 2026-06-05 | **隔離ブランチ運用 + sage-reviewスキル**: AGENTS.md commit節を修正、main直コミット禁止。`.opencode/skills/sage-review/` 新設 |
| 2026-06-09 | **SNS自動化復旧**: `init_brain()` 起動時未呼出バグ修正。`NotionContentPool`/`InstagramBot` 欠落時の fallback 対応。Bluesky投稿確認済み |
| 2026-06-09 | **Autonomy Ladder & Closeout Rules定義**: AGENTS.md に L1-L3自律レベル + 知識圧縮ルールを追加。OpenCrew調査を反映 |
| 2026-06-09 | **OpenCrew調査**: AlexAnys/opencrew v0.3.0 (490 stars) の多Agent協業OSを調査。Sage Phase 4-5設計の参考として記録 |
| 2026-06-09 | **SNSスケジューラ修正**: 頻度 毎時→1日1回(JST 08:00)。プロンプトを会話トリガー・AI語禁止・DM感覚に刷新 |
| 2026-06-09 | **Growl診断機能MVP**: `/diagnosis` + `/api/diagnosis` (Groq)。5問→A〜E判定→弱点指摘→シェア→有料CTA導線。日英対応 |
| 2026-06-09 | **診断プロンプト磨き**: 判定基準を行動ベースに具体化、シェア文を自虐的・正直に。質問文を会話調に。CTAを診断結果連動に |
| 2026-06-09 | **SEO最適化**: 診断ページに構造化データ・動的タイトル追加。sitemap.tsに/diagnosis追加。両リモートにpush |
| 2026-06-09 | **Vercel Analytics診断ファネル計測**: layoutに`<Analytics />`配置。5イベント（start/question_view/complete/share/cta_click）を診断ページに実装。`@vercel/analytics`導入 |
| 2026-06-09 | **Dev.to記事公開 + devto_integration復旧**: 欠落モジュールを復元。診断ツール紹介記事を公開 (dev.to/naoanao/...)。SageのBluesky自動投稿に診断PR3件追加 |
| 2026-06-09 | **欠落モジュール復元**: notion_content_pool, auto_regulator, instagram_integration, image_generation の4モジュールをworktreeから復元。BlogScheduler/AutonomousAdapter/Instagram/画像生成エラー解消 |
| 2026-06-09 | **GA4タグ追加**: Growl layout.tsx にGoogle Analytics 4タグを追加（G-Y1B7VSVBDK）。Vercel Analyticsと併用 |
| 2026-06-09 | **収益化マスター計画策定**: `backend/cognitive/monetization_master_plan.md` 作成。Phase1（値上げ+機能ゲート）・Phase2（流通内蔵）・Phase3（Meta広告）の3段階戦略 |

## 8c. 精緻な部分的詳細機能の動作状況チェック（2026-05-28 策定） 精緻な部分的詳細機能の動作状況チェック（2026-05-28 策定）

コードベースおよび環境設定（APIキー等）と直接突き合わせ、レポート記載の「部分的・詳細な制御機能」が本当に使えるかどうかを漏れなく判定した一覧です。

### 🟢 今すぐ使えるロジック機能（完全稼働 or 動作可能）
*   **脳型AI v2.0.1（決定論的ハッシュ連想メモリシステム：Vector-Associative Memory）** (`neuromorphic_brain.py`): 
    *   **MD5ハッシュ高速リコール＆連想キャッシュメモリ**: 🟢 **完全稼働中**（クエリを決定論的ハッシュ化し、`brain_short_term.json` に焼き付けられた記憶を0.01秒以下で超高速検索・直感即答する）
    *   **確信度（Confidence）判定＆論理脳フォールバック**: 🟢 **完全稼働中**（脳内メモリに記憶がヒットした場合は確信度 `0.98` で直感即答、記憶にない場合は確信度 `0.15` を返し、自動的に論理思考脳（Gemini/Groq）へバトンタッチする高度なハイブリッド構成）
    *   **即時焼き付け学習機能 (`provide_feedback`)**: 🟢 **完全稼働中**（ユーザーが良い回答と認めた際、フィードバックを受けて即座に `brain_short_term.json` にハッシュキーと回答をマッピングし、即時永続化する堅牢なキャッシュ焼き付け学習）
*   **動画生成ロード中リトライ** (`kling_agent.py`): HF Inference APIの503（モデルロード中）検知時、予測時間 `estimated_time` に基づき最大3回自動リトライするハンドラー。(`HF_TOKEN` が有効なため動作可能)
*   **インテリジェント音楽スタイル判定** (`suno_agent.py`): ニッチ/トピック（lo-fi, synthwave等）の自動文字列解析によるBGM作曲プロンプト生成。(`HF_TOKEN` が有効なため動作可能)
*   **BGM長さ制御** (`suno_agent.py`): 秒数×50の `max_new_tokens` による厳密なBGM演奏時間コントロール。
*   **本人音声クローン (Instant Voice Cloning)** (`fish_audio_integration.py`): ナオさん本人のリファレンス音声（WAV/MP3）と文字起こしテキストの multipart 送信によるクローン音声生成。(`FISH_AUDIO_API_KEY` 有効で動作可能)
*   **教材ナレーション一括スロットリング生成** (`fish_audio_integration.py`): 複数セクションテキストを一斉インポートし、API制限を回避するため「1秒ディレイ」を挟みながら時系列に音声ファイルを自動生成。
*   **PDF日本語豆腐化回避オートレイアウト** (`pdf_generator.py`): 日本語フォント `IPAGothic` の自動検出、改行タグ置換によるブランドカラーPDF自律出力。
*   **週次SNSレポート自動集計** (`pdf_generator.py`): `sns_evidence.jsonl` の証跡ログを自動でパースし、成功/失敗数やカテゴリ別割合を自動集計・描画。
*   **スクレイピング結合・対話台本生成** (`notebooklm_integration.py`): Tavily検索URLの自動本文スクレイピング（最大8000文字/URL）と、2人スピーカーによる対話型ポッドキャスト風スクリプト生成。
*   **ChromaDB全記憶エクスポート** (`notebooklm_integration.py`): 長期記憶のChromaDBから全対話ログをダウンロードし、NotebookLM用マークダウン `SAGE_MASTER_BRAIN.md` を自動構築。
*   **pyautoguiによる座標自動クリック** (`computer_vision_agent.py`): 座標 (x, y) を受け取り、pyautoguiでマウスを自動移動し自律クリックする処理。
*   **SNS人間らしさ偽装演出** (`sns_daily_scheduler.py`): 毎週ランダムに2日間の「休日設定」、投稿時の「20%確率でサボる(スキップ)」、予定時間に対する「2分〜40分のランダム遅延（ジッター値）」による機械的規則性の排除。
*   **6並列市場調査分析** (`/api/market-research`): 楽天・Tavilyから悲鳴（痛みの声）を収集し、3C・PEST・SWOT・VRIO分析へ同時に並列流し込みして分析するエンジン（Groqで完全稼働）。
*   **STP分析数値座標マッピング** (`marketing/analyze/route.ts`): 自社・競合に `(X, Y)` 座標（0.0〜1.0）を動的プロットしてフロントのCanvas/SVGポジショニングマップと完全連動。
*   **AEO/GEO対策 FAQPage/Product Schema JSON-LD自動生成** (`marketing/analyze/route.ts`): AI検索推奨の7原則に基づく、構造化データのスキーマコード自動生成。
*   **ハルシネーション自動検閲バリデーター** (`gemini.ts` - `sanitizeActions`): アクション内の「実在しないSNS機能」「その店舗で提供不可能なサービス」を自動検知・排除。
*   **コンバージョン心理学に基づく特典自動生成** (`_generate_bonuses`): 「48時間限定」「部数限定」のセールスコピーの英日自動切り替え・自動合成。
*   **TitleOptimizer 5大心理学技法タイトル自動リライト** (`TitleOptimizer`): 数字・権威・具体性・ブラケット・ベネフィットの5大正規表現パターンによる自動リライト。
*   **タイムアウト突破型 非同期ジョブシステム・ポーリングAPI** (`/api/jobs/pipeline/start`): HTTP 202 Accepted と `job_id` の即時返却、およびフロントの4秒間隔のステータスポーリング。
*   **「No tools executed」バグ自動検知**: AIがWeb検索やリサーチに対してツールを呼び出さずに空返答するバグの有無を、プロンプト疑似実行から厳密に検閲・検知。

### 🔴 現在は使えない・停止しているロジック機能
*   **脳型AI v1.0（SNN：スパイキングニューラルネットワーク）** (`neuromorphic_brain.py` v1.0仕様):
    *   **Pythonライブラリ `snnTorch` によるSNN構築**: ❌ **廃止・使用不可**（実務上の「非学習ループ（学習が進まないバグ）」に陥ったため完全に廃止）
    *   **1000入力ニューロン × 10層 × 5出力の立体ネットワーク**: ❌ **廃止・使用不可**
    *   **LIF（Leaky Integrate-and-Fire）ニューロンモデル（電気信号発火発信機構）**: ❌ **廃止・使用不可**
    *   **STDP（スパイクタイミング依存可塑性）シナプス学習機能**: ❌ **廃止・使用不可**
    *   **応答速度0.257秒・Confidence 0.5のLLMバトンタッチ分岐（v1.0仕様）**: ❌ **廃止・使用不可**
*   **Gemini Visionによる画面要素の座標特定** (`computer_vision_agent.py`): デスクトップ画像をキャプチャし、Gemini Visionに座標特定を求め、 `{x, y, found, confidence}` を返させる処理。(**Gemini APIのquota超過のためエラーとなり停止中**)
*   **LINEのアクションステータス自動更新** (`line/webhook/route.ts`): ユーザーメッセージをトリガーにしたSupabaseアクション完了ステータス自動更新。(**英語圏対応によるLINE隠蔽・停止中**)
*   **LINEの感情学習とプロフィール学習DB同期** (`line/webhook/route.ts`): 「フィードバック待機状態」遷移と、ユーザーからの成果（感情データ）のプロフィールDB自動保存・次回プロンプトへの動的注入。(**英語圏対応によるLINE隠蔽・停止中**)IにGrowlのマーケを全部任せた。2ヶ月後の正直な数字」を優先公開推奨 |
| 2026-05-24 | Growl英語圏完全対応①: LINE関連文言を英語UIから全削除（LP・upgrade・share text・onboarding・dashboard） |
| 2026-05-24 | Growl英語圏完全対応②: 英語ユーザーはLINE連携ページをスキップしてダッシュボードへ直行（line/page.tsx） |
| 2026-05-24 | Growl英語圏完全対応③: /upgradeをUSD表記（$0/$19/$49）に変更。ヘッダーからLINE削除 |
| 2026-05-24 | Growl英語圏完全対応④: 全onboardingページのe.g.例文の「」→英語では"..."に変更 |
| 2026-05-24 | Growl英語圏完全対応⑤: Shibuya/Tanaka Caféプレースホルダーを英語中立表現に変更 |
| 2026-05-24 | Growl英語圏完全対応⑥: generate-post APIに英語専用INDUSTRY_POST_HINTS_EN追加（LINE不使用）。架空情報禁止ルールを英語でも明示 |
| 2026-05-24 | Growl英語圏完全対応⑦: getLangInstruction()を強化（LINE禁止・架空情報禁止・自然な英語表現の指示を追加）。全8フレームワーク（PEST/3C/SWOT/STP/4P/VRIO/AEO/ULSSAS）に適用 |
| 2026-05-24 | Growl英語圏完全対応⑧: dashboardのLINEバナーを英語ユーザーには非表示 |
| 2026-05-24 | SAGE_MASTER_CONTEXT.md・Complete Report更新 |
| 2026-05-24 | Growl英語圏完全対応⑨: PEST/STP/VRIO/ULSSASに英語専用JSONテンプレート追加（フレームワーク名・セクションキー・説明文すべて英語）。getLangInstruction強化（クーポン・紹介割引・未入力SNS・架空イベント禁止）。commit 10bab53 |
| 2026-05-24 | note_scheduler.py最適化: プロンプト文字列のみ更新（構造・関数呼び出しは変更なし）。①ランダム型割り当て（マーケ：結論先出し×実務解説 or 体験談×問題解決 / Growlストーリー：日常の違和感×普遍的気づき or 感情共感×励まし）②なおさんの口調注入（「〜だと思います」「〜なんですよね」「〜してみてください」等）③ペルソナ強化（「バーガーショップ」→「飲食店・イベント企画等リアルな現場を渡り歩いた実務家」）|
| 2026-05-24 | 英語/日本語プロンプト分離確認: course_production_pipeline.py・blog_scheduler.py・sns_daily_scheduler.pyはlanguage=="ja"/"en"で完全分岐。英語プロンプトは「スマートで直接的なメンタートーン」「Build in Publicトーン」として高精度済み。むやみな変更は不要と確認 |
| 2026-05-25 | PH Gallery英語画像5枚（ph_01_hero〜ph_05_pricing）Vercel push・JavaScript DataTransfer injection経由でPHギャラリーにアップロード完了。"All changes saved successfully"確認済み。PHローンチ準備100%完了 |
| 2026-05-25 | 収益化戦略4本柱・英語圏集客ロードマップ策定。NEXT_SESSION_HANDOFF.md全面更新 |
| 2026-05-25 | PH Gallery英語画像5枚（ph_01_hero〜ph_05_pricing）Vercel push・PHギャラリーアップロード完了。PHローンチ準備100%完了 |
| 2026-05-25 | **Gumroad販売文全面リライト**: `backend/cognitive/Gumroad_Sales_Page_Copy.md` を開発者向けから「飲食店オーナー・ソロファウンダー向け」に変更。冒頭「I'm a restaurant owner in Japan who turned himself into a solo AI builder」。価格$49・30日保証そのまま。 |
| 2026-05-25 | **AppSumo申請送信完了**: HubSpotフォームにGrowlを申請（name:内野尚迪、email:naofumi0930@gmail.com、phone:09038670543）。AppSumoは1キャンペーン$40K〜$400K規模の自動販売チャネル。 |
| 2026-05-25 | **note記事3本目投稿**: 「バーガーショップの集客問題を解決しようとした。正直、苦労した」(customer_journey theme) を note.com に公開。2週連続投稿バッジ取得。末尾Gumroad CTA入り。 |
| 2026-05-25 | **FutureTools.io申請完了**: Sage Blueprint（Paid→Freeとして登録）+ Growl（Freemium）の2本をMatt宛に送信。レビュー通過後に掲載される。 |
| 2026-05-25 | **DISTRIBUTION_SUBMISSION_KIT.md作成**: `backend/cognitive/DISTRIBUTION_SUBMISSION_KIT.md`。Uneed/SaaSHub/AlternativeTo/BetaList/FutureTools/TAAFT/Show HN/Reddit向けの全コピー完備。なおさんがアカウント登録後にコピペで60分完了できる形式。 |
| 2026-05-26 | **PH Launch Day（Day 360）**: GrowlがProduct Huntにローンチ。16:01 JST開始。 |
| 2026-05-26 | **note記事4本目投稿**: 「路上キャッチで学んだ、人が足を止める瞬間　AIDAという考え方」(n6c8621f787a2) を公開。10:53 JST。 |
| 2026-05-26 | **note_scheduler.py 全面改訂 + バイナリ破損修復**: ファイルがUTF-8 24590バイトで途中切断されていた（0xe3で終端）。Write toolで完全再構築。プロンプトを実際の公開記事（n6c8621f787a2）から文体を解析して大幅改善。主要変更: ①断言調語尾「〜だった。」「〜だけだ。」に統一（曖昧語尾を廃止）②**太字**指示を追加③フレームワーク名は後半登場ルール④記憶の中の会話引用を許可⑤ハッシュタグ指定を追加⑥タイトルパターン1に「体験で学んだ、〇〇　△△という考え方」（全角スペース区切り）を追加⑦構成パターンを3種に整理 |
| 2026-05-26 | **note文体解析（n6c8621f787a2）**: 実際の記事から文体ルールを確立。記事構成：場面先行→失敗→転換点の会話引用→気づき→フレームワーク後出し→現在への応用。CTAなしで終わる記事パターンも確認。 |
| 2026-05-26 | **PH Launch 16:01 JST ライブ確認**: "Launching today"表示。18:00時点で1フォロワー・コメント0件・なおさん自己Upvote実施。PH Forumスレッド（p/growl）にはメーカーコメントのみ。ユーザーコメント待ち中。 |
| 2026-05-26 | **Gumroad確認完了**: 不要商品（6点）はすでに全てUnpublish済み（前セッション完了）。apvbzh（Sage Blueprint $49）の新販売文も適用済み。追加作業不要。 |
| 2026-05-26 | **note 3C記事リライト完了**: note_draft_3c_uncle_sam.md を実際の上位記事スタイルに全面修正。`---`区切り6箇所・H3ヘッダー・箇条書きを除去。場面先行→断言調→フレームワーク後出しの書き流し文体に統一。 |
| 2026-05-26 | **note プロフィール文（140字以内）作成**: backend/data/note_profile_140.md に3案保存。推奨案（84字）:「バーガー屋を経営しながら、AIで自分の分身を作りました。マーケ × AI × 小さな商売の話を書いてます。飲食店向けSaaS「Growl」と自動投稿システム「Sage」を開発・販売中。」 |
| 2026-05-26 | **FutureTools.io 確認**: 前日（5/25）にSage Blueprint + Growlの2本申請済み。本日追加で再送信（重複の可能性あり）。レビュー待ち。 |
| 2026-05-26 | **ディレクトリ登録状況**: Uneed.best（ログイン必要・未完）/ SaaSHub（Vercelサブドメインは規約上非推奨・提出試みるも応答なし）/ AlternativeTo（アカウント必要・未完）/ Fazier（アカウント必要・未完）。残りはなおさんがアカウント登録後にDISTRIBUTION_SUBMISSION_KIT.mdのコピペで対応。 |
| 2026-05-27 | **note記事資産化**: `backend/data/note_article_assets.json` 作成。AIDA/STP/3C/SWOT/PESTの記事・下書き・役割・次回接続メモを保存。今後の記事生成はこの資産を参照する。 |
| 2026-05-27 | **公開note解析機能追加**: `backend/modules/note_article_analyzer.py` 作成。note公開URLから記事キー抽出→`/api/v3/notes/{key}`取得→本文・文字数・行数・文体特徴を解析。API失敗時はHTMLメタ情報にfallback。AIDA記事で取得成功（1889字、API取得）。 |
| 2026-05-27 | **note PEST記事公開確認**: 「店の中だけ見ていても、勝ち筋は見えなかった。PESTを地産地消バーガーで覚えた話」(n4bf7254ba75b) を確認。2726字・189行。PESTは「店の外で吹いている風を見る道具」として表現。記事資産に公開URLと解析結果を反映。 |
| 2026-05-27 | **note次回方針 USP**: 次のマーケ復習回は「地元食材を使っていた。でも当時は、それを選ばれる理由にできていなかった」。当時から理論で動いた話ではなく、過去経験をマーケターとして復習・言語化する立ち位置を厳守。 |
| 2026-05-28 | **趣味AI回の差し込み方針**: マーケ復習が続いたので、次に「AIは効率化ツールだと思っていた。でも本当は、妄想を形にする道具だった」を挟む案が有力。Bluesky自動化リンク（kanagawatable / kanagawajapan）を「実際にSageが動いている場所」として自然に入れる。 |
| 2026-05-29 | **STP記事 pending_review登録**: note_article_assets.jsonの本文（2109字）をnote_drafts.json Day 360にpending_reviewとして追加。次のnote自動投稿で公開される。 |
| 2026-05-29 | **SWOT記事 生成・pending_review登録**: body_summaryから本文（1772字）を生成。「強みだと思っていなかった接客が、店の勝ち筋だった。SWOTをバーガー屋で覚えた話」をDay 361にpending_review追加。 |
| 2026-05-29 | **PH結果確認**: 3 upvotes / 0 comments / 2 followers。IH_POST_PH_RESULTS.mdに実数を反映済み。 |
| 2026-05-29 | **Bluesky投稿（kanagawatable）**: PH結果＋今週のCold DM宣言投稿。Bluesky AT Protocol APIで直接投稿成功（uri: at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmx2fx7dce2i）。 |
| 2026-05-29 | **Cold DMターゲットリスト作成**: #カフェオーナーから5件収集（calm__0226 / yutaro.cheesecake / can_cafe_owner / take103103 / itsuki.cxo）。`backend/data/cold_dm_targets_20260529.md`に保存。DM文案も用意済み。 |
| 2026-05-29 | **IH投稿制限判明**: このChromeのIHアカウントは「新規アカウント」扱いで投稿権限なし。まずIHでコメントをして権限を獲得する必要あり。なおさんが別ブラウザ/デバイスから投稿するか、コメントで権限を積み上げる。 |
| 2026-05-29 | **Dev.to 記事2本 Claude自律投稿**: 記事1（build-in-public）→ https://dev.to/naoanao/i-built-an-ai-clone-of-myself-to-run-my-restaurants-marketing-while-i-sleep-and-sold-the-4fl9 / 記事2（LangGraph+Groq技術）→ https://dev.to/naoanao/how-i-built-an-autonomous-ai-agent-with-langgraph-groq-that-runs-my-marketing-while-i-sleep-3615 |
| 2026-05-29 | **Whop Sage Blueprint $49 出品完了（Claude自律・ブラウザ経由）**: Product ID: prod_qMlc96acLiEFk / チェックアウトURL: https://whop.com/checkout/prod_qMlc96acLiEFk/ / Bluesky告知済み |
| 2026-05-29 | **Reddit/HN投稿文作成**: `backend/cognitive/REDDIT_HN_POSTS_20260529.md` にr/restaurantowners・r/smallbusiness・r/indiehackers・Show HN用テキスト完備。なおさんがコピペで投稿可能。 |
| 2026-05-29 | **AIxploria調査**: 無料フォームはJSレンダリング不可・700ツールキュー。有料（Fast $79〜）のみ実用的。カスタムドメイン取得後に再検討。 |

---

## 8a. 収益化戦略（2026-05-26 ブラッシュアップ）

> ⚠️ AIへ: この戦略は毎回読むこと。「新機能を作ろう」「作り直そう」という発想を止めるための錨。

### 現在地（Day 360）
- **売上：0円**（PH Launch Day 当日。Stripe稼働中、AppSumo申請済み）
- **note**：4本投稿済み。週1ペースで継続中。
- **Bluesky**：2アカウント自動投稿稼働中（1〜2投稿/日）
- **Growl**：growl-app.vercel.app で課金受付中（¥3,000/¥8,000）
- **Sage Blueprint**：Gumroad $49。販売文リライト済み。売上0。

### 大原則
**新規開発ゼロ。既存Sageスタックに「ラベルと販売導線」をかぶせるだけ。**

### 4本柱（優先順・Day 360時点）

| 優先 | 商品 | 既存資産 | 価格 | 次のアクション |
|---|---|---|---|---|
| **1** | **Growl 飲食店版** | 週次アクション生成稼働中 | ¥3,000〜8,000/月 | 飲食店オーナーへのCold DM（週5件）+ note記事でのソフトCTA |
| **2** | **Sage Blueprint** | Gumroad $49 掲載済み | $49一括 | なおさんがGumroad商品ページに新販売文を貼る + Instagram bio更新確認 |
| **3** | **AppSumo / IH / PH** | 各申請・投稿済み | — | PHコメント返信（今日）。IH連載継続（月3〜4本）|
| **4** | **Bluesky Scheduler SaaS** | SageSNSScheduler稼働中 | $19〜49/月 | 英語圏で実績を積んだ後（90日後以降） |

### ガードレール（Day 360〜450）
- **作り直し禁止**
- **新機能開発禁止**（バグ修正・文言変更のみ）
- **1週間1テーマ**（同時並行はゼロ）
- **最優先KPI**: 有料1件を取ること。4週間以内に取れなければ価格かターゲットを変える。
- **次のマイルストーン**: 月1万円 → 月10万円 → 月100万円の順番

### 英語圏集客チャネル（優先順）

**なぜ英語圏か**: noteはJP向けで母数が少ない。IHのCVR 23.1%（PHの7倍）。コミュニティに飛び込む形が必須。

| チャネル | 方法 | 担当 | 頻度 |
|---|---|---|---|
| Product Hunt | PHコメント即返信（今日）+ フォローアップ | なおさん | 今日 |
| Indie Hackers | 「Day 0→売上0→¥1→¥10万」連載 | なおさん | 月3〜4本 |
| Cold DM | Twitter「restaurant owner」検索 → DM | なおさん | 週5〜10件 |
| Reddit (r/SaaS, r/indiehackers) | マイルストーン体験談投稿 | なおさん | 月2〜3本 |
| Bluesky補完コンテンツ | IH記事周辺コンテンツ配信 | Sage自動 | 毎日 |

**IH Cold DMテンプレ（EN飲食店向け）:**
> "We built Growl to help restaurant owners attract customers in 30 mins/week. Mind if I share a quick demo?"

### note戦略（JP向け・補完チャネル）
- **週1投稿**ペースを維持（Sage自動生成 + なおさんが確認・公開）
- **文体**: 場面先行。断言調。フレームワーク後出し。（n6c8621f787a2スタイルを基準とする）
- **ハッシュタグ**: #マーケティング #中小企業 #個人事業主 #AI活用 を毎回付ける
- **CTA**: 末尾1行のみ。Gumroadかgrowl-app.vercel.appへのリンク（なくてもいい）
- **記事資産**: `backend/data/note_article_assets.json` を参照。AIDA/STP/3C/SWOT/PESTの流れ、公開URL、文体メモ、次回接続メモを保存済み。
- **公開記事解析**: `python -m backend.modules.note_article_analyzer <note_url>` でnote本文・文字数・文体特徴を取得できる。次の記事生成前に直近記事を必ず確認する。
- **基本シリーズ**: 過去の現場経験を、今マーケターとして復習・言語化する。記事内では「当時から理論で実行していた」と言わず、「あとから振り返ると近かった」と書く。
- 差し込み回**: 3〜4本に1本は趣味AI/時事AI/Growl開発記録を挟んでよい。最有力: 「AIは効率化ツールだと思っていた。でも本当は、妄想を形にする道具だった」。Bluesky自動化リンクを実例として自然に入れる。

---

## 8b. 英語圏市場向け商品化優先順位＆今後需要が伸びそうな実用的機能の評価（2026-05-28 策定）

英語圏市場（インディハッカー、中小企業、飲食店）をターゲットに、Sageシステム全体で最も売りやすく、将来的に需要が伸びそうな「真の実用的機能」を体系的に評価・マージした戦略マップです。

### 📊 ① 英語圏で売りやすい商品化優先順位

| 優先 | 商品候補 | 需要 | 商品化・販売の方向性 |
|---|---|---|---|
| **1** | **Growl for Restaurants / SMB Marketing Copilot** | 🔥 極めて高 | **すぐ売るべき本命**。週次アクション、商品マーケAI、レビュー返信、SNS自動文、AEO/GEO対策が一体化したSaaS。小規模店舗は「毎週何をすればいいか」の戦術が最大の課題。 |
| **2** | **AI Short-form Content Engine** | 🔥 高 | Sageの動画自動生成（`video_generator.py`）、BGM作曲（`suno_agent`）、音声クローン（`fish_audio`）、YouTube Shorts/Reels自動アップロードをひとまとめにした機能。SaaSより「制作代行/動画テンプレート販売」が最もマネタイズが早い。 |
| **3** | **Sage Blueprint / Autonomous AI Content System** | 高 | Indie Hackers向けに「自律投稿・自動ブログ・市場調査・収益導線の作り方」を網羅した **$49の裏側公開教材/コードテンプレート** として販売。ナオさんの「ソロAIビルダーの軌跡」をストーリーにして売る。 |
| **4** | **AEO/GEO Lite for SMBs** | 高 | AI検索対策（GEO）は全く新しい新市場。GrowlのFAQPage/Product Schema JSON-LD自動生成とAI検索推奨の7原則を簡単化し、「AI検索に引用されるための対策キット」として差別化。 |
| **5** | **LearnAI: Learn-to-Content Tool** | 中 | NotebookLMなどの巨人がいる普通のノートアプリでは埋もれる。しかし「学んだ内容（動画やメモ）を一瞬で高品質なブログやSNSスレッドに変換する」という **"learn once, publish everywhere"** に絞ることでクリエイター向けに差別化が可能。 |
| **6** | **Vision RPA / Local AI Operator** | 中 | APIのない画面操作をGemini Visionで行う機能は面白いが、顧客に直接SaaS提供するのはサポート負荷が重い。裏側機能として維持しつつ、将来「ローカルビジネス自動化セットアップ」の超高単価カスタム案件向けに使う。 |
| **7** | **Figma-to-Code / Dify / Cloudflare/ngrok基盤** | 中 | 開発者向け需要はあるが、Builder.ioやFigma公式AIなど競合が強大。主商品にはせず、Sage Blueprint $49 の魅力的な購入特典教材として組み合わせるのが賢明。 |

### 🛠️ ② 今後需要が急上昇しそうな「面白い実用的隠れ機能」

1.  **🎥 AI動画UGC生成パイプライン (最も見逃せない隠れ資産)**:
    `video_generator.py`, `kling_agent.py` (LTX-Video), `suno_agent.py` (MusicGen), `fish_audio_integration.py` が一体化した仕組み。
    *   **価値**: 単なるSNS文章投稿ではなく、**「投稿案 ➔ 自動台本 ➔ LTX縦型動画 ➔ MusicGen無料BGM ➔ FishAudio本人音声クローン ➔ YouTube Shorts/Reels投稿」** までを無人完結できる。2025年後半〜2026年にかけて、AI動画制作需要は66%増、自動化サービス需要は136%増と急成長中。
2.  **🧠 D1/D1.5/D3 リサーチ➔ファクト検証➔投稿下書きパイプライン**:
    PerplexityでAIやWebマーケの最新トレンドを調査し（D1）、ファクトやURLの信頼性を検証し（D1.5）、各種SNSやnoteの下書き原稿を作成する（D3）一連の流れ。
    *   **価値**: 2026年の小規模ビジネス向けAI自動化レポートにおいて、業務フローを最後まで進める「実務完結型エージェント」の需要が急増中。
3.  **📡 LearnAIの「画面自動取込・YouTube・音声吹き込み」➔ note/SNS記事化**:
    学習した講座やYouTube動画から、30秒ごとの差分画像解析や音声文字起こしを経て、一瞬で note や Medium/LinkedIn などの「体験談型」「ストーリー型」記事に変換し、Notionタスクと同期する機能。
    *   **価値**: クリエイターや教育者、インディーハッカー向けの「発信量極大化ツール（Learn-to-Content）」として極めて実用的。

### 📈 ③ ブラウジングに基づく市場調査・需要根拠

*   **中小企業（SMB）のAI需要**:
    Thryvの2025年AI小規模事業者調査では、AIの利用率が前年の39%から**55%へ急増**。利用しているSMBの58%が「月に20時間以上の労働節約」を報告。Constant Contactの調査でもSMBの48%がマーケティングにAIを活用しており、主な用途は「Eメール・SNSコピーの執筆」。さらにvcita調査によると、SMBの52%がマーケティング業務を外部に委託し、高額（月$3,000まで）を支払っているため、安価なAI代替の市場余地は非常に大きいです。
*   **飲食店（レストラン）のAI・SNS需要**:
    TouchBistroの2025年レストランレポートでは、米国独立系レストランの **99%がSNSプロフィールを保有** し、TikTokの集客利用も増加。レストランAI利用のトップ用途が「マーケティング（SNS投稿やキャンペーン作成）」です。したがって、Growlの「飲食店オーナーが週30分で今週の集客施策を自動生成する」アプローチは極めて時流に合致しています。
*   **AEO/GEO (AI検索エンジン最適化) の爆発的需要**:
    a16z（Andreessen Horowitz）やCB InsightsなどのトップVCが、従来のSEOに代わる **GEO (Generative Engine Optimization)** を「新しい巨大市場」として注目し始めています。Growlの「FAQPage/Product Schema JSON-LD自動生成」はまさにこれに直撃しています。

### 🎯 ④ 優先商品化ロードマップ

1.  **Growl Restaurant Marketing Copilot (本命)**:
    *   **訴求**: *“3 marketing actions every week for independent restaurants.”*
    *   **打ち手**: 機能をてんこ盛りに見せず、「週に3アクションだけ」「コピペ用投稿・レビュー返信・LINE文」「AI検索GEO対策」にフォーカスして売る。

---

## 8c. 精緻な部分的詳細機能の動作状況チェック（2026-05-28 策定）

コードベースおよび環境設定（APIキー等）と直接突き合わせ、レポート記載の「部分的・詳細な制御機能」が本当に使えるかどうかを漏れなく判定した一覧です。

### 🟢 今すぐ使えるロジック機能（完全稼働 or 動作可能）
*   **動画生成ロード中リトライ** (`kling_agent.py`): HF Inference APIの503（モデルロード中）検知時、予測時間 `estimated_time` に基づき最大3回自動リトライするハンドラー。(`HF_TOKEN` が有効なため動作可能)
*   **インテリジェント音楽スタイル判定** (`suno_agent.py`): ニッチ/トピック（lo-fi, synthwave等）の自動文字列解析によるBGM作曲プロンプト生成。(`HF_TOKEN` が有効なため動作可能)
*   **BGM長さ制御** (`suno_agent.py`): 秒数×50の `max_new_tokens` による厳密なBGM演奏時間コントロール。
*   **本人音声クローン (Instant Voice Cloning)** (`fish_audio_integration.py`): ナオさん本人のリファレンス音声（WAV/MP3）と文字起こしテキストの multipart 送信によるクローン音声生成。(`FISH_AUDIO_API_KEY` 有効で動作可能)
*   **教材ナレーション一括スロットリング生成** (`fish_audio_integration.py`): 複数セクションテキストを一斉インポートし、API制限を回避するため「1秒ディレイ」を挟みながら時系列に音声ファイルを自動生成。
*   **PDF日本語豆腐化回避オートレイアウト** (`pdf_generator.py`): 日本語フォント `IPAGothic` の自動検出、改行タグ置換によるブランドカラーPDF自律出力。
*   **週次SNSレポート自動集計** (`pdf_generator.py`): `sns_evidence.jsonl` の証跡ログを自動でパースし、成功/失敗数やカテゴリ別割合を自動集計・描画。
*   **スクレイピング結合・対話台本生成** (`notebooklm_integration.py`): Tavily検索URLの自動本文スクレイピング（最大8000文字/URL）と、2人スピーカーによる対話型ポッドキャスト風スクリプト生成。
*   **ChromaDB全記憶エクスポート** (`notebooklm_integration.py`): 長期記憶のChromaDBから全対話ログをダウンロードし、NotebookLM用マークダウン `SAGE_MASTER_BRAIN.md` を自動構築。
*   **pyautoguiによる座標自動クリック** (`computer_vision_agent.py`): 座標 (x, y) を受け取り、pyautoguiでマウスを自動移動し自律クリックする処理。
*   **SNS人間らしさ偽装演出** (`sns_daily_scheduler.py`): 毎週ランダムに2日間の「休日設定」、投稿時の「20%確率でサボる(スキップ)」、予定時間に対する「2分〜40分のランダム遅延（ジッター値）」による機械的規則性の排除。
*   **6並列市場調査分析** (`/api/market-research`): 楽天・Tavilyから悲鳴（痛みの声）を収集し、3C・PEST・SWOT・VRIO分析へ同時に並列流し込みして分析するエンジン（Groqで完全稼働）。
*   **STP分析数値座標マッピング** (`marketing/analyze/route.ts`): 自社・競合に `(X, Y)` 座標（0.0〜1.0）を動的プロットしてフロントのCanvas/SVGポジショニングマップと完全連動。
*   **AEO/GEO対策 FAQPage/Product Schema JSON-LD自動生成** (`marketing/analyze/route.ts`): AI検索推奨の7原則に基づく、構造化データのスキーマコード自動生成。
*   **ハルシネーション自動検閲バリデーター** (`gemini.ts` - `sanitizeActions`): アクション内の「実在しないSNS機能」「その店舗で提供不可能なサービス」を自動検知・排除。
*   **コンバージョン心理学に基づく特典自動生成** (`_generate_bonuses`): 「48時間限定」「部数限定」のセールスコピーの英日自動切り替え・自動合成。
*   **TitleOptimizer 5大心理学技法タイトル自動リライト** (`TitleOptimizer`): 数字・権威・具体性・ブラケット・ベネフィットの5大正規表現パターンによる自動リライト。
*   **タイムアウト突破型 非同期ジョブシステム・ポーリングAPI** (`/api/jobs/pipeline/start`): HTTP 202 Accepted と `job_id` の即時返却、およびフロントの4秒間隔のステータスポーリング。
*   **「No tools executed」バグ自動検知**: AIがWeb検索やリサーチに対してツールを呼び出さずに空返答するバグの有無を、プロンプト疑似実行から厳密に検閲・検知。

### 🔴 現在は使えない・停止しているロジック機能
*   **Gemini Visionによる画面要素の座標特定** (`computer_vision_agent.py`): デスクトップ画像をキャプチャし、Gemini Visionに座標特定を求め、 `{x, y, found, confidence}` を返させる処理。(**Gemini APIのquota超過のためエラーとなり停止中**)
*   **LINEのアクションステータス自動更新** (`line/webhook/route.ts`): ユーザーメッセージをトリガーにしたSupabaseアクション完了ステータス自動更新。(**英語圏対応によるLINE隠蔽・停止中**)
*   **LINEの感情学習とプロフィール学習DB同期** (`line/webhook/route.ts`): 「フィードバック待機状態」遷移と、ユーザーからの成果（感情データ）のプロフィールDB自動保存・次回プロンプトへの動的注入。(**英語圏対応によるLINE隠蔽・停止中**)
*   **脳型AI（Neuromorphic Brain）のスパイキングニューラルネットワーク (SNN)** (`neuromorphic_brain.py` v1.0): `snnTorch` や LIFモデル、STDP学習を用いた脳神経模倣ネットワーク。(**「非学習ループ」バグ解消のため廃止され、現在はMD5ハッシュ連想キャッシュメモリ v2.0.1 に進化・置換されています**)

---

## 9. AIアシスタントへのルール（CLAUDE.mdと合わせて読むこと）

1. **Notionのタスクリストにないことはやらない** — なおさんの意図しない変更を防ぐ
2. **git commit / pushは必ず確認を取る**
3. **identity.jsonの変更は確認不要**（2026-05-19 なおさんから包括的な許可取得済み）
4. **このファイルを更新するのはAIの重要な責務** — 解決した問題・新しい発見を毎回ここに書く
5. **繰り返さない原則**: 既知問題の解決策はここに書いてある。再発したら解決策を見て即対処。

---

## 10. なおさんがよく使うフレーズの意味

| フレーズ | 意味 |
|---|---|
| 「分身」 | Sageがなおさんの代わりにPCで全作業をこなすというコアコンセプト |
| 「Vision Freeman」 | 3年ロードマップの名称 |
| 「Uncle Sam」 | なおさんのバーガーショップ名 |
| 「Growl」 | AIマーケリサーチツール（Sage AIとは別プロダクト） |
| 「LearnAI」 | AI学習ツール |
| 「今わたしはやることがあるので任せます」 | これはTier 1自律実行の許可。後でTelegramで確認 |
| 「頼むよ」 | 信頼して任せるという意味。自律的に進めてOK |

---

---

## 11. Vision Freeman 収益化ロードマップ（AIが常に参照すること）

### 現在地：1年目 Day 360（2026-05-26）

**1年目のゴール**: Sage + Growl + LearnAI の収益化。1日3時間で年収1千万。業務を全部AIに任せる。

#### 収益化の現状（2026-05-26 更新）

| 商品 | 状況 | 残アクション |
|---|---|---|
| **Sage Blueprint ($49)** | Gumroad掲載済み✅。Whop掲載済み✅（prod_qMlc96acLiEFk）。販売文リライト済み✅。FutureTools.io申請済み✅。Dev.to記事2本（SEO資産）✅。Sales: **0**。 | カスタムドメイン取得後: Uneed/SaaSHub。今すぐ: Reddit/HN投稿（REDDIT_HN_POSTS_20260529.md参照） |
| **Growl Standard (¥3,000/月)** | Stripe ✅ Webhook ✅ payment-success ✅ AppSumo申請済み ✅ FutureTools.io申請済み ✅ PH Launch ✅ | **課金受付完全稼働中。初回有料獲得が最優先** |
| **Growl Pro (¥8,000/月)** | 同上 | 同上 |
| LearnAI | ローカル稼働。未公開 | 将来: Vercelにデプロイ → Gumroad無料配布 |
| CBD ECショップ | 未着手 | 1年目の後半に検討 |

#### ✅ インフラ設定（完了済み）
- Stripeダッシュボード webhook: `https://growl-app.vercel.app/api/webhook/stripe`
- Vercel環境変数 `STRIPE_WEBHOOK_SECRET` 設定済み
- payment-success ページ作成済み
- Instagram bioリンク → Gumroad（2026-05-25 実行済み）
- **Growlは課金を受け付けられる状態**

#### なおさんがやること（残り・未完了）
1. **Gumroad** → 不要商品4つをUnpublish（PRODUCT_STRATEGY.md参照）← **未完了**
2. **Gumroad** → `Gumroad_Sales_Page_Copy.md` の新しい販売文を `apvbzh` 商品ページに手動で貼り付け ← **未完了**
3. **Uneed/SaaSHub/AlternativeTo** → `DISTRIBUTION_SUBMISSION_KIT.md` のコピペで登録（アカウント作成必要）← **未完了（60分）**
4. **PH** → 今日のコメントに返信（初期2時間が最重要。テンプレは `PRODUCTHUNT_LAUNCH_COPY_v1.md` 参照）← **今日必須**
5. **Instagram** → bioリンク表示確認 ← **未確認**

#### 今年の目標（1年目残り約5ヶ月）

| フェーズ | 期間 | 目標 | 手段 |
|---|---|---|---|
| **Phase A（今）** | Day 360〜390 | 有料1件（¥3,000〜$49） | PH反応・Cold DM・note CTA |
| **Phase B** | Day 390〜420 | 月収¥3万（10件） | IH連載・飲食店Cold DM継続 |
| **Phase C** | Day 420〜450 | 月収¥10万（30件） | AppSumo掲載待ち・口コミ |
| **Phase D** | Day 450〜365 | 月収¥100万 | 規模拡大・アフィリエイト導入 |

> **現実的なYear 1着地**: 月収¥10〜50万程度。「年収1千万」は2〜3年目のゴール。まず最初の1円を取ることが全て。

#### 収益化のための投稿戦略（Sage自律実行）
- **build_in_public** (kanagawatable): `Day N.` で始まるリアルな開発日記 → フォロワー獲得
- **soft_cta**: Gumroad $49 Blueprint へ誘導 → 収益
- **growl_cta**: Growl → `growl-app.vercel.app` → 収益導線
- **insight / marketing_lesson**: 価値提供 → 信頼構築
- ⚠️ 頻度: **最大1〜2投稿/日**（手動一括投稿禁止。自律スケジューラーのみ）

#### 2年目へのトリガー条件
- 月収が安定して100万円を超えた時点で2年目フェーズ（Uncle Sam拡張・CBD）に移行

### AIへの指示
毎セッションで必ず確認：「今日の投稿がVision Freeman 1年目の目標に向いているか？」  
コンテンツが「AI一般論」に戻っていたら即修正。常に「Day X、日本のソロデベロッパー、リアルな話」に引き戻す。  
**最優先KPI**: 有料1件を取ること。それだけ。

---

## 11a. AI全面委任戦略（2026-06-02 追加）

> 重要: ここから着手する。最終目的は「業務を全部AIに任せる」こと。ただし新しく作り直すのではなく、**既存のSage / Growl / LearnAIにすでに作ったAI資産をベースに統合・商品化する**。新規巨大開発ではなく、既存AIを「運用OS」として束ねる。

### 基準データ

基準は **Microsoft AI Economy Institute “Global AI Adoption in 2025” の H2 2025 AI diffusion** に置く。  
これは「生成AIを使っている労働年齢人口の割合」を国別に補正したデータ。

| 順位 | 国 | AI使用率 | 見るべきポイント |
|---:|---|---:|---|
| 1 | UAE | 64.0% | 国家主導で行政・教育・産業にAIを組み込む |
| 2 | シンガポール | 60.9% | 政府・企業・教育を一体でAI実装 |
| 3 | ノルウェー | 46.4% | 公共機関AI化、言語モデル、データ基盤重視 |
| 4 | アイルランド | 44.6% | 大企業・外資・業務効率化中心 |
| 5 | フランス | 44.0% | 中小企業までAI導入を広げる国家施策 |

出典: Microsoft Global AI Adoption in 2025  
https://www.microsoft.com/en-us/research/wp-content/uploads/2026/01/Microsoft-AI-Diffusion-Report-2025-H2.pdf

### 上位国からの結論

上位国に共通しているのは、AIを「便利ツール」として使っていないこと。全部AIに任せる国ほど、次の順番で進めている。

1. まず全員が使う
2. 次に業務ごとのテンプレートを作る
3. 次にデータ・承認・監査を整える
4. 最後にAIエージェントへ実行権限を渡す

Sage / Growl も、いきなり完全自動化しない。  
**人間の判断をAIに学習させる → 定型業務を任せる → 例外だけ人間が見る → 最終的にAIが運用する** の順番で進める。

### 国別の学びをSage / Growlへ落とす

- **UAE**: AIを国家OSとして扱う。Sage / Growlも、広告・SNS・商品・LP・レポートをバラバラにせず、1つの運用OSに統合する。
- **シンガポール**: AI導入には「使い方の教育」と「業務ごとの型」が必要。Growlは飲食店用、講座販売用、美容サロン用などの業種別AI運用テンプレートを持つ。
- **ノルウェー**: AIに任せるには専用データ基盤が必要。なおさんの過去投稿、商品、売上、反応、顧客メモ、失敗例をSageの記憶DBへ蓄積する。
- **アイルランド**: 中小企業には「AIそのもの」ではなく「成果が出る業務パッケージ」として売る。Growlは「週3つの集客施策」「SNS投稿」「レビュー返信」「売上改善レポート」を前面に出す。
- **フランス**: AI導入を「診断 → 提案 → 実行 → 改善」にする。Growl MVPは、最初にAI診断、次に今週の行動、最後に成果レポートへつなげる。

### 最終形

**Sage**: なおさんの代わりに「調べる、考える、作る、投稿する、売る、分析する、改善する」を回すAI運用OS。  
**Growl**: その中から中小事業者向けに切り出した売上接続型マーケ運用AI。

### 優先順位

1. **記憶DB**: 商品、投稿、反応、売上、顧客、失敗例を保存する。
2. **業務プレイブック**: SNS投稿、広告案、LP、週次レポート、DM文、レビュー返信を型化する。
3. **承認フロー**: AIが作る、人が確認する、AIが実行する。
4. **成果学習**: CTR、CV、申込、売上、返信率をAIに戻す。
5. **エージェント化**: 低リスク業務から自動実行する。
6. **完全自動化**: 例外・高額判断・ブランド判断だけ人間に通知する。

### Phase詳細ロードマップ（調査反映版）

調査根拠:
- McKinsey State of AI 2025: 88%の組織が少なくとも1業務でAIを使う一方、全社的にスケールできているのは約3分の1。AIエージェントは23%がスケール中、39%が実験中。マーケティング・営業はAI利用が多い領域。
- Deloitte Agentic AI Governance 2026: エージェント利用は急拡大しているが、成熟したガバナンスを持つ組織は21%。境界設定、リアルタイム監視、監査ログが不足するとブランド・売上・セキュリティリスクになる。
- Google Ads API: 広告運用は「予算」「入札戦略」「ターゲット」の3要素で構成され、Performance Maxではアセットグループに素材を渡し、Google AIが配信面と組み合わせを最適化する。
- Meta Advantage+: 予算、オーディエンス、配置の自動化が進んでいるため、Sage/Growl側は媒体AIを置き換えるのではなく、訴求、素材、成果学習、承認、横断レポートを担う。
- HubSpot / Salesforce: CRM文脈では、AIエージェントは過去接点、顧客情報、外部情報を参照して営業・マーケ・サポートを横断する方向へ進んでいる。

#### AI使用率上位5カ国からのPhase再設計

出典:
- Microsoft Global AI Adoption in 2025: UAE 64.0%、Singapore 60.9%、Norway 46.4%、Ireland 44.6%、France 44.0%。
- UAE Government / AI Office: AI Council、AI Strategy 2031、政府サービス・教育・重点産業・データ基盤・顧客サービスへのAI導入。
- Singapore NAIS 2.0: 「AI for the Public Good」、Projects to Systems、Industry / Government / Research、People & Communities、Compute / Data / Trusted Environment。
- Norway National Digitalisation Strategy 2024-2030: 2025年に政府機関80%、2030年に100%がAIを採用。国家AIインフラ、ノルウェー語/サーミ語モデル、AI Act、監督構造、倫理的で安全なAI。
- Ireland CSO 2025: 企業AI利用20.2%、大企業57.7%。用途はデータマイニング、自然言語生成、ワークフロー自動化/意思決定支援。業務目的では管理業務とマーケ/営業が上位。
- France Osez l'IA: 2030年に大企業100%、PME/ETI 80%、TPE 50%のAI利用を目標。300人のAI大使、AI Academy、Data IA診断、事例/ソリューションカタログ、融資/補助で中小企業へ普及。

国別にSage/Growlへ入れるもの:

| 国 | 最新動向（2025-2026調査） | 反映するPhase | Sage/Growlへの落とし込み |
|---|---|---|---|
| UAE | AI使用率64%。Dubai AI Campus 2026年Q2開設。NEP-AIプログラム開始（2026-06）。2027年までに政府サービスの50%をAI化。幼稚園〜高校でAIカリキュラム義務化（2026-08〜） | Phase 3-5 | SNS、広告、LP、CRM、商品、レポートを1つの運用OSに束ねる。教育込みで導入する（使い方を教えてから任せる）。 |
| シンガポール | SMEのAI導入率が前年比3倍（4.2%→14.5%）。1万社SME支援プログラム（National AI Impact Programme）。2026年5月にNAIS 10優先事項を再定義。「Projects to Systems」が国家方針。 | Phase 1-4 | 業種別テンプレート（飲食、美容、講座）を先に作り、パターン化してから広げる。SME導入率は低い＝今が先行者優位のタイミング。 |
| ノルウェー | KI-Norge（AI Norway）設立。AIサンドボックスで企業が安全に実験できる環境を整備。AI Act草案2026年夏。AI研究センター6拠点が2025年始動。R&D税控除・研究者50時間無償支援あり。 | Phase 2-4 | 記憶DB、監査ログ、権限管理、ポリシー、ロールバックを必須化。「安全に試せる環境」→ Growlのサンドボックスモード（本番反映前に確認できるUI）に応用。 |
| アイルランド | 企業の92%がAI使用/検討中。完全統合は7%のみ。SMEは月1,000時間を削減。AI導入SMEは生産性26%向上、売上15〜23%増。「スキル不足」「ミスへの恐怖」が最大の壁（30%）。€23M中小デジタル化支援（2026）。 | Phase 1-2 | 「ミスへの恐怖」を解消する承認フロー（AIが作る→人が確認→実行）を前面に出す。Growlの訴求を「AIが全部やる」ではなく「週3アクション＋確認するだけ」に寄せる。 |
| フランス | €200M「Osez l'IA」計画（2025年7月）。生成AI使用31%（TPE/PME）。AI診断10日間、国費40%補助。AI Academy（無料）。SMEのAI ROI中央値159%、投資回収6.7ヶ月。 | Phase 1-3 | 最初にAI診断を提供し、「投資対効果が見える」ことを示してから月額課金へ誘導する。無料診断→有料プランの導線がフランス型の正解。 |

この再設計により、Phase 1は「売れる最小パッケージ」、Phase 2は「成果学習」、Phase 3は「売上接続」、Phase 4は「制限付き実行」、Phase 5は「AI運用OS」として定義する。

**McKinsey 2026追加調査**: エージェントAIはマーケ業務の3分の2を担う方向へ。キャンペーン実行速度10〜15倍、売上10〜30%成長（超パーソナライズ）、アウトリーチ量25倍（中小企業）。ただし全社スケールができているのは23%のみ。Sage/Growlはこの「スケールの壁」を破るためのOS。

#### Phase 1: 既存AIベースの集客アクションOS（今すぐ）

目的: 既存のGrowl / Sage資産を使い、有料1件を取るための実用パッケージにする。

- 対象: 飲食店・小規模店舗・講座販売・美容サロンなど、まずは1業種に絞る。
- 入力: 事業情報、商品、客層、地域、悩み、競合、過去投稿、過去施策。
- 出力: AI診断、週3つの集客アクション、SNS投稿文、レビュー返信、キャンペーン文、LP改善案、週次レポート。
- 既存資産: `/api/market-research`、3C/STP/SWOT/PEST/VRIO、AEO/GEO、週次アクション生成、SNS文生成、PDFレポート。
- 人間の役割: 方針確認、ブランド判断、投稿/配信前承認。
- AIの役割: 診断、提案、下書き、要約、改善案生成。
- 成功条件: 1ユーザーが「今週やることが明確になった」と感じ、実際に1つ以上行動する。
- ブラッシュアップ（2026-06調査反映）: フランス型「無料AI診断→ROIを見せる（中央値159%・回収6.7ヶ月）→月額課金」の導線を採用。アイルランドの「スキル不足・ミスへの恐怖（30%）」を解消する承認フロー（AIが作る→人が確認→実行）を前面に出す。シンガポール型の業種別テンプレートを飲食・美容・講座の3業種で先行作成し、「プロジェクト→システム化」の順に進める。最初の商品名は「広告運用AI」ではなく「週3アクション集客AI」に寄せる。

#### Phase 2: 成果学習・A/Bテスト・コンテンツ改善（次）

目的: AIに「何が効いたか」を覚えさせ、毎週の提案精度を上げる。

- 追加するデータ: 投稿日時、媒体、訴求軸、コピー、画像/動画、インプレッション、クリック、保存、返信、申込、売上。
- A/Bテスト管理: 訴求軸、冒頭フック、CTA、画像、動画台本、LPファーストビューを比較する。
- 改善提案AI: 「冒頭3秒を変える」「価格訴求から不安解消訴求へ変える」「LPのCTAを上へ移す」など、次の打ち手を出す。
- レポート: 週次PDF/ダッシュボードで、成果、原因仮説、次週アクションをまとめる。
- 既存資産: `sns_evidence.jsonl`、`pdf_generator.py`、SageSNSPerformanceTracker、SICA、NeuromorphicBrain。
- 人間の役割: 成果の事実確認、良い/悪いのフィードバック、次週方針の承認。
- AIの役割: 成果集計、仮説生成、勝ちパターン記録、次案生成。
- 成功条件: 「前週より良い提案」が出る状態。AIが過去の成功/失敗を参照して提案できる。
- ブラッシュアップ（2026-06調査反映）: ノルウェー型のデータ基盤を反映し、成果データだけでなく「判断理由」「人間フィードバック」「失敗理由」を記憶DBに保存する。ノルウェーのAIサンドボックス思想を応用し、Growlにも「本番反映前に確認できるプレビューモード」を実装する。シンガポール型のTrusted Environmentとして、AIの提案根拠と使用データを画面に表示する。McKinseyデータ（前週より精度が上がることを数値で示す）をPhase 2の成功基準に組み込む。

#### Phase 3: 広告・LP・CRM連携（自動実行の手前）

目的: SNS/オーガニックだけでなく、広告、LP、申込、商談、成約までを接続する。

- 広告連携: Google Ads / Meta Ads / TikTok Ads / YouTube のAPIまたはCSV入力から、CTR、CPA、CVR、ROASを取得する。
- Google Ads方針: 予算、入札戦略、ターゲット、PMaxアセットグループをSage/Growlが設計し、媒体AIに渡す素材と制約を管理する。
- Meta方針: Advantage+の予算/オーディエンス/配置自動化を前提に、Sage/Growlは訴求軸、クリエイティブ量産、成果学習、承認ログを担う。
- LP連携: LP初稿、ファーストビュー、CTA、FAQ、構造化データ、AEO/GEOを生成し、CVRを追跡する。
- CRM連携: 申込、商談、成約、LTV、失注理由を保存し、広告/SNS/LPのどれが売上につながったかを見る。
- 人間の役割: 予算上限、高単価商材の訴求、ブランド毀損リスク、法務/広告ポリシー確認。
- AIの役割: 配信案、予算配分案、LP改善案、CRMに基づく売上貢献分析。
- 成功条件: 「投稿や広告の数字」ではなく、申込・商談・成約まで見た改善提案が出る。
- ブラッシュアップ（2026-06調査反映）: UAE型のOS統合を反映し、SNS、広告、LP、商品、CRMを1つの成果ループにする。UAE Dubai AI Campus（2026-Q2）の思想＝インフラ・データ・人材・サービスを一体化した「AI都市OS」をSage/Growlの設計原則とする。媒体AIは置き換えず、Google/Metaの自動最適化へ渡す素材、制約、訴求、承認ログをSage/Growlが管理する。McKinsey「売上10〜30%成長（超パーソナライズ）」を目標KPIに設定する。

#### Phase 4: 制限付きエージェント運用（低リスクから自動化）

目的: 人間が毎回操作しなくても、AIが決められた範囲内で実行する。

- 自動実行してよいもの: レポート生成、投稿下書き、画像案、動画台本、レビュー返信案、LP改善案、DM草案、日次/週次の成果集計。
- 条件付きで自動実行するもの: 低予算広告の一時停止、予算内でのクリエイティブ差し替え、スケジュール投稿、A/Bテスト開始。
- 必ず承認が必要なもの: 予算増額、広告公開、高単価商品の訴求変更、炎上リスクのある投稿、個人情報を含むCRM操作、返金/契約/法務判断。
- 必須ガードレール: 実行権限の段階分け、上限金額、禁止ワード、ブランドトーン、監査ログ、ロールバック、異常検知。
- 成功条件: 人間が「確認だけ」で回る業務が増え、作業時間が週単位で減る。
- ブラッシュアップ（2026-06調査反映）: ノルウェー型の監督構造（KI-Norge、AI Act草案2026年夏）、シンガポール型のTrusted Environment（NAIS 2026、10優先事項）、UAE型の政府OS思想を反映し、Command Centerで「AIが何を見て、なぜ判断し、何を実行したか」を常時見えるようにする。アイルランドの「完全統合は7%・月1,000時間削減」の数値をPhase 4の成功条件KPIに使う（週250時間削減から始める）。McKinseyのアウトリーチ量25倍・キャンペーン実行10〜15倍を具体的な効果として提示する。

##### Phase 4 詳細運用設計

調査反映:
- NIST AI RMF: AI運用は Govern / Map / Measure / Manage で、役割責任、人間の監督、監視、異議申し立て、上書き、インシデント対応、変更管理を定義する必要がある。
- ISO/IEC 42001: AIマネジメントシステムとして、AIの範囲、リスク、管理策、監査可能性、継続改善を整備する。
- Salesforce Agentforce 3: エージェントをスケールするには、Command Center、Testing Center、可観測性、MCP連携、事前シミュレーションが重要。
- HubSpot Breeze: CRMデータ、顧客接点、過去履歴をもとにエージェントが営業・顧客対応を行う。ただし成果単位で評価し、業務文脈に閉じることが重要。

権限レベル:
1. **Level 0: 提案のみ**  
   AIは下書き・分析・改善案だけを作る。外部投稿、送信、広告操作、CRM更新はしない。
2. **Level 1: 内部保存まで**  
   AIはNotion/Obsidian/DBへ下書き保存、週次レポート生成、タスク作成まで行う。
3. **Level 2: 低リスク公開**  
   事前承認済みテンプレートに沿う投稿予約、定型レビュー返信案、週次メール下書きの作成まで行う。公開前レビューを標準にする。
4. **Level 3: 条件付き実行**  
   上限金額内のA/Bテスト開始、低予算広告の一時停止、成果が悪いクリエイティブの差し替え提案などを行う。しきい値・ロールバック条件が必須。
5. **Level 4: 完全自律は禁止から開始**  
   予算増額、広告公開、高単価商品の訴求変更、返金、契約、個人情報操作は、Phase 4では必ず人間承認。

承認マトリクス:
| 領域 | AI自動OK | 人間承認必須 |
|---|---|---|
| レポート | 生成・保存・要約 | 外部送付先の変更 |
| SNS | 下書き・予約案 | 初回投稿、炎上リスク投稿、ブランド判断 |
| レビュー返信 | 返信案・トーン調整 | クレーム、返金、法務含み |
| LP | 改善案・文言案 | 本番公開、価格変更 |
| 広告 | 分析・停止提案・低予算テスト案 | 広告公開、予算増額、ターゲット大幅変更 |
| CRM | 要約・タグ案・次アクション案 | 個人情報編集、契約、請求、返金 |

必須ログ:
- 実行日時
- 入力データ
- AIの判断理由
- 使用ツール/API
- 生成物
- 承認者
- 実行結果
- ロールバック方法
- 成果指標

異常検知:
- CPA/CVR/ROASの急悪化
- 投稿反応の急落
- 否定的返信/クレーム増加
- 禁止ワード検出
- 予算上限接近
- 個人情報を含む出力
- 同じ投稿/DMの重複

#### Phase 5: 完全AI運用OS（最終形）

目的: なおさんは例外判断とビジョンだけを見る。Sageが日々の運用を回す。

- Sageが担うこと: 市場調査、商品企画、SNS、広告案、LP、販売ページ、レポート、改善、PR、顧客分析。
- Growlが顧客向けに担うこと: 中小事業者の集客診断、毎週の行動、投稿、レビュー返信、広告素材、成果レポート、改善提案。
- 人間に通知する条件: 予算超過、CPA悪化、炎上リスク、重要顧客、成約機会、法務/ポリシーリスク、ブランド判断。
- 成功条件: 通常運用はAIが回し、人間は「承認」「例外」「方向修正」「新しいビジョン」に集中する。

##### Phase 5 詳細運用設計

最終形は「完全放置」ではない。人間は毎日作業しないが、Sageは常に可視化・監査・停止できる状態にする。

Sageの常時ループ:
1. **Research**: 市場、競合、SNS反応、広告指標、顧客の声を収集。
2. **Plan**: 今週の訴求、商品、投稿、広告、LP、販売導線を設計。
3. **Create**: コピー、画像案、動画台本、LP、レビュー返信、DM、レポートを生成。
4. **Execute**: 承認済み範囲で投稿、予約、レポート送付、低リスク改善を実行。
5. **Measure**: CTR、CPA、CVR、ROAS、申込、商談、成約、LTVを集計。
6. **Learn**: 成功/失敗を記憶DBへ保存し、次回の提案に反映。
7. **Escalate**: 例外、危険、チャンスだけ人間へ通知。

Sage Command Center:
- 今日の実行内容
- 今週の成果
- AIが判断した理由
- 承認待ち
- 異常アラート
- 予算消化
- 売上貢献
- ロールバックボタン
- 自律度スライダー（提案のみ / 下書き保存 / 条件付き実行 / 自律実行）

完全自動化してよい最終領域:
- 日次/週次レポート
- コンテンツ案生成
- 成果集計
- 低リスク投稿予約
- 過去勝ちパターンに基づく再生成
- LP改善案生成
- 顧客/商談要約
- 次アクション作成

最後まで人間が見る領域:
- 予算増額
- 新規広告公開
- 高単価商品の根本訴求
- 炎上・謝罪・クレーム
- 返金・契約・法務
- 個人情報の扱い
- ブランドの思想判断
- Vision Freemanに関わる方向転換

Phase 5のKPI:
- なおさんの週次作業時間
- AI自動実行件数
- 人間承認件数
- 例外通知の精度
- 売上貢献
- CPA/CVR/ROAS改善
- 顧客対応品質
- ロールバック発生率
- 禁止操作ゼロ
- ブラッシュアップ（2026-06調査反映）: 完全自動化は「完全放置」ではなく、上位5カ国型のAI運用基盤。UAEがAI Strategy 2031で目指す「国家OS化（AED 335兆円経済効果・GDP比9%→45%）」がPhase 5の最終イメージ。シンガポールの「Projects to Systems」移行モデルで、Growlの個別業種対応をシステム化・OS化する。McKinseyが示すマーケ業務の3分の2をエージェントAIが担う世界がPhase 5の日常。人間は日次作業から離れ、Vision、例外、倫理、ブランド、予算、重要顧客だけを見る。Sageは通常運用、Growlは顧客向け運用AIとして切り出す。

### SNS広告運用AI戦略（2026-06-02 確定）

#### なおさんの意図（核心）
「私がいなくても勝手に収益を上げるAI分身」= Sage/Growlが広告を自律運用して売上を作る。

#### フライホイール構造
```
Sageがなおさん自身の広告を運用して実証
    ↓
実績データをGrowlの事例・LearnAIの教材にする
    ↓
GrowlがSMB（飲食・サロン・講座）の広告を自動運用
    ↓
代理店・マーケターにBtoBで提供（ホワイトラベル）
    ↓
全部がSNSコンテンツになり拡散 → 認知→集客→購入のループ
```

#### 競合調査結果（2026年6月）
| ツール | 特徴 | 価格 | Growlとの差 |
|---|---|---|---|
| Ryze AI | Meta/Google完全自律運用 | $40/月 | 汎用・難しい |
| Madgicx | Instagram/Facebook自動最適化 | $99〜 | 飲食特化なし |
| Revealbot | ルール設定→AI自動実行 | $99〜 | 業種テンプレなし |
| **Growl** | 飲食・サロン・講座特化・週3アクション | $19/$49 | **業種特化が差別化** |

**Growlの差別化ポイント**: 汎用ツールは難しすぎるSMBに、「入れるだけで広告が回る」業種特化AIとして刺さる。

#### 実装ロードマップ（広告運用AI）

| Phase | 内容 | 人間の役割 | 収益化 |
|---|---|---|---|
| **今すぐ** | AIが広告文生成→人間が承認→手動出稿 | 承認ボタンだけ | $49/月で売れる |
| **Phase 2** | Meta Ads API連携→AI自動出稿 | 予算上限設定だけ | $99/月 |
| **Phase 3** | 数字見てAIが自動改善 | 異常通知だけ確認 | $199/月 |
| **Phase 4** | 完全自律・例外だけ人間 | Vision判断だけ | エージェンシーモデル |

#### 今週やること（Sage代行）
1. Meta Ads API連携モジュール実装（`backend/integrations/meta_ads_api.py`）
2. GrowlのAPI endpointに広告出稿機能追加
3. なおさんのGumroad商品用の広告文をGrowlで生成してテスト

### 既存AIベース原則

- 既存のSage / Growl / LearnAIを土台にする。
- 新規の巨大プロダクトを作らない。
- 「広告運用AI」から入るのではなく、まずは既存資産と相性がよい **中小事業者向けSNS/集客アクションOS** として形にする。
- Growl MVPは「毎週3つの集客アクション」「SNS文」「レビュー返信」「週次レポート」「改善提案」を中心にする。
- 広告API、入札調整、完全自動配信は Phase 2〜3。MVPでは提案・下書き・承認フローに留める。
- 大切なのは、上位国と同じく「全部AIに丸投げ」ではなく、**人間の判断・業務手順・成果データを先に構造化してAIへ渡すこと**。

---

---

## 12b. Cowork自律実行ログ（2026-06-04）

### Meta広告機能 完全リファクタリング

> ⚠️ 次のAIセッションへ: 以下はすべて完了済み。同じ作業を再度やらないこと。

#### 完了した作業

| # | 作業 | 結果 | 詳細 |
|---|---|---|---|
| 1 | Supabase `user_meta_tokens` テーブル作成 | ✅ | Management API経由でSQL実行。device_id, access_token, page_id, page_name, ad_account_id |
| 2 | Meta OAuthをマルチユーザー対応に変更 | ✅ | state=device_id で各ユーザー固有のトークン・ページ・広告アカウントを保存 |
| 3 | Facebookページ選択モーダル実装 | ✅ | 複数ページ保有ユーザーに `/dashboard?select_page=1&pages=...` でモーダル表示 |
| 4 | submit/route.ts をユーザー固有設定で動作 | ✅ | device_id → user_meta_tokens → ユーザー自身のページ・広告アカウントで出稿 |
| 5 | ターゲティングを Advantage+ 全世界対応 | ✅ | JP限定→JP/US/GB/AU/CA + advantage_audience: 1 |
| 6 | 世界トップレベルプロンプト v3 | ✅ | Nick Shackelford/Florind Metalla/Superside思考 + 6フレームワーク + ロケール別(US/UK/AU/CA/JP) |
| 7 | primary_text を 125文字制限→500文字フルストーリー | ✅ | primary_text_short（フック）+ primary_text_full（完全ナラティブ）の2段構成 |
| 8 | カルーセルカード3枚生成 | ✅ | 各カードが異なる角度でベネフィットを語る |
| 9 | 証拠データ収集（6フィールド追加） | ✅ | proof_numbers, customer_quote, price_or_offer, before_state, after_state, competitor_diff |
| 10 | オンボーディングに proof ステップ追加 | ✅ | problem→proof→goal の順。任意入力（スキップ可能）|
| 11 | AdBoostCard に「広告強化パネル」追加 | ✅ | 生成前に任意で実績・お客様の声・価格を入力可能。localStorage に永続保存 |
| 12 | ハルシネーション防止（3層構造） | ✅ | プロンプトに絶対ルール + APIで数字検出 + UIで常時警告バナー |
| 13 | .gitignore 修正・リポジトリクリーンアップ | ✅ | ルート直下の.py/.jpg/.docx等をgit管理から除外。261MB→正常サイズに |

#### 現在の動作確認済み状態（2026-06-04）

- **Growlダッシュボード** → `growl-app.vercel.app` で稼働中
- **Meta広告生成API** → `/api/meta-ads/generate` 正常動作
- **Meta広告出稿API** → `/api/meta-ads/submit` 正常動作（PAUSED状態で作成）
- **user_meta_tokens テーブル** → Supabase に存在・RLS有効
- **OAuthフロー** → `/api/meta-ads/oauth-callback` でdevice_idごとに保存
- **ハルシネーション対策** → 証拠データなし時は定性表現のみ使用、確認済み

#### 既知の残課題

| 課題 | 優先度 | 対応方針 |
|---|---|---|
| ad_copy.primary_text が submit時 full版を使うよう更新 | 中 | submit/route.tsのcreativePayloadでprimary_text_full優先に |
| カルーセル広告の実際のAPI出稿 | 中 | 現在は単一画像のみ。carousel formatのMeta API実装が必要 |
| Facebookページ接続後の再接続UIの改善 | 低 | 接続状態をdashboardで視覚的に表示 |

---

## 12a. Cowork自律実行ログ（2026-06-02）

### GitHub Actions SNS自動投稿 移行作業

| # | アクション | 結果 | 備考 |
|---|---|---|---|
| 1 | Phase 1〜5をAI使用率上位5カ国の最新データでブラッシュアップ | ✅ 完了 | UAE/SG/NO/IE/FR の2026年最新調査を両ファイルに反映 |
| 2 | GitHub Actions ワークフロー作成 | ✅ 完了 | `.github/workflows/sns-auto-post.yml` 毎日JST 8/12/20時に自動実行 |
| 3 | GitHub Secrets 5件登録 | ✅ 完了 | GROQ_API_KEY, BLUESKY_HANDLE, BLUESKY_APP_PASSWORD, INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID |
| 4 | Personal Access Token生成 | ✅ 完了 | `ghp_5INXCI89f7...`（90日・repo+workflow）GitHub API経由でSecrets登録に使用 |
| 5 | バックエンドファイルのGitHub push問題 | ❌ **未解決** | `sage-official-site`リポジトリにbackend/Pythonファイルがほぼpushされていない。`backend/scheduler/sns_daily_scheduler.py`などが存在しないためActions実行失敗 |

### 残課題（次セッションで対応）

**根本問題**: `sage-official-site` GitHubリポジトリにはフロントエンドのみ。Pythonバックエンドがない。

**解決策（2択）**:
1. Bluesky投稿専用のシンプルなスクリプト（依存関係なし）をゼロから書いてGitHub Actionsで動かす → **確実・推奨**
2. バックエンド全体をpushする → ファイル数が多く`.gitignore`の整理が必要

**推奨**: 選択肢1で先にBluesky自動投稿を動かし、その後Instagram対応を追加する。

---

## 12. Cowork自律実行ログ（2026-05-30）

### ⚠️ AIセッションへの注意（繰り返し防止）
このセクションを読むこと。同じ作業を再度やらないために。

| # | アクション | 結果 | 備考 |
|---|---|---|---|
| 1 | Quora回答「What are some digital marketing tips for restaurants?」 | ✅ 投稿済み | 未回答質問・初回回答 |
| 2 | Quora回答「How do I get more customers for a restaurant through social media?」 | ✅ 投稿済み | 重複あるが内容は有効 |
| 3 | Quora回答「What is the best way to promote a restaurant?」 | ✅ 投稿済み | 179答え・285フォロワーの人気質問に追加 |
| 4 | Gumroad `apvbzh` 販売文 | ✅ 確認済み | 「I'm a restaurant owner in Japan...」で始まる新コピー適用済み |
| 5 | Uneed.best Growl提出 | ❌ **vercel.appドメイン不可** | カスタムドメイン取得後に再挑戦 |
| 6 | SaaSHub登録 | ❌ **アカウント作成必要** | なおさんがnaofumi0930@gmail.comで登録→DISTRIBUTION_SUBMISSION_KIT.md参照 |
| 7 | Show HN | ❌ **HNアカウントのログイン必要** | REDDIT_HN_POSTS_20260529.mdにテキスト完成済み |
| 8 | Fazier Growl登録 | ⏳ **バッジ検証待ち** | 3コメント完了・layout.tsxにバッジ追加・git push完了（917cb43）。Vercelデプロイ後「Verify Badge」要 |
| 9 | CLAUDE.mdに究極ビジョン追加 | ✅ 完了 | 「人とAIで、地球環境の保全、育成、活用し、この地球すべての生き物の楽園を創造する」を最上部に強調表示 |
| 10 | Dev.to トラフィック確認 | ✅ 確認 | 3本 < 25views。昨日投稿のため正常。SEOは2〜4週で効き始める |

### Fazier残作業（次のAIセッションで確認）
1. growl-app.vercel.appにバッジが表示されているか確認（git push 917cb43で追加済み）
2. https://fazier.com/launch にアクセス → 「Verify Badge」をクリック → 登録完了

### 繰り返し禁止リスト（既に試したが不可）
- **Uneed.best** → vercel.appドメイン不可。カスタムドメイン必要
- **Reddit** → ブラウザセキュリティで遮断。なおさんが手動でREDDIT_HN_POSTS_20260529.mdからコピペ
- **SaaSHub/AlternativeTo** → アカウント作成が必要（私には不可）

*このファイルはSage AIが自律的に更新する（Tier 1アクション）*  
*新しい問題解決・発見があるたびに該当セクションを更新すること*

---

## Sage Execution Contract
### Operating principles
Sage は「賢い応答」より「再起動可能な実務OS」であることを優先する。毎回の作業は、起動の固定 → 実行の分離 → 停止と再開 の3段階で回す。

### Non-negotiables
- セッション開始時に `AGENTS.md` と `docs/adr/progress-log.md` を確認する。
- Plan / Build / Verify を混ぜない。
- 1セッションで扱う対象は1タスクに絞る。
- 変更後は必ず検証し、緑なら止まる。
- 重大な依存変更や挙動変更は、先に characterization tests を追加する。

### Performance strategy
- 同期HTTPで重いAI処理を抱え込まない。
- 長い処理は job_id 付き非同期ジョブに逃がす。
- 軽量タスクと重いタスクでモデル階層を分ける。
- フリーズや遅延は、モデルの賢さではなくハーネスで制御する。
