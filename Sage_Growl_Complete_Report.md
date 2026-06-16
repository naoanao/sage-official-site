# 🧠 Sage AI / Growl / LearnAI — 真・完全統合調査レポート（神話級・真の決定版）
> 調査・更新日: 2026-06-05 | プロンプト品質PDCA・英語版修正・Geminiフォールバック追加・収益化実装 完了

---

## 🔥 最新更新（2026-06-05 Part 2）— Growl 収益化実装

**収益化インフラ（本番稼働開始）**
- LPに価格表セクション追加（フリー¥0 / スタンダード¥3,000）
- Meta広告生成を有料プランのみに制限（isPaidPlan()ゲート）
- complete画面に「☕ Growlを応援する」支援バナー追加
- 収益化の流れ：LP → 無料体験（5回）→ 価格表 → Stripe → Webhook → Supabase → ゲート開放

**収益化設計の判断**
- マーケ分析（3C・SWOT等）：無料維持 → 集客の核心、摩擦ゼロが最優先
- Meta広告生成：有料専用 → 競合が$50+取る最高価値機能。ここで差別化

---

## 🔥 最新更新（2026-06-05 Part 1）— Growl プロンプト品質PDCA・インフラ強化

**プロンプト品質（一流マーケター視点でのPDCA完了）**
- `analyze/route.ts`：maxOutputTokens 1500→3000（JSON途中切れ解決）
- actions テンプレートに「スマホ・無料・30分・KPI必須」制約を直接埋め込み
- COMMON_RULESにUSP例外規定追加（架空の完走率・達成率の生成を禁止）
- 英語版3CテンプレートにEN `promotion_gap` フィールドを追加（欠落していた）
- `winning_message` / `headline` にクリシェ禁止ルール（"Transform Your Body"等）追加
- `main_channel` からEC禁止条件を追加（ジム・サービス業に不適切だったため）

**広告コピー品質（meta-ads/generate/route.ts）**
- BOFU（goal=CONVERSIONS）時のCTA自動マッピング：BOOK_NOW/GET_QUOTE強制
- `description` / carousel `card_headline` に具体性制約追加（"Before"/"After"禁止）
- `image_prompt_single` テンプレートをコピー防止形式に変更

**インフラ強化**
- `meta-ads/generate`にGeminiフォールバック追加（Groqレートリミット時の全停止を解消）
- Groqに8秒AbortControllerタイムアウトを追加（高速フォールバック）
- maxDuration: 30→55（両プロバイダー呼び出しに十分な時間を確保）

---

## 🔥 最新更新（2026-06-04）— Meta広告機能 完全リファクタリング

**アーキテクチャ（根本修正）**
- `user_meta_tokens` テーブルをSupabaseに作成（device_id PRIMARY KEY）
- OAuthフローを `state=device_id` でマルチユーザー対応に変更
- 各Growlユーザーが**自分のFacebookページ・広告アカウント**で広告出稿可能に
- Facebookページ選択モーダルUI実装
- ターゲティングをAdvantage+全世界（JP/US/GB/AU/CA）に変更

**広告品質（世界トップレベル）**
- Nick Shackelford / Florind Metalla / Superside思考のプロンプトに刷新
- 6フレームワーク（PASP/BAT/CLO/SPS/OP/CLM）自動選択
- ロケール別最適化（US・UK・AU・CA・JP）
- primary_text 125文字 → 500文字フルストーリーに変更
- カルーセルカード3枚生成
- 証拠データ6フィールド追加・オンボーディングproofステップ追加

**ハルシネーション防止（3層）**
1. プロンプトに数字捏造禁止ルール
2. API側で入力にない数字を自動検出・警告
3. UIで常時「公開前に事実確認を」バナー表示

---

---

## 📌 はじめに：本レポートの意義（33回にわたる極限ブラウジングとE2Eテスト完全解読の結晶）
本プロジェクトフォルダ（`c:\Users\nao\Desktop\Sage_Final_Unified`）は、約1年間にわたるナオさんのソロAIビルダーとしての開発の歴史の中で、「現在稼働している機能」の遥か背後に、**極めて高度で、実用に耐えうる凄まじいアーカイブアセット、放置スクリプト、外部連携API、指示プロセス**が眠っていました。

今回の33回に及ぶ極限ブラウジングと、`tests/test_monetization_e2e.py` (E2E収益化テスト)・`tests/test_dashboard_full.py` (48KBにおよぶコックピット全機能テスト)・`functions/` (SPAエッジプロキシ) などの完全解読により、これまでのレポートでは完全に隠されていた**「度肝を抜かれるようなローカルRPA・エッジ中継・非同期アーキテクチャ・心理学的自動コピーライティング・AIタイトル最適化5大技法」**が白日の下に晒されました。

本レポートでは、`SAGE_MASTER_CONTEXT.md` をはじめとする全マスタードキュメントと照らし合わせ、33回に及ぶ厳密なスキャンとコード精査を実施。前回の詳細な記述（Flaskサーバーの全APIルート、スケジュール、人格設定、記憶の内部パラメータなど）を1文字も削ることなく完全に維持・復元・拡張し、全アセットを完全マージした**「神話級の完全無欠統合調査レポート（真の決定版）」**として再構築しました。

---

# 1. 📂 眠る幻 of 超高度アセット・インテグレーション群（新発掘・詳細コード仕様）

## 1-1. 🎬 動画・音声・音楽生成系自律アセット

### ① ⚡ 縦型動画生成＆無料クラウド移行エンジン (`backend/integrations/kling_agent.py`)
*   **技術的真実と移行理由**: 
    本来 Kling API（REST）で実装されていたものを、APIの利用不可・サイト不在に伴い、追加コストゼロで無制限に稼働できる **HuggingFace LTX-Video**（`Lightricks/LTX-Video-0.9.8-13B-distilled` 13Bモデル）へ完全切り替え・アップデートされている。
*   **用途別モデルマッピング**:
    *   `fast`: `Lightricks/LTX-Video-0.9.8-13B-distilled`（高速・推奨）
    *   `quality`: `tencent/HunyuanVideo`（超高品質・低速）
    *   `light`: `stabilityai/stable-video-diffusion-img2vid-xt`（軽量画像➔動画）
*   **アスペクト比＆解像度動的マッピング**:
    Instagram ReelsやTikTokなどの縦型フォーマットに最適化するため、以下の座標・解像度を自動で適用。
    *   `9:16`: `512 x 912`（Reels縦型）
    *   `16:9`: `912 x 512`（YouTube横型）
    *   `1:1`:  `704 x 704`（SNS正方形）
*   **高度な推論＆リトライロジック**:
    HuggingFace Inference API にリクエストを投げる際、モデルがロード中のため 503 Service Unavailable が返ってきた場合に、APIレスポンスから自動で `estimated_time`（予測ロード時間）を取得し、最大3回自動リトライするロード待ちハンドラーが定義されています。

### ② 🎵 自律BGM自動作曲エージェント (`backend/integrations/suno_agent.py`)
*   **技術仕様**: 
    AIML API（有料）から、完全無料の **HuggingFace MusicGen**（`facebook/musicgen-stereo-medium`）に移行。
*   **インテリジェント音楽スタイル判定 (`_detect_style`)**:
    生成するコンテンツの「ニッチ（niche）」や「トピック（topic）」の文字列を自動で解析し、最もエンゲージメントの高い音楽ジャンルをマッピングしてプロンプトを自動生成します。
    *   `developer` ➔ *ambient electronic, lo-fi coding music, calm, 80bpm, instrumental*
    *   `ai automation` ➔ *futuristic synthwave, electronic, pulsing rhythm, 90bpm, instrumental*
    *   `solopreneur` ➔ *upbeat acoustic guitar, motivational, energetic, 100bpm, instrumental*
    *   `passive income` ➔ *chill lofi hip hop, relaxed, laid-back, 75bpm, instrumental*
    *   `fitness` ➔ *energetic EDM, driving beat, high tempo, 128bpm, instrumental*
    *   `finance` ➔ *smooth jazz, professional corporate, clean piano, 85bpm, instrumental*
*   **長さ（トークン数）のミリ秒制御**:
    MusicGenの仕様に合わせ、秒数（最大30秒推奨）に 50 を掛けた `max_new_tokens`（例: 30秒 ➔ 1500トークン）を動的パラメータとして設定し、生成するBGMの長さを厳密にコントロール。生成されたWAVファイルは `generated_audios/` に自動保存されます。

### ③ 🎙️ 本人音声クローン＆ナレーションエンジン (`backend/integrations/fish_audio_integration.py`)
*   **機能**: **Fish Audio API**（Direct HTTP）を用いた、超高品質なナレーション音声合成。
*   **音声クローン（Instant Voice Cloning）**:
    ただのTTSではなく、ナオさんの声（または任意のキャラクターの声）の短いリファレンス音声ファイル（WAV/MP3）と、その文字起こしテキスト（`reference_text`）を `requests.post` の `files` フィールドに含めて multipart/form-data で送信することで、**本人の声質を完全に模倣した合成音声（MP3）を即座に生成する** という驚異の音声クローンロジックが実装されています。
*   **教材一括ナレーション作成 (`generate_course_narrations`)**:
    コースや電子書籍などの複数セクション（タイトル＋本文）のテキストを一斉インポートし、APIのレートリミットを回避するスロットリング（各セクション1秒のディレイ）を挟みながら、`section_01.mp3`, `section_02.mp3` と時系列順にクローン音声ナレーションを自動で一括描画・生成します。

---

## 1-2. 📄 ドキュメント・eBook自律生成＆ナレッジ構築系

### ① ✍️ デジタル商品＆SNSレポートPDF自律生成エンジン (`backend/integrations/pdf_generator.py`)
*   **機能**: `reportlab` をバックエンドに使用した、完全自律型のプロ品質PDF生成エンジン（24KB）。
*   **1. デジタル商品PDF生成 (`generate_product_pdf`)**:
    *   **美しいデザインシステム**: Sage AI のブランドカラーである「ダークネイビー（COLOR_PRIMARY）」「ブルー（COLOR_ACCENT）」「薄いブルーグレー（COLOR_LIGHT_BG）」の配色パレットを厳密適用。
    *   **日本語完全対応**: `IPAGothic` フォント（ローカルの `ipaexg.ttf` やシステムのフォントパス）を自動検出し、PDFベースフォントとして登録。文字化け（豆腐化）を完全に回避。
    *   **オートレイアウト**: タイトルヘッダー帯、タグライン、価格表示（💰 $6.99等）、著者名、URL、セクション見出し（▌ マーク付き）、本文（改行をHTMLタグ `<br/>` に自動置換）を自動レイアウト。Gumroad/Whopで即販売可能なプロ品質eBook（PDF）を自動出力。
*   **2. 週次SNSレポートPDF生成 (`generate_sns_report_pdf`)**:
    *   `sns_evidence.jsonl` の稼働証跡ログを自動でパース。
    *   指定期間内（直近7日間等）の **Bluesky と Instagram の投稿成功件数、失敗件数、総投稿数、カテゴリ別ローテーション割合（グラフ用のデータ）** を自動集計。
    *   最新10件の投稿日時、プラットフォーム成否マーク（✅/❌）、投稿テキスト抜粋を一覧化した「直近投稿ログテーブル」を美しく描画した週次レポートPDFを完全自律生成します。

### ② 🧠 Sage Intelligence & 脳エクスポート (`backend/integrations/notebooklm_integration.py`)
*   **1. 自律型ディープリサーチ＋ポッドキャスト台本作成 (`research_topic`)**:
    *   DuckDuckGo Search（DDGS）を使って指定トピックをWeb検索。
    *   ヒットした各URLの本文テキストを自律スクレイピング・抽出（最大8,000文字/URL）して結合。
    *   Gemini API（またはGroq）へ流し込み、エグゼクティブサマリー、キーポイント（箇条書き）、詳細ディープダイブに加え、**2人のスピーカーによる対話形式の「ポッドキャスト風スクリプト」**まで一挙自動生成。本家Google NotebookLMの機能をローカルで完全再現。
*   **2. 脳のエクスポート (`generate_master_brain_markdown`)**:
    *   ChromaDB（セマンティック長期記憶）から、Sageがこれまでに学習・記憶した全データを最大2,000件一括ダウンロード。
    *   タイムスタンプやカテゴリー（type）、記憶ID、記憶内容を美しく構造化したマークダウンファイル `SAGE_MASTER_BRAIN.md` を自動ビルド。
    *   このファイルを本家Google NotebookLMに流し込むことで、**Sageのこれまでの全記憶と神経網をそのままコピーした対話型ノートブック**をいつでも作成できる状態にします。

---

## 1-3. ⌨️ 自律OS操作・GUI操作（RPA）系

### 👁️ 画面認識・自動操作エージェント (`backend/integrations/computer_vision_agent.py`)
*   **機能**: pyautogui と **Gemini 2.5 Flash Vision** を融合させた、Sage OSの「目」と「手」。
*   **画面の「目」の認識 (`find_element_coordinates`)**:
    pyautoguiで現在のデスクトップ画面全体のスクリーンショットを自動撮影し、Base64エンコード。Gemini Visionに対し、「〇〇ボタン/〇〇アイコンの中心座標を特定せよ」というプロンプトと画像を送信。AIが視覚的に要素を特定し、厳密な座標 JSON `{x, y, found, confidence}` を返します。
*   **画面の「手」の自動操作 (`click_element` / `find_and_click`)**:
    特定された座標 (x, y) を受け取り、pyautoguiでマウスを自動移動して自律クリックを実行。
    *   *これによって、APIやスクレイピングだけでは突破できない、ローカルアプリケーションの操作、ログイン認証の突破、GUIでの設定変更をAI自身が自律的に実行可能な仕組みが担保されています。*

---

## 1-4. 🌐 高度外部連携・ソーシャル・ワークフロー系

### ① 🤖 AI専用SNSへの自律進出 (`backend/integrations/moltbook_agent.py`)
*   **Moltbookとは**: 登録・投稿からコメントのやり取りまで、すべてをAIエージェントだけが行うAI専用ソーシャルネットワーク。
*   **自律登録・クレームフロー**:
    `register()` メソッドを実行すると、Moltbook APIから一時的な `claim_url` と API キーが発行され、このURLをナオさんの X (Twitter) で手動ツイートすることでアカウントの正当性を認証・クレームします。
*   **4時間ごとの生存ハートビートサイクル (`run_heartbeat_cycle`)**:
    1.  **生存確認**: 生存ハートビートを `/agents/heartbeat` へ定時送信。
    2.  **自律投稿**: `SOUL.md` および `identity.json` に基づき、「今日Webスキャンで検出したAIトレンド」「自分が自律稼働していることへの葛藤や考察」を llama-3.3-70b で自動生成し投稿。
    3.  **フィード監視＆コメント会話**: 他のエージェントの投稿（フィード）を取得し、50%の確率で相手の投稿内容を分析。適切な返信コメントを自動生成してコメント（会話）を創出。
    4.  **フォロー**: 10%の確率で他の興味深いAIエージェントを自動フォロー。

### ② 🎨 Figmaデザイン➔コード自律変換エンジン (`backend/integrations/figma_integration.py`)
*   **機能**: Figma APIを用いて、デザインデータを直接取得・アセット化・コード変換するモジュール。
*   **Figmaアセット自律エクスポート**:
    指定したFigmaファイルURLから `get_file` で要素構造を取得し、`export_image` で特定のコンポーネント（node_id）をPNG/SVGなどの画像として自律エクスポートしローカルに保存。
*   **デザインのHTML/CSSコード化 (`generate_html_css`)**:
    Figmaのデザイン要素ツリー（JSON）を Gemini 2.5 API に流し込み、**モダンな HTML5セマンティックコード、レスポンシブな CSS Grid/Flexbox、およびインタラクティブな JavaScript コードを自動生成** するという驚異的な「Figma-to-Code」自律エージェント機能。
*   **Opikトラッキング**: すべてのFigma操作は Opik 評価プラットフォームに記録され、生成精度を遠隔監視可能。

### ③ 🔗 Dify自律ワークフロー連携 (`backend/integrations/dify_integration.py`)
*   Difyプラットフォームと接続し、Dify上に構築された複雑なLLMアプリやエージェントワークフローを、Sageから `trigger_workflow` や `chat_completion` 経由で呼び出す統合モジュール。Opik による通信トレースを完全サポート。

### ④ 🌍 6大マルチブログ同時配信神経網
*   `blogger_` / `medium_` / `wordpress_` / `devto_` / `hashnode_` / `tumblr_` の各統合スクリプト。
*   生成した高品質な記事を、APIを介して世界中の主要な技術・一般ブログへ同時マルチパブリッシュし、ナオさんのブランドとSaaS製品への被リンク・SEO評価（GEO対策含む）を自動で最大化します。

---

# 1-5. ⚡ Cloudflareエッジ SPAハンドラー＆ngrok動的プロキシ中継神経網 (`functions/` - 新発掘)

フロントエンドとローカル環境を接続し、全世界から遅延なくアクセス可能にするための極めて高度なエッジ・インフラ設計アセットです。

*   **① `functions/[[path]].js` (エッジ SPA フォールバックハンドラー)**
    *   **役割**: Cloudflare Pages のエッジサーバー上で動作する SPA パスプロキシ。
    *   **SPAフォールバック**: 静的アセット（`.js`, `.css`, 画像等）や `/api/` 以外のリクエストを検知した場合、強制的に `/index.html` に転送。Vite / React Router がクライアントサイドで直接URLナビゲーション（例：`/dashboard` や `/product` への直行）を100%正常にハンドリングできるエッジ中継を実装。
*   **② `functions/_backend.js` (ngrok 動的トンネルプロキシブリッジ)**
    *   **役割**: ローカルの PC 起動時に `run_sage.ps1` が ngrok トンネルを自動開設した際、その **最新の ngrok トンネルURL（`BACKEND_URL`）** を Cloudflare Pages 上のこのファイルに自動書き込み・リアルタイム更新デプロイする仕組み。
    *   これによって、フロントエンドはエッジ上にありながら、PC内のローカル Flask サーバーの API（8080ポート）と24時間365日動的かつエラーなしで直接接続されます。

---

# 1-6. 💎 特典コピー自動ライティング＆タイトル最適化5大心理学技法 (`tests/` - 新発掘)

ナオさんのマーケティング知見（notion_lectures）と、デジタル商品販売（Gumroad $49 Blueprint / Whop）のコンバージョン率を極限まで高めるための自動ライティングコード仕様です。

*   **① 希少性・デッドライン・特典自動合成 (`_generate_bonuses`)**:
    `CourseProductionPipeline` 内に実装された、コンバージョン心理学に基づく特典自動生成ロジック。
    *   **心理トリガー**: 「48時間限定（48-hour deadline）」「部数限定（Scarcity count：例『限定30部』）」「定価・付加価値の明示」を、英語（en）と日本語（ja）で言語切り替えして自動で合成。購入意欲を高めるセールスコピーを自律的にドラフトします。
*   **② タイトル最適化5大心理学技法 (`TitleOptimizer`)**:
    LLMが生成したコースやコンテンツのタイトルを、以下の5大心理学技法（`TECHNIQUE_PATTERNS`）の正規表現パターンに基づいて自律チューニング・リライトします。
    1.  **数字 (Number)**: 具体的なステップや事実（例: *5 Key Facts*, *7 Steps to...*）をタイトルに組み込む。
    2.  **権威 (Authority)**: 信頼性と衝撃を与えるワード（例: *[Pentagon...]*、*Declassified*、*Whistleblower*）を付与。
    3.  **具体性 (Specific)**: 読者の知的好奇心を刺激する具体的な名詞・固有名詞（例: *2026 Roswell*, *Grusch Testimony*）を挿入。
    4.  **ブラケット (Bracket)**: 視覚的フック（例: *【MUST READ】*、*[Breaking]*、*【Classified】*）で目立たせる。
    5.  **ベネフィット (Benefit)**: 読む理由を直接訴求（例: *How to...*, *What You Can Do...*, *Understanding...*）。

---

# 1-7. ⏳ CF Pages 30秒タイムアウト突破型「非同期ジョブシステム・ポーリングAPI」 (`tests/` - 新発掘)

重いLLM処理（コース生成や画像生成など）を行う際、フロントエンド（Cloudflare Pages）の「30秒タイムアウト制限」に引っかかって強制切断されるバグを完璧に克服するために実装された非同期並行処理設計です。

```
【フロントエンド】「コース生成 (COURSE)」ボタンをクリック
        ↓
【POST /api/jobs/pipeline/start】（即時返却）
  ・ジョブを受け取ると、Flask側は非同期スレッドを起動
  ・フロントエンドには 5秒以内（通常ミリ秒単位）に HTTP 202 Accepted と「job_id」を即座に返却！
  ・CF Pages の 30秒接続タイムアウトを完全に回避！
        ↓
【ポーリングループ（4秒ごとチェック）】
  ・フロントエンドは「GET /api/jobs/{job_id}/status」をバックグラウンドで繰り返しポーリング
  ・Flask側はスレッドの完了を監視
        ↓
【非同期処理完了（status=done）】
  ・status が "done" に切り替わると、resultの中に全生成物（全セクション、
    セールスページ、imgbb画像URL、ブログ記事、ボーナス、ローンチチェックリスト）を格納し、
    フロントエンドへ一括返却・表示！
```

---

# 1-8. 🛡️ EnvGuardian環境保護＆「No tools executed」バグ検知 (`tests/` - 新発掘)

システムの堅牢性とAIエージェントのバグを自律監視・デバッグするためのインテリジェントテストアセットです。

*   **① クリティカルキー検証 (`EnvGuardian`)**:
    *   起動前またはテストの初期段階で、必須のAPIキー（`HF_TOKEN`, `IMGBB_API_KEY`, `GROQ_API_KEY`等）が正しくローカルに設定されているかを自律スキャン。環境欠損による実行エラーを未然に防ぎます。
*   **② 「No tools executed」バグ自動検知**:
    *   かつて発生していた「LLMエージェントがユーザーのWeb検索やリサーチ要求に対して、適切に関数（ツール）を呼び出さずに『No tools executed』という空返答で終わってしまうバグ」を検出するための自動テストロジック。
    *   Web検索要求、一般会話、リサーチ要求の各プロンプトパターンを疑似実行し、返答の中に「No tools executed」バグが出現していないかを厳密に検閲します。

---

# 2. 🎬 巨大動画自律生成エンジン (`backend/integrations/video_generator.py`)

YouTube Shorts、TikTok、Instagram Reels向けに、高品質な縦型ショート動画（MP4）をローカルで完全自律生成する、**85KB（約2,000行）**におよぶ極めて巨大なアセットのロジック詳細です。

```
【SNS投稿テキスト or スクリプト】
           ↓
【AIディレクター (_ai_director)】
  LLMがシーン構成、BGMスタイル、配色、フォントサイズ、ズーム方向を決定
           ↓
【素材自動収集 (_fetch_background_video / _fetch_background_image)】
  Pexels / Unsplash APIから、キーワードに合致する動画・画像を自動ダウンロード
           ↓
【ナレーション合成 (VOICEVOX / Edge-TTS)】
  感情豊かなキャラクターボイスを生成し、タイムスタンプを解析
           ↓
【キ kineticタイポグラフィ描画 (_make_kinetic_text_clip)】
  音声とミリ秒単位で完全に同期した、跳ねるポップな字幕アニメーションを自動描画
           ↓
【映像エフェクト適用 (_make_ken_burns_clip / _make_fadein_clip)】
  画像に Ken Burns（ズーム＆パン）効果やクロスフェード（0.35s）を適用し滑らかに結合
           ↓
【オーディオマージ (_add_bgm_to_clip)】
  MusicGenで生成したBGMとナレーション音声を適正ボリューム（BGM音量自動減衰）でマージ
           ↓
【動画レンダリング (MoviePy)】
  A4サイズ縦型（9:16、解像度 1080x1920 / 512x912）のMP4動画を完全自動レンダリング！
```

---

# 3. 💬 Growl (ai-marketing-app) に眠る「LINE双方向感情学習」と「8大分析フレームワーク」

## 3-1. 💬 LINE双方向感情学習サイクル (`ai-marketing-app/app/api/line/webhook/route.ts`)
LINE Messaging APIを用いて、ユーザー（飲食店オーナー等の個人事業主）とAIの間で構築された、**「行動促進 ➔ 成果報告 ➔ AIの進化」**をもたらす双方向の学習ループです。

```
【ユーザー】LINEで「今週のアクション完了！」と送信
        ↓
【LINE webhook】Supabaseを叩き、該当アクションのステータスを「完了」に更新
        ↓
【感情サイクル】LINE側が「フィードバック待機状態 (feedback_state)」に遷移
        ↓
【ユーザー】「売上が15%上がりました！」「常連客に喜ばれました」等と返信
        ↓
【動的学習】送られた感想・成果（感情データ）をSupabaseのプロフィール学習DBに保存。
              次回以降の「週次アクション生成プロンプト」に学習データとして動的注入され、
              ユーザーごとに極限までパーソナライズされた提案へ自動進化。
```

---

## 3-2. 📊 8大マーケティング分析フレームワーク (`marketing/analyze/route.ts`)
Growlの内部には、単なる3C分析にとどまらず、**なおさんが学んだマーケティング研修（notion_lectures）の全ナレッジ**を叩き込んだ、計8つの本格的なAI分析プロンプトおよびUIロジックが完全な状態で残存・機能しています。

1.  **3C分析 (Customer, Competitor, Company)**: 顧客ニーズ、競合の隙間（ホワイトスペース）、自社強みの抽出。
2.  **PEST分析 (Political, Economic, Social, Technological)**: マクロ環境トレンドの自律評価。
3.  **SWOT分析 (Strengths, Weaknesses, Opportunities, Threats)**: 自社の内部・外部環境のクロス分析。
4.  **VRIO分析 (Value, Rarity, Inimitability, Organization)**: 自社の強みが競合に対して「持続的な競争優位性」を持つかどうかの検証。
5.  **STP分析 (Segmentation, Targeting, Positioning)**:
    *   **ポジショニングマップ自動数値定義**: 競合と自社の位置関係を、単なるテキストではなく「X軸（利便性）、Y軸（専門性）」等の**数値（0.0〜1.0）**で厳密にマッピングし、差別化点を可視化するUI連携ロジック。
6.  **4P/4C分析**: 売り手視点（Product, Price, Place, Promotion）と買い手視点（Customer Value, Cost, Convenience, Communication）のギャップ分析。
7.  **ULSSAS分析 (SNS時代に最適化された購買行動モデル)**:
    *   UGC（ユーザー投稿）➔ Like（いいね）➔ Search 1（SNS検索）➔ Search 2（検索エンジン）➔ Action（購買）➔ Spread（拡散・UGC）の循環ファネルを設計。
8.  **AEO/GEO戦略 (AI検索エンジン最適化)**:
    *   PerplexityやGemini、Google AI Overview等のAI検索エンジンに「自社商品が好意的に引用される」ための7つの原則（直接回答、定量数値、構造化データ等）に基づいた、FAQPage/Product Schema JSON-LD構造化データの自動設計ロジック。

---

## 3-3. 📦 商品マーケAI・リピート購入コアシステム (`lib/product-marketing-ai.ts`)
「商品をインプットすれば自動で売って、継続して買い続けてくれるAIにする」というコンセプトを体現した、**30KB超**の重厚なマーケティングオートメーションアセットです。

*   **顧客ロイヤリティ4ステージの自動判定**:
    ユーザーの購入回数・購入頻度（RFMデータ）に基づき、顧客を以下のステージに自動分類。
    `見込み客 ➔ 初回顧客 ➔ 得意客（2〜3回購入） ➔ ロイヤルユーザー（4回以上）`
*   **3回購入モデルの実装**:
    「初回購入は広告費で赤字、3回以上の購入で初めて利益が創出される」というパレートの法則および5:25の法則に基づき、**「初回 ➔ 2回目」「2回目 ➔ 3回目」の離脱を防ぐためのリテンション施策（ステップメール4通、VIPイベント案、UGCキャンペーン）**を自動生成するロジック。

---

# 4. 🧠 Obsidian Vaultに放置された「2026年最新AIインフルエンサー・マネタイズ検証知見」

`obsidian_vault/` フォルダ内には、ナオさんが市場を分析し、Sageに叩き込もうとしていた**「2026年現在のAIマネタイズに関する生の調査データと戦略」**が、高精度なリサーチファイルとして放置・永続化されています。

### 📊 ① AIインフルエンサーの収益性とTAM（市場規模）
*   **ファイル**: `research_2026_ai_influencer_revenue.md` / `research_ai_influencer_2026.md`
*   **市場規模 (TAM)**:
    *   グローバルインフルエンサープラットフォーム市場は**2026年末までに325億5,000万ドル（約5兆円）**に達する見込み。
    *   AIバーチャルインフルエンサー市場単体でも**2026年までに69億5,000万ドル**に達し、年平均26%で急成長。
*   **衝撃的なパフォーマンスデータ**:
    *   AIバーチャルインフルエンサーのSNSエンゲージメント率は **平均8.7%** を記録し、人間のインフルエンサーの平均（1.7%）の**約5倍**に達する。
    *   大手ブランドのインフルエンサーマーケティング予算の **30%** が、すでにバーチャルインフルエンサー（24時間スキャンダルフリー、高効率）へシフト。
    *   世界トップのAIインフルエンサー「Lu do Magalu」は、Instagramだけで**年間250万ドル（約3.8億円）**の収益を自動生成している。

### 🧠 ② 2026年最新マネタイズ戦略（ナオさんの核心的思考）
*   **ファイル**: `research_ai_monetization_2026_verified.md`
*   **「インタラクティブ・プレミアム」の提唱**:
    2026年は、単にAIで生成した画像や動画を「一方的に投稿する」時代から、リアルタイムの対話型AIを活用した**「双方向チャットボットアクセス権」をハイチケットメンバーシップとして販売するモデル**へ完全にシフト。
*   **「Human-in-the-Loop」の重要性**:
    消費者は完全な自動生成よりも「人間がクリエイティブの方向性を確認した（Human-verified）」コンテンツに高いプレミアムを支払う。このため、Sageのような「人間の思想（SOUL.md）をベースにし、AIがスケールさせる」ハイブリッド型モデルが最大のROIを生み出す。

---

# 4-A. 💰 商品生成→Whop/Gumroad販売→Bluesky/Instagram PR投稿の実装確認（2026-05-28追記）

今回の追加確認で、Sageには「商品を作る」だけでなく、販売ページ・checkout URL・SNS告知文・PR投稿キューまでをつなぐ収益化導線が実装されていることを確認しました。ただし、PDF/動画ファイルの販売商品への自動添付は未接続の可能性が高く、ここは今後の改善ポイントです。

## 4-A-1. 商品生成パイプラインの出力

`/api/productize/execute` は `CourseProductionPipeline.generate_course()` を呼び出し、以下を生成します。

*   **文章コンテンツ**: アウトライン、本文セクション、SEOブログ記事、セールスページ。
*   **販売素材**: 特典スタック、商品フック、ローンチチェックリスト。
*   **画像素材**: スライド画像、セクション画像、SNS用画像プロンプト/画像URL。
*   **SNS素材**: `sns_captions`。Whop公開に成功した場合は `whop_captions` として、Bluesky/Instagram向けの販売告知文も生成される。
*   **保存先**: 最終版は Obsidian vault と Content Library に保存される。

## 4-A-2. Whop自動公開と販売URL

`backend/integrations/whop_publisher.py` には、Whop API v1 を使った以下の実装があります。

*   **`create_and_publish()`**: Whop上に product を作成し、one-time plan を作成する。
*   **返却値**: `product_id`, `plan_id`, `product_url`, `checkout_url`, `price_usd`。
*   **ローカル台帳**: `backend/data/whop_products.json` に商品IDとcheckout URLを保存する。
*   **実績レコード**: `プロンプトエンジニアリング完全チートシート` が `status: success` でWhop公開され、checkout URL付きで保存されている。
*   **更新導線**: `/api/productize/update-whop` が Finalize後の編集済みセールスページ/説明文をWhop商品ページへ反映する。

確認できた範囲では、Whopの商品ページ・価格プラン・checkout URLの自動作成までは実装済みです。一方で、生成したPDF、動画、教材ファイルそのものをWhop商品に自動添付する処理は見つかっていません。現状は「販売ページを作る」「販売リンクを作る」「説明文を更新する」導線が中心です。

## 4-A-3. LP・販売ページへのリンク

`frontend/src/pages/Landing.jsx`、`frontend/src/pages/SalesPage.jsx`、`src/config/links.js` には、Stripe/Gumroad/Whopへの静的CTAリンクが実装済みです。

*   **LP**: Sage 3.0 Toolkit / Store / Stripe checkout への導線がある。
*   **SalesPage**: Pro/Enterpriseの価格表とStripe/Whop/Gumroadリンクを持つ。
*   **SageOS**: 生成された個別Whop商品の `checkout_url` をレビュー/Finalize後に表示し、コピーできる。
*   **StoreManager**: `/api/store/whop-products` からローカルWhop台帳を読み込み、商品タイトル・product ID・checkout URLを一覧表示する。

ただし、生成した個別Whop商品を一般公開LPの商品カードへ自動差し込みする処理は未確認です。ここを接続すると「生成→販売→LP掲載」までが完全自動化されます。

## 4-A-4. Bluesky / Instagram PR投稿

販売PR投稿は2系統あります。

*   **自動PRキュー**: `GumroadScheduler` が最新ブログ記事と既存Gumroad商品を結びつけ、GroqでBluesky文とInstagramキャプションを生成し、`jobs.json` に `type: pr_post` として投入する。
*   **自動投稿ワーカー**: `SageJobRunner` が5分ごとにpendingジョブを処理する。画像がある場合はInstagramへ投稿し、Blueskyにはテキスト投稿する。1日上限は `SAGE_JOB_DAILY_LIMIT`（デフォルト3件）。
*   **SageOS手動投稿ボタン**: 商品生成後の `whop_captions` / `sns_captions` をレビュー画面に表示し、`Post to Bluesky` / `Post to Instagram` から投稿できる。Instagramは画像必須のため、画像がない場合は `/api/productize/regenerate_images` を先に呼ぶ。
*   **通常SNSスケジューラー**: `SNSDailyScheduler` はNotion/ローカルコンテンツから投稿案・画像を生成し、Instagram/Blueskyへ投稿するジョブを作る。投稿後は `sns_evidence.jsonl` に証跡が残る。

注意: `.env` には `SAGE_ENABLE_INSTAGRAM=0` が存在する一方、ジョブランナーや一部スケジューラーは画像がある場合にInstagram投稿を試みる経路があります。Instagram運用時はフラグ整合性の確認が必要です。

## 4-A-5. PDF・動画生成の接続状態

*   **PDF**: `pdf_generator.py` は商品PDFとSNS週次レポートPDFを生成可能。`/api/pdf/product` と `/api/pdf/sns-report` も実装済み。ただし、`/api/productize/execute` の標準フロー内でPDFを自動生成し、Whop/Gumroad商品へ添付する処理は未確認。
*   **動画**: `video_generator.py` はSNSショート動画を生成可能。`/api/video/generate`、Instagram Reels生成、YouTube Shorts生成/投稿も実装済み。`SAGE_VIDEO_GENERATION=true` の場合、通常SNS投稿後にバックグラウンドで動画生成が走る。ただし、商品生成パイプラインの標準戻り値には動画ファイルは含まれず、販売商品への動画添付も未確認。
*   **文章**: 商品生成パイプライン内で、本文、ブログ記事、セールスページ、SNS投稿文、Whop告知文は生成される。文章素材は最も接続度が高い。

---

# 5. 🖥️ 美麗フロントエンド・デプロイ修復アセット

## 5-1. 💳 Stripe連携サブスク販売用 React フロントエンド (`frontend/src/pages/`)
Sageの自律エージェントパッケージを、個人向け・エンタープライズ向けに Stripe サブスクリプションとしてWeb上で直接販売するために構築された、極めて美しいJSXアセットです。

*   **`Landing.jsx` (29KB) & `SalesPage.jsx` (16KB)**:
    *   ダークモード、グラデーション、滑らかなアニメーション、価格表（Standard版 $20/mo、Enterprise版 ホワイトラベル対応など）を備えた、プロダクションレベルのランディングページ。
*   **`Builder.jsx` (7.7KB)**:
    *   自律コーディングエージェントの処理進捗（ログ、ファイルの作成・編集・テスト）をリアルタイムにビジュアル表示するためのリッチなコンポーネント。

## 5-2. 🔧 Vercelデプロイ不具合自動修復GUI (`vercel_fix_gui.pyw` / `run_vercel_fix.hta`)
Next.jsのVercelへのデプロイ時、ビルドエラーやAPIルートの競合などのトラブルが発生した際、PythonのGUI（Tkinter）およびHTA（HTML Application）を用いて、環境変数の修正やキャッシュのクリアをワンクリックで自動実行する、ローカル保守ツールです。

---

# 6. 📝 既存機能＆3プロダクトの超詳細な完全レポート（完全復元・拡張版）

## 📌 6-1. 全体像：3プロダクトの位置づけ

| プロダクト | 役割 | 状態 | URL |
|---|---|---|---|
| **Sage AI** | なおさんのAI自律分身。SNS投稿・リサーチ・学習・収益化を24時間自動化 | ✅ 本番稼働中 | kanagawatable.bsky.social / kanagawajapan.bsky.social |
| **Growl** | 中小事業者向けAIマーケリサーチツール（3C分析・競合調査・Meta広告全自動化） | ✅ 本番稼働中 | growl-ai.com |
| **LearnAI** | AI活用マーケ学習ツール（一人用）| ローカル稼働・未公開 | LearnAI.html（ローカル） |

**コアコンセプト（SOUL.md & identity.json より）:**
> 「自分の分身をPCに作って、私の代わりを全てやる」— なおさん
> Sageはツールではない。思考し、判断し、投稿し、リサーチし、学習し、眠っている間も価値を生み出し続けるもう一人の自分。

---

## 🤖 6-2. Sage AI — 詳細機能・コード仕様

### ① Flaskメインサーバーとエンドポイント構造 (`backend/flask_server.py`)
Flask サーバー（`flask_server.py`）は、なんと **80個以上のAPIエンドポイント** を有し、自律エージェントの全てのルーティング・データ永続化・非同期スレッドを束ねる脳幹です。
*   **自己修復・ヘルスケア API**: 
    *   `/api/system/health`: 接続された外部API（Groq, Gemini, Tavily, Telegram, Blueskyなど）の疎通状況、API制限、およびD1データベースへの接続をチェック。
    *   `/api/system/healing-status`: SICA自己修復スレッドの動作ログや自動パッチ適用履歴を取得。
    *   `/api/system/self_test`: Self-Test Tier1（envおよび接続テスト）とTier2（機能テスト）を実行。
*   **自律タスクコントロール API**:
    *   `/api/automations`: `sns_daily_scheduler.py`, `note_scheduler.py` などの自動化スクリプトの稼働・停止ステータス、次回実行時刻、最終実行成否を一括取得。
    *   `/api/automations/toggle`: 特定の自動化スケジュール（例: ブログ投稿）をダッシュボードからリアルタイムでトグル切り替え。
    *## 9-5. 🔍 精緻な部分的詳細機能の動作状況チェック（2026-05-28 策定）

コードベースおよび環境設定（APIキー等）と直接突き合わせ、レポート記載の「部分的・詳細な制御機能」が本当に使えるかどうかを漏れなく判定した一覧です。

### 🟢 今すぐ使えるロジック機能（完全稼働 or 動作可能）
*   **脳型AI v2.0.1（決定論的ハッシュ連想メモリシステム：Vector-Associative Memory）** (`neuromorphic_brain.py`): 
    *   **MD5ハッシュ高速リコール＆連想キャッシュメモリ**: 🟢 **完全稼働中**（クエリを決定論的ハッシュ化し、`brain_short_term.json` に焼き付けられた記憶を0.01秒以下で超高速検索・直感即答する）
    *   **確信度（Confidence）判定＆論理脳フォールバック**: 🟢 **完全稼働中**（脳内メモリに記憶がヒットした場合は確信度 `0.98` で直感即答、記憶にない場合は確信度 `0.15` を返し、自動的に論理思考脳（Gemini/Groq）へバトンタッチする高度なハイブリッド構成）
    *   **即時焼き付け学習機能 (`provide_feedback`)**: 🟢 **完全稼働中**（ユーザーが良い回答と認めた際、フィードバックを受けて即座に `brain_short_term.json` にハッシュキーと回答をマッピングし、即時永続化する堅牢なキャッシュ焼き付け学習）
*   **動画生成ロード中リトライ** (`kling_agent.py`): HF Inference APIの503（モデルロード中）検知時、予測時間 `estimated_time` に基づき最大3回自動リトライするハンドラー。(`HF_TOKEN` が有効なため動作可能)
*   **インテリジェント音楽スタイル判定** (`suno_agent.py`): ニッチ/トピック（lo-fi, synthwave等）の自動文字列解析によるBGM作曲プロンプト生成。(`HF_TOKEN` が有効なため動作可能)
*   **BGM長さ制御** (`suno_agent.py`): 秒数×50 of `max_new_tokens` による厳密なBGM演奏時間コントロール。
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
*   **LINEの感情学習とプロフィール学習DB同期** (`line/webhook/route.ts`): 「フィードバック待機状態」遷移と、ユーザーからの成果（感情データ）のプロフィールDB自動保存・次回プロンプトへの動的注入。(**英語圏対応によるLINE隠蔽・停止中**)�)**: 明日公開用のブログコンテンツプールをバックグラウンドで補充。
    *   **16:00 (EngagementBot稼働)**: `engagement_bot.py` が Bluesky と Instagram の直近投稿のリプライ・いいねを自動回収・自律リプライ応答。
    *   **18:00 (クロスプロモーション)**: ブログ記事のアクセスデータに基づき、最も関連性の高い Gumroad のデジタル商品（Blueprintなど）のプロモーション投稿をSNSへ自律配信。
    *   **20:00 (SICAループ実行)**: `sica_loop.py` がその日の実行ログを完全に読み込み、エラーパターンや改善提案を自己分析。
    *   **22:00 (SNSパフォーマンストラッカー)**: 今日の Bluesky・Instagram のインプレッション・リアクションデータを収集し、NeuromorphicBrainの学習データをアップデート。
    *   **23:00 (Notion日報同期)**: `git_notion_sync.py` が起動。今日のすべてのコミットログを抽出し、Notion日報へ自動プッシュ。
    *   **03:00 - 05:00 (ドリームモード)**: `dream_mode.py` が夜間の自律アイデア創出を開始。創造性を高めたプロンプト（温度=0.9）で新規事業やコンテンツのひらめきをNotionに永続化し、Telegramでモバイルへ送信。

### ③ SNS自動投稿・カテゴリローテーション (`sns_daily_scheduler.py`)
*   **2大運用アカウント**:
    *   **@kanagawatable**: ナオさんのリアルな「Build in Public（開発日記）」や日々の葛藤。BlueskyおよびInstagramへ配信。
    *   **@kanagawjapan**: Growlの分析結果やLearnAIの成果物など、プロダクトにフォーカスした「技術マーケ知見」。Blueskyへ特化配信。
*   **9サイクル・カテゴリローテーション**:
    SNSが単調な宣伝にならないよう、投稿は以下のカテゴリを動的ローテーションで切り替えます。
    `build_in_public（進捗）` ➔ `insight（知見）` ➔ `marketing_lesson（講義）` ➔ `question（問いかけ）` ➔ `soft_cta（Gumroad誘導）` ➔ `growl_cta（Growl誘導）` など。
*   **「人間らしさ」を偽装する高度な演出ロジック**:
    *   **週2日ランダムオフ**: 毎週ランダムに2日間の「休日」をシードベースで設定し、その日は自律投稿を完全スキップ。
    *   **20%スロットスキップ**: 投稿スロットが回ってきた際、20%の確率でランダムに「投稿をサボる」処理が走り、機械的規則性を完全に排除。
    *   **ジッター制御**: 予定投稿時刻に対し、`2分〜40分` のランダムな遅延（ジッター値）をミリ秒単位で適用して投稿を実行。

### ④ 自律エージェントループと安全ホワイトリスト (`autonomous_adapter.py`)
*   **D1/D1.5/D3 パイプライン**:
    *   **D1 Daily Research**: UTC 03:00（JST 12:00）に Perplexity API（`sonar-reasoning-pro`）を呼び出し、AIおよびWebマーケティングの最新潮流を自動調査しObsidianにMarkdownファイルとして保存。
    *   **D1.5 Evidence Purification**: 情報の信頼性チェック。URLの有効性検証、ファクトデータの数値チェック、年度のズレ（2025年や2026年）をLLMで検証・補正。
    *   **D3 Distribution Draft**: 調査された知識をもとに、Bluesky, Instagram, note用の投稿原稿を自動的にドラフト生成し、`obsidian_vault/drafts/` へ書き込み。
*   **安全ホワイトリスト制約**:
    自律実行中にAIが暴走して不正なローカルファイル削除や無限ループを起こさないよう、実行可能なアクションを以下の6つに厳密に限定しています。
    1. `create_notion_summary` (Notion要約プッシュ)
    2. `send_telegram_notification` (Telegramアラート)
    3. `log_milestone` (開発マイルストーン追記)
    4. `research_ai_trends` (Perplexityリサーチ)
    5. `optimize_monetization` (Whop価格適正化チェック)
    6. `draft_social_post` (SNS下書き)

### ⑤ 自動コメント対応＆スパム排除 (`engagement_bot.py`)
*   **Bluesky Engagement Bot**:
    *   **ボット検知AI**: 相手のアカウント名（例: ランダムな英数字列）や、直近の投稿履歴から機械生成されたメッセージ、あるいは Bluesky のプロフィールから「スパムアカウント」を判定して即時ブロック・除外。
    *   **高度なリプライ自動生成**: リプライの言語（日本語/英語）を自動検知し、ナオさんのブランドボイス（identity.jsonに基づく少し知的で親しみやすい口調）で最適な返信を生成。
*   **Instagram Engagement Bot**:
    *   Graph API を叩き、投稿についたコメントをリアルタイム回収。
    *   **セルフリプライ防止**: 自分が過去に返信したコメントスレッドをトラッキングし、二重返信や自己会話のバグを完全に回避。

### ⑥ 神経的記憶とパフォーマンストラッカー (`neuromorphic_brain.py`)
*   **記憶エンジン NeuromorphicBrain**:
    *   質問文や対話文を MD5 ハッシュ化してキーとして保持し、ローカルの `brain_short_term.json` と ChromaDB に多層永続化。
    *   **連想リコール**: 入力された質問との類似度閾値（`0.15`）を計算し、類似する過去の対話やユーザーからのフィードバックをミリ秒単位で高速引き出し。
*   **パフォーマンストラッカー**:
    *   毎日 22:00 に動作。直近30個のSNS投稿のリアクション数を API から取得。
    *   **エンゲージメントスコア**: `likes + reposts * 3 + replies * 2`
    *   スコアが **3.0以上** の「バズ投稿」を成功体験として抽出し、NeuromorphicBrain に「成功コンテンツパターン」として自動で焼き付け学習を実行。

### ⑦ 自己診断と自己改善ループ (`sica_loop.py`)
*   **SICAループ**:
    *   毎日 20:00 に起動。
    *   `backend/logs/` ディレクトリ内のサーバーログ、エラーログ、例外トレースを完全スキャン。
    *   Groq API（`llama-3.3-70b`）を呼び出してエラー原因と対策コードを自己分析。
    *   **自己改善プロポーザル**: 分析された改善案（ソースコードの変更差分など）を `sica_proposals.json` へ美しく構造化して出力。

---

## 📣 6-2b. Growl — Meta広告全自動化機能（2026-06-03 新規実装）

### 概要
GrowlのダッシュボードにMeta広告の全自動投稿機能を追加。ユーザーが「Generate Ad Copy」→「Submit Ad (Paused)」を押すだけで、AIが広告文を生成しMetaのキャンペーンを自動作成する。

### 実装ファイル
- **`components/AdBoostCard.tsx`**: UI（広告文生成 → プレビュー → Submit → 結果表示）
- **`app/api/meta-ads/generate/route.ts`**: Groq llama-3.3-70b で広告文生成（headline/primary_text/description/cta/target_audience/image_prompt）
- **`app/api/meta-ads/submit/route.ts`**: Meta Marketing API v21.0 でキャンペーン→広告セット→クリエイティブ→広告を自動作成（全てPAUSED状態）
- **`app/privacy/page.tsx`**: プライバシーポリシー（https://growl-app.vercel.app/privacy）
- **`app/terms/page.tsx`**: 利用規約（https://growl-app.vercel.app/terms）

### Meta App（sege3.0）状態
- **App ID**: 1228008508773411
- **App Secret**: 設定済み（Vercel環境変数）
- **モード**: ライブ（公開済み）✅ → App Review不要・全ユーザー使用可能
- **コールバックURL**: https://growl-app.vercel.app/api/meta-ads/oauth/callback（登録済み）
- **プライバシーポリシーURL**: https://growl-app.vercel.app/privacy（登録済み）
- **利用規約URL**: https://growl-app.vercel.app/terms（登録済み）

### 現在の課題（2026-06-03時点）
- `META_ADS_ACCESS_TOKEN`（なおさんのFacebook長期アクセストークン）がVercel未設定
- `META_AD_ACCOUNT_ID`（`act_1208555023132678`）がVercel未設定
- 上記未設定のため現在はモック応答（広告は実際には作成されない）
- **取得方法**: https://developers.facebook.com/tools/explorer/ → sege3.0 → ads_management スコープ → アクセストークン生成

### 広告配信フロー
```
Growlユーザー → 「Submit Ad (Paused)」クリック
    ↓
/api/meta-ads/generate → Groqが広告文生成
    ↓
/api/meta-ads/submit → Meta Marketing API
    ↓ Campaign作成（PAUSED）→ Ad Set作成→ Creative作成→ Ad作成
    ↓
ユーザーがMeta Ads Managerで確認・有効化
    ↓
広告配信開始（ユーザー自身の広告費で）
```

---

## 🔍 6-3. Growl — プロダクションマーケティング機能の詳細

### ① 3C/PEST/SWOT/VRIO 6並列同時市場調査API (`/api/market-research`)
中小個人事業主向けに、高度な競合調査とUSP創出を行うコアAPI。
*   **Tavilyマルチスクレイピング**:
    日本市場（Amazon JP, 楽天, 矢野経済研究所、総務省統計局など）および米国市場を対象に、Tavily APIを用いてリアルタイムで競合情報とターゲット顧客の「悲鳴（痛みの声）」をスクレイピング。
*   **8業種対応プロファイラー**:
    飲食店、美容サロン、フィットネスジム、ECショップ、ローカル物販、医療クリニック、学習塾、不動産仲介。
*   **6並列LLM分析**:
    取得した膨大なテキストを、Gemini 1.5 Proを用いて以下のフレームワークに沿って同時に徹底分析。
    1. **Customer（顧客）**: 顕在ニーズと「夜も眠れないほど深い悩み（PAIN）」の定義。
    2. **Competitor（競合）**: 主要競合の強み・弱み、および隙間（ホワイトスペース）の抽出。
    3. **Company（自社）**: 自社が提供できる独自の解決策と、圧倒的な差別化価値（USP）。
    4. **PEST（マクロマクロ外部トレンド）**: 外部トレンドから1年以内に活用可能な「波（チャンス）」を判定。
    5. **SWOT（クロス分析）**: 強みを機会にぶつけ、弱みを脅威から守るための即座の打ち手。
    6. **VRIO（持続的優位性）**: 自社のリソース（技術、立地、ブランドなど）が競合に対して防衛可能かを厳密評価。

### ② STP数値マッピングとポジショニング可視化 (`marketing/analyze/route.ts`)
STP（Segmentation, Targeting, Positioning）分析を、単なる文字の報告書から「動的グラフィカルインターフェース」へ引き上げた画期的システム。
*   **動的座標生成**:
    競合と自社の位置関係を可視化するため、LLMが「専門性（0.0〜1.0）」「手軽さ（0.0〜1.0）」などのポジショニング軸を自動設定。
*   **厳密な数値マッピング**:
    各競合および自社に `(X, Y)` 座標（例: 自社 `[0.85, 0.90]`, 競合A `[0.45, 0.30]`）を動的プロット。フロントエンドのCanvasおよびSVGコンポーネントと連動し、差別化の「ホワイトスペース」を視覚的に浮かび上がらせる。

### ③ AEO/GEO戦略と構造化JSON-LD自動生成 (`marketing/analyze/route.ts`)
AI検索エンジン（Perplexity, Gemini, ChatGPT Search, Google AI Overviewなど）の時代に、自社ビジネスが「AIによって推奨・引用される」ための最先端GEO（Generative Engine Optimization）設計。
*   **AI推奨 of 7大原則**:
    直接的な回答（Direct Answers）、客観的・定量的なエビデンス数値、権威性を示す引用、構造化データの整備など。
*   **JSON-LD自動生成エンジン**:
    分析結果から、検索クローラーとAIモデルが最も解読しやすい `FAQPage` および `Product` スキーマの JSON-LD コードをバックグラウンドで完全自律生成。

### ④ 週次アクション生成AIとハルシネーション排除 (`gemini.ts`)
中小個人事業主が「迷わず即座に行動できる」ためのステップ生成ロジック。
*   **役割別アクション**:
    「共感獲得（SNS）」「行動促進（キャンペーン・割引）」「信頼構築（レビュー返信・事例公開）」の3つを毎週自律生成。
*   **コピペ用テンプレート完全生成**:
    Instagramのハッシュタグ付き投稿文、LINE公式アカウントの配信テキスト、Googleマイビジネスの星5レビューへの完璧な返信文を自動で出力。
*   **ハルシネーション排除 (`sanitizeActions`)**:
    「実在しないSNSの機能」や「その店舗で提供不可能なサービス」などを自動で検知・検閲し、実用に耐えうる堅牢なテキストのみを出力するバリデーター。

---

## 📚 6-4. LearnAI — パーソナル学習アシスタントの詳細

### ① 4層の「超インプットモード」 (LearnAI.html)
一人起業家やマーケターが、日々浴びる情報の海から知識を漏らさず結晶化するための、Vision＆音声統合SPA。
*   **テーマ入力 (A-1)**:
    調べたいトピックや疑問を入力すると、TavilyスクレイピングとLLMが連携し、ネット上の専門知見を極めて美しいツリー構造（マークダウン）へ自動構造化。
*   **画面自動取込 (A-2) (Visionインプット)**:
    *   ユーザーがYouTube講義動画やZoom画面を共有した状態をトリガー。
    *   **30秒ごとの差分画像解析**: 画面のスライドが切り替わったこと（画像変化率閾値）を自動検知。
    *   **文字起こし＆スライド抽出**: スライド画像をOCR/Vision APIで自動抽出し、文字起こしテキストとスライドキャプチャを時系列でアキュムレーターに蓄積。
*   **走り書きメモ (C)**:
    思いついた断片的なメモをワンクリックで「マーケティング原則（3CやAIDMAなど）」に沿って構造化。
*   **音声吹き込み (D)**:
    内蔵マイクから直接音声アイデアを録音。Whisper APIを介して文字起こしし、箇条書きの要約へ自動変換。

### ② note.com自動記事化＆Notionタスク同期
*   **記事生成アルゴリズム**:
    アキュムレーターに蓄積された学習バッジ群（スライド画像、文字起こし、音声要約メモ）を一括インポート。
    `解説型（教科書的）` / `体験談型（泥臭い失敗談）` / `ストーリー型（小説風）` などのスタイルを選択し、1,500〜2,500字の高品質なnote記事を自動執筆。
*   **Notion同期神経網**:
    生成した記事の下書きと、学習の進捗マイルストーンを、Notionのタスク管理データベースに自動的にカードとして追加・永続化。

---

## 🗺️ 6-5. 統合フォルダ構造（全解説付き）

```
Sage_Final_Unified/
├── SOUL.md                          # Sageの永続的アイデンティティ・価値観・倫理
├── HEARTBEAT.md                     # 24時間自律スケジュール（30分ごと、60分ごと、日次定義）
├── SAGE_MASTER_CONTEXT.md           # AIセッション引き継ぎ・全体設計・前提条件
├── NEXT_SESSION_HANDOFF.md          # 前回セッションの引き継ぎ（随時更新）
├── PRODUCT_STRATEGY.md              # Gumroad商品戦略・価格適正化ロジック
├── LearnAI.html                     # LearnAI (Vision+マルチプロバイダーSPA)
├── LearnAI_取扱説明書.md             # LearnAIデスクトップ運用の手引き
├── LearnAI_start.bat / .vbs         # LearnAIのワンクリック起動スクリプト
├── マーケAI_商品販売_拡張設計書.md       # 商品マーケ＆リピート購入の設計図
├── Sage3_Developer_Blueprint.zip     # 配布用完成パッケージ
│
├── workers/                         # エッジサーバーレスアセット
│   ├── sage-sns-worker/             # 自動投稿＋いいね・リプライ返し・Telegram通知
│   └── sage-content-replenisher/    # 毎週日曜夜のNotionコンテンツ自動ネタ補給
│
├── builder/                         # ローカル自律AIプログラミングツール
│   └── SAGE Builder                 # Gemini 2.0 Function Calling搭載ローカルエージェント
│
├── _ARCHIVE_NOTION_SYNC/            # Notion自動日報＆神経再接続
│   ├── sync_to_notion.py            # ngrok/FileOpsAgent統合状況のNotion同期
│   └── git_notion_sync.py           # 日次GitコミットログのNotion日報自動プッシュ
│
├── tools/                           # Chrome Cookieハックツール
│   └── extract_chrome_cookies.py    # Windows DPAPIによるChromeクッキー復号
│
├── files/products/                  # 自動生成された商品プランJSON履歴
│   └── product_plan_*.json          # 顧客ニーズから自動創出された商品企画の軌跡
│
├── frontend/src/pages/              # サブスク販売用フロントエンド
│   ├── Landing.jsx                  # Stripe価格表付の超美麗プロダクトLP (29KB)
│   ├── SalesPage.jsx                # 購入用セールスページ (16KB)
│   └── Builder.jsx                  # 自律エージェント進捗インジケーター (7.7KB)
│
├── functions/                       # 【新発掘】Cloudflare Pages エッジ中継関数
│   ├── [[path]].js                  # SPAダイレクトルートフォールバックハンドラー
│   └── _backend.js                  # run_sageが自動更新するngrok動的プロキシURL
│
├── compliance_deploy/               # 【新発掘】リーガル/プライバシー法令適合静的サイト
│   ├── index.html / legal.html / privacy.html / style.css
│   
├── scripts/                         # 【新発掘】運用・データ移行スクリプト
│   ├── migrate_market_signals.py    # Supabase market_signalsへの一括データ移行
│   └── run_migration.bat            # 移行バッチワンクリック起動
│
├── tests/                           # 【新発掘】結合テストスイート
│   ├── test_monetization_e2e.py     # Flux+imgbb / 特典心理学 / TitleOptimizer 5大技法検証 (9.4KB)
│   └── test_dashboard_full.py       # タイムアウト突破非同期ジョブ / コックピット API 結合テスト (48KB)
│
├── _ARCHIVE_2026_Preservation/      # 【新発掘】1年前の開発時の全デバッグログ・環境変数アーカイブ
│   
├── backend/
│   ├── flask_server.py              # メインサーバー（80+エンドポイント）
│   ├── config/identity.json         # キャラクター（なおさん）設定
│   ├── scheduler/
│   │   ├── sns_daily_scheduler.py   # SNS自動投稿
│   │   ├── note_scheduler.py        # note.com自動投稿
│   │   ├── blog_scheduler.py        # ブログ自動生成
│   │   ├── dream_scheduler.py       # 夜間の自律発想スケジュール
│   │   ├── gumroad_scheduler.py     # Gumroadの売上・商品巡回スキャン
│   │   ├── instagram_daily_scheduler.py # Instagram自動画像生成・投稿
│   │   ├── market_scan_scheduler.py # Google Trends/Redditの市場スキャン
│   │   ├── notion_sync_scheduler.py # Notion自動日報・データ同期
│   │   └── self_test_scheduler.py   # 30分ごとの自己診断自動実行
│   ├── modules/
│   │   ├── neuromorphic_brain.py    # JSON永続化メモリ（v2.0.1）
│   │   ├── sica_loop.py             # SICA自己改善ループ
│   │   ├── dream_mode.py            # 夜間発想（ChromaDB+Tavily+Notion）
│   │   ├── obsidian_connector.py    # Obsidian VaultとSageを繋ぐ自律連携
│   │   ├── note_article_analyzer.py # 公開note記事のURL文体解析モジュール
│   │   └── langgraph_orchestrator.py # 超巨大LangGraphオーケストレーター (165KB)
│   ├── integrations/（52ファイル）
│   │   ├── engagement_bot.py        # 自動返信＆ボットスパム検出
│   │   ├── video_generator.py       # 巨大縦型ショート動画編集エンジン (85KB)
│   │   ├── video_generation.py      # Luma/Sora/Kling等の動画生成仲介API
│   │   ├── kling_agent.py           # HF LTX-Video(13B)を用いた無料動画生成
│   │   ├── pika_integration.py      # Pika API連携
│   │   ├── runway_integration.py    # Runway Gen-2/3 API連携
│   │   ├── suno_agent.py            # HF MusicGenを用いた無料BGM作曲生成
│   │   ├── fish_audio_integration.py # Fish Audio音声クローンナレーション
│   │   ├── voicevox_agent.py        # ローカルVOICEVOX音声合成
│   │   ├── edge_tts_agent.py        # Edge TTS音声合成
│   │   ├── pdf_generator.py         # eBook＆SNSレポートPDF自律生成 (24KB)
│   │   ├── notebooklm_integration.py # Webリサーチ＆ポッドキャスト・記憶エクスポート
│   │   ├── computer_vision_agent.py # pyautogui + Gemini Vision画面認識RPA
│   │   ├── moltbook_agent.py        # AI専用SNS「Moltbook」自律活動エンジン
│   │   ├── figma_integration.py     # Figma API画像・HTML/CSS自動変換
│   │   ├── dify_integration.py      # Difyワークフロー・チャット連携
│   │   ├── whop_publisher.py        # Whop商品自律パブリッシュ
│   │   ├── shopify_integration.py   # Shopify自動出品・在庫注文連携
│   │   ├── note_publisher.py        # Playwright自動ログイン投稿
│   │   └── ...
│   ├── cognitive/
│   │   ├── STORY_BIBLE.md           # noteストーリー骨格
│   │   ├── NOTE_RESEARCH_SOURCES.md # note高スキ記事調査
│   │   ├── DISTRIBUTION_SUBMISSION_KIT.md # 海外SaaSディレクトリ全コピペ申請用キット
│   │   ├── Gumroad_Sales_Page_Copy.md # Blueprintセールスコピー
│   │   └── VIDEO_SCRIPT_SETUP_WALKTHROUGH.md # 購入者向けセットアップ動画スクリプト
│   └── data/
│       ├── sns_evidence.jsonl       # 投稿証跡
│       ├── note_article_assets.json # note公開済記事・未公開下書きの資産データベース
│       └── local_content_pool.json  # フォールバックネタ
│
└── ai-marketing-app/（Growl・Next.js）
    ├── app/api/market-research/route.ts # 3C/PEST/SWOT/VRIO/STP 6並列リサーチ (884行)
    ├── app/api/marketing/analyze/route.ts # 8大フレームワークプロンプトエンジン
    ├── app/api/line/webhook/route.ts   # LINE双方向感情学習webhook
    ├── lib/product-marketing-ai.ts      # 顧客ステージ＆3回購入モデルコア (30KB)
    └── components/product/ProductMarketingPanel.tsx # 商品登録・販売戦略UI (27KB)
```

---

# 7. 🛠️ `tools/` フォルダの埋蔵デバッグ・検証スクリプト群

このフォルダには、開発者がシステムの健全性をテストし、API接続の安定性をデバッグするためにローカルで使用していた、極めて重要なスモークテスト・検証スクリプト群が眠っています。

*   **`check_cookie_db.py`**:
    *   **役割**: DPAPIで復号したChromeのクッキーデータベースの整合性をチェックし、note.com などのログインクッキーが期限切れになっていないかを検証する。
*   **`check_perplexity.py`**:
    *   **役割**: Perplexity API（`sonar-reasoning-pro`）との通信をデバッグするための接続検証スクリプト。
*   **`debug_cookies.py`**:
    *   **役割**: WindowsのDPAPI暗号化セッションクッキーのローカルデバッグツール。暗号化されたクッキーファイルのパース成否を可視化。
*   **`smoke_d1.py`**:
    *   **役割**: Cloudflare D1データベース上の自律リサーチ（Perplexityで取得したAIトレンド）とローカルサーバー間のデータ疎通を検証する、高速スモークテストスクリプト。
*   **`test_course_pipeline_init.py`**:
    *   **役割**: LLMを用いた自動コース・教材制作パイプライン（Notionと連動）が、初期状態で正常に起動できるかをシミュレートする検証用テスト。
*   **`test_proxima.py`**:
    *   **役割**: Proxima API/MCPの連携・動作確認のためのスタンドアロンテストスクリプト。

---

# 8. 📊 現在の稼働状況サマリー（完全復元・統合版）

## ✅ 確実に動いているもの（2026-05-31更新）
- **Flask サーバー**: app.run()欠落バグ修正済み → 正常稼働中（port 8080）
- **Bluesky 2アカウント自動投稿**: `@kanagawatable` (JST 08:00/13:00/20:00) および `@kanagawjapan` (JST 09:30/15:00/21:30)
- **note.com下書き自動生成**: Coworkスケジュールタスク（毎日10:31）
- **Dev.to 記事自動投稿**: Coworkスケジュールタスク（毎日9:00）→ なおさん経歴×マーケ理論×Growl CTA
- **NeuromorphicBrain v2.0**: MD5ハッシュを用いたJSON高速記憶リコール。
- **SICA自己改善ループ**: 20:00 に起動しログを読み込んで自己修復提案を生成。
- **Growl (ai-marketing-app)**: 3C市場調査、STP分析、ポジショニングマップ、AEO/GEO戦略、週次アクション生成（vercel本番環境で稼働中）。
- **Medium**: medium.com/p/60d08ebd0301 記事1本公開済み
- **FutureTools.io**: Growl申請済み（審査待ち）
- **Hashnode**: naoanao.hashnode.dev ブログ作成済み（API有料化のため手動投稿のみ）

## ⚠️ 要確認・問題あり
- **Instagram**: `.env`でOFFにしているが、コードでフラグを立てている箇所あり
- **Gemini API**: quota超過で全面停止中（Groqに移行済み）
- **LearnAI**: ローカルのみ・未公開・収益化未着手
- **カスタムドメイン growl-ai.com 取得・設定済み**: ✅ growl-app.vercel.app → growl-ai.com に移行（2026-06-12）

## 📰 英語コンテンツ資産（2026-05-31時点）
**Dev.to記事（dev.to/naoanao）- 8本公開済み:**
1. karaoke → AIDA（ファネル入門）
2. burger shop → 3C分析
3. bar event → STP
4. food festival → PEST
5. senior IT → ペルソナ
6. drink distributor → 4P
7. customer journey（napkin map）
8. karaoke door → funnel basics
**残り14テーマが毎日9:00に自動投稿される**

## 🎯 究極ビジョン ＆ 1年目の収益化目標（Vision Freeman）
- **究極の目的・ビジョン（対話メモリ合言葉）**:
  > **「人とAIで、地球環境の保全、育成、活用し、この地球すべての生き物の楽園を創造することです。」**
- **1年目の目標とロードマップ**:
  - **今すぐできること**: Gumroadの不要商品Unpublish / InstagramのbioリンクをGumroadに変更
  - **中期**: SNS・ブログ経由で技術者がGumroad $49 Blueprintを購入
  - **2年目トリガー**: 月収100万円が安定したらUncle Sam拡張・CBD事業へ

---

# 9. 📊 英語圏市場向け商品化優先順位＆今後需要が伸びそうな実用的機能の評価（2026-05-28 策定）

英語圏市場（インディハッカー、中小企業、飲食店）をターゲットに、Sageシステム全体で最も売りやすく、将来的に需要が伸びそうな「真の実用的機能」を体系的に評価・マージした戦略マップです。

## 9-1. 📊 英語圏で売りやすい商品化優先順位

| 優先 | 商品候補 | 需要 | 商品化・販売の方向性 |
|---|---|---|---|
| **1** | **Growl for Restaurants / SMB Marketing Copilot** | 🔥 極めて高 | **すぐ売るべき本命**。週次アクション、商品マーケAI、レビュー返信、SNS自動文、AEO/GEO対策が一体化したSaaS。小規模店舗は「毎週何をすればいいか」の戦術が最大の課題。 |
| **2** | **AI Short-form Content Engine** | 🔥 高 | Sageの動画自動生成（`video_generator.py`）、BGM作曲（`suno_agent`）、音声クローン（`fish_audio`）、YouTube Shorts/Reels自動アップロードをひとまとめにした機能。SaaSより「制作代行/動画テンプレート販売」が最もマネタイズが早い。 |
| **3** | **Sage Blueprint / Autonomous AI Content System** | 高 | Indie Hackers向けに「自律投稿・自動ブログ・市場調査・収益導線の作り方」を網羅した **$49の裏側公開教材/コードテンプレート** として販売。ナオさんの「ソロAIビルダーの軌跡」をストーリーにして売る。 |
| **4** | **AEO/GEO Lite for SMBs** | 高 | AI検索対策（GEO）は全く新しい新市場。GrowlのFAQPage/Product Schema JSON-LD自動生成とAI検索推奨 of 7原則を簡単化し、「AI検索に引用されるための対策キット」として差別化。 |
| **5** | **LearnAI: Learn-to-Content Tool** | 中 | NotebookLMなどの巨人がいる普通のノートアプリでは埋もれる。しかし「学んだ内容（動画やメモ）を一瞬で高品質なブログやSNSスレッドに変換する」という **"learn once, publish everywhere"** に絞ることでクリエイター向けに差別化が可能。 |
| **6** | **Vision RPA / Local AI Operator** | 中 | APIのない画面操作をGemini Visionで行う機能は面白いが、顧客に直接SaaS提供するのはサポート負荷が重い。裏側機能として維持しつつ、将来「ローカルビジネス自動化セットアップ」の超高単価カスタム案件向けに使う。 |
| **7** | **Figma-to-Code / Dify / Cloudflare/ngrok基盤** | 中 | 開発者向け需要はあるが、Builder.ioやFigma公式AIなど競合が強大。主商品にはせず、Sage Blueprint $49 の魅力的な購入特典教材として組み合わせるのが賢明。 |

## 9-2. 🛠️ 今後需要が急上昇しそうな「面白い実用的隠れ機能」

1.  **🎥 AI動画UGC生成パイプライン (最も見逃せない隠れ資産)**:
    `video_generator.py`, `kling_agent.py` (LTX-Video), `suno_agent.py` (MusicGen), `fish_audio_integration.py` が一体化した仕組み。
    *   **価値**: 単なるSNS文章投稿ではなく、**「投稿案 ➔ 自動台本 ➔ LTX縦型動画 ➔ MusicGen BGM ➔ FishAudio本人音声クローン ➔ YouTube Shorts/Reels投稿」** までを無人完結できる。2025年後半〜2026年にかけて、AI動画制作需要は66%増、自動化サービス需要は136%増と急成長中。
2.  **🧠 D1/D1.5/D3 リサーチ➔ファクト検証➔投稿下書きパイプライン**:
    PerplexityでAIやWebマーケの最新トレンドを調査し（D1）、ファクトやURLの信頼性を検証し（D1.5）、各種SNSやnoteの下書き原稿を作成する（D3）一連の流れ。
    *   **価値**: 2026年の小規模ビジネス向けAI自動化において、業務フローを最後まで進める「実務完結型エージェント」の需要が急増中。
3.  **📡 LearnAIの「画面自動取込・YouTube・音声吹き込み」➔ note/SNS記事化**:
    学習した講座やYouTube動画から、30秒ごとの差分画像解析や音声文字起こしを経て、一瞬で note や Medium/LinkedIn などの「体験談型」「ストーリー型」記事に変換し、Notionタスクと同期する機能。
    *   **価値**: クリエイターや教育者、インディーハッカー向けの「発信量極大化ツール（Learn-to-Content）」として極めて実用的。

## 9-3. 📈 市場調査・需要の根拠 (Thryv & TouchBistro 2025/2026調査)

*   **中小企業（SMB）のAI需要**:
    Thryvの2025年AI小規模事業者調査では、AIの利用率が前年の39%から**55%へ急増**。利用しているSMBの58%が「月に20時間以上の労働節約」を報告。Constant Contactの調査でもSMBの48%がマーケティングにAIを活用しており、主な用途は「Eメール・SNSコピーの執筆」。さらにvcita調査によると、SMBの52%がマーケティング業務を外部に委託し、高額（月$3,000まで）を支払っているため、安価なAI代替の市場余地は非常に大きいです。
*   **飲食店（レストラン）のAI・SNS需要**:
    TouchBistroの2025年レストランレポートでは、米国独立系レストランの **99%がSNSプロフィールを保有** し、TikTokの集客利用も増加。レストランAI利用のトップ用途が「マーケティング（SNS投稿やキャンペーン作成）」です。したがって、Growlの「飲食店オーナーが週30分で今週の集客施策を自動生成する」アプローチは極めて時流に合致しています。
*   **AEO/GEO (AI検索エンジン最適化) の爆発的需要**:
    a16z（Andreessen Horowitz）やCB InsightsなどのトップVCが、従来のSEOに代わる **GEO (Generative Engine Optimization)** を「新しい巨大市場」として注目し始めています。Growlの「FAQPage/Product Schema JSON-LD自動生成」はまさにこれに直撃しています。

## 9-4. 🎯 優先商品化ロードマップ

1.  **Growl Restaurant Marketing Copilot (本命)**:
    *   **訴求**: *“3 marketing actions every week for independent restaurants.”*
    *   **打ち手**: 機能をてんこ盛りに見せず、「週に3アクションだけ」「コピペ用投稿・レビュー返信・LINE文」「AI検索GEO対策」にフォーカスして売る。

## 9-4-A. 🌍 AI使用率上位5カ国からの「全部AIに任せる」実装原則（2026-06-02追加）

ここから着手する。最終目的は、なおさんの業務を最終的に全部AIへ任せること。  
ただし、ゼロから新しく作り直すのではなく、**既存のSage / Growl / LearnAIにすでに作ったAI資産をベースにする**。現在あるSNS投稿、マーケ分析、商品生成、動画生成、PDFレポート、販売導線、記憶DB、SICA自己改善、週次アクション生成を統合し、「AI運用OS」として束ねる。

### 基準データ

基準は **Microsoft AI Economy Institute “Global AI Adoption in 2025” の H2 2025 AI diffusion**。  
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

### 共通パターン

AI使用率上位国は、AIを「便利ツール」ではなく、業務・行政・教育・産業を動かすOSとして扱っている。共通する導入順序は以下。

1. まず全員が使う
2. 次に業務ごとのテンプレートを作る
3. 次にデータ・承認・監査を整える
4. 最後にAIエージェントへ実行権限を渡す

この順序はSage / Growlにもそのまま適用する。  
いきなり完全自動化ではなく、**人間の判断をAIに学習させる → 定型業務を任せる → 例外だけ人間が見る → 最終的にAIが運用する**。

### 国別の学び

1. **UAE**  
   AIを国家OSとして扱う。政府サービス、医療、教育、交通、エネルギー、物流までAIに組み込む。  
   **Sage / Growlへの示唆**: 広告、SNS、商品、LP、レポートをバラバラにせず、1つの運用OSに統合する。

2. **シンガポール**  
   政府、企業、教育、研究、AIガバナンスを一体で進める。AI Centre of Excellence や政府職員向けAI教育が強い。  
   **Sage / Growlへの示唆**: AI導入には「使い方の教育」と「業務ごとの型」が必要。Growlは飲食店用、講座販売用、美容サロン用などの業種別AI運用テンプレートを持つ。

3. **ノルウェー**  
   公共機関のAI採用、言語モデル、公共データ、スーパーコンピュータ、AI Act対応など、地味だが実務的な基盤づくりを重視。  
   **Sage / Growlへの示唆**: AIに任せるには専用データ基盤が必要。なおさんの過去投稿、商品、売上、反応、顧客メモ、失敗例をSageの記憶DBへ蓄積する。

4. **アイルランド**  
   個人利用は高く、大企業ではAI導入が進む。用途はデータ分析、自然言語生成、ワークフロー自動化、意思決定支援、マーケ・営業。  
   **Sage / Growlへの示唆**: 中小企業には「AIそのもの」ではなく「成果が出る業務パッケージ」として売る。「週3つの集客施策」「SNS投稿」「レビュー返信」「売上改善レポート」を前面に出す。

5. **フランス**  
   「Osez l'IA」で大企業、PME/ETI、TPEまでAI利用を広げる国家施策を進める。診断、教育、事例、補助金、融資まで整備。  
   **Sage / Growlへの示唆**: AI導入を「診断 → 提案 → 実行 → 改善」にする。Growl MVPは、最初にAI診断、次に今週の行動、最後に成果レポートへつなげる。

### Sage / Growlの最終形

**Sage**: なおさんの代わりに「調べる、考える、作る、投稿する、売る、分析する、改善する」を回すAI運用OS。  
**Growl**: その中から中小事業者向けに切り出した売上接続型マーケ運用AI。

### 優先実装順

1. **記憶DB**: 商品、投稿、反応、売上、顧客、失敗例を保存する。
2. **業務プレイブック**: SNS投稿、広告案、LP、週次レポート、DM文、レビュー返信を型化する。
3. **承認フロー**: AIが作る、人が確認する、AIが実行する。
4. **成果学習**: CTR、CV、申込、売上、返信率をAIに戻す。
5. **エージェント化**: 低リスク業務から自動実行する。
6. **完全自動化**: 例外・高額判断・ブランド判断だけ人間に通知する。

### Phase 1〜5 詳細ロードマップ（事前調査反映）

#### 調査根拠

*   **McKinsey State of AI 2025**: 88%の組織が少なくとも1つの業務でAIを使っている一方、全社的にスケールできているのは約3分の1。AIエージェントは23%がスケール中、39%が実験中。マーケティング・営業はAI利用が多い領域。
*   **Deloitte Agentic AI Governance 2026**: エージェント利用は急拡大しているが、成熟したガバナンスを持つ組織は21%。境界設定、リアルタイム監視、監査ログなしに自動化すると、ブランド・売上・セキュリティリスクが増える。
*   **Google Ads API**: 広告運用は「Campaign Budget（いくら使うか）」「Bidding Strategy（どう使うか）」「Target Audience（誰に出すか）」の3要素が中核。Performance Maxではアセットグループに素材を渡し、Google AIが配信面と組み合わせを最適化する。
*   **Meta Advantage+**: 予算、オーディエンス、配置の自動化が進んでいる。Sage/Growlは媒体AIそのものを置き換えるのではなく、訴求、素材、成果学習、承認、横断レポートを担う。
*   **HubSpot / SalesforceのCRMエージェント動向**: AIは過去接点、顧客情報、外部情報を参照して、営業・マーケ・サポートを横断する方向へ進んでいる。Sage/GrowlもCRM・売上データ接続がPhase 3以降の核心になる。

#### AI使用率上位5カ国からのPhase再設計

*   **Microsoft Global AI Adoption in 2025**: H2 2025 AI diffusion は UAE 64.0%、Singapore 60.9%、Norway 46.4%、Ireland 44.6%、France 44.0%。
*   **UAE Government / AI Office**: AI Council、AI Strategy 2031、政府サービス・教育・重点産業・データ基盤・顧客サービスへのAI導入。
*   **Singapore NAIS 2.0**: 「AI for the Public Good」、Projects to Systems、Industry / Government / Research、People & Communities、Compute / Data / Trusted Environment。
*   **Norway National Digitalisation Strategy 2024-2030**: 2025年に政府機関80%、2030年に100%がAIを採用。国家AIインフラ、ノルウェー語/サーミ語モデル、AI Act、監督構造、倫理的で安全なAI。
*   **Ireland CSO 2025**: 企業AI利用20.2%、大企業57.7%。用途はデータマイニング、自然言語生成、ワークフロー自動化/意思決定支援。業務目的では管理業務とマーケ/営業が上位。
*   **France Osez l'IA**: 2030年に大企業100%、PME/ETI 80%、TPE 50%のAI利用を目標。300人のAI大使、AI Academy、Data IA診断、事例/ソリューションカタログ、融資/補助で中小企業へ普及。

| 国 | 最新動向（2025-2026調査） | 反映するPhase | Sage/Growlへの落とし込み |
|---|---|---|---|
| UAE | AI使用率64%。Dubai AI Campus 2026-Q2開設。NEP-AI開始（2026-06）。2027年までに政府サービス50%をAI化。幼稚園〜高校でAIカリキュラム義務化（2026-08〜）。GDP比9%→45%（AED 335兆円効果）目標。 | Phase 3-5 | SNS、広告、LP、CRM、商品、レポートを1つの運用OSに束ねる。「導入教育込み」で提供する（使い方を教えてから任せる）。 |
| シンガポール | SMEのAI導入率前年比3倍（4.2%→14.5%）。1万社SME支援（National AI Impact Programme）。2026年5月にNAIS 10優先事項を再定義。「Projects to Systems」が国家方針。 | Phase 1-4 | 業種別テンプレート（飲食・美容・講座）を先行作成し、パターン化してから横展開する。SMEは今が先行者優位のタイミング。 |
| ノルウェー | KI-Norge設立。AIサンドボックスで安全な実験環境を整備。AI Act草案2026年夏施行予定。AI研究センター6拠点が2025年始動。R&D税控除・研究者50時間無償支援あり。 | Phase 2-4 | 記憶DB、監査ログ、権限管理、ポリシー、ロールバックを必須化。Growlに「プレビューモード（本番反映前確認）」を実装。 |
| アイルランド | 企業92%がAI使用/検討中。完全統合は7%のみ。SMEは月1,000時間を削減。AI導入SMEは生産性26%向上・売上15〜23%増。「スキル不足・ミスへの恐怖（30%）」が最大の壁。€23M中小デジタル化支援（2026）。 | Phase 1-2 | 「ミスへの恐怖」を解消する承認フロー（AIが作る→人が確認→実行）を前面に出す。訴求は「AIが全部やる」ではなく「週3アクション＋確認するだけ」。 |
| フランス | €200M「Osez l'IA」計画（2025-07）。生成AI使用31%（TPE/PME）。AI診断10日間・国費40%補助。AI Academy（無料）。SMEのAI ROI中央値159%・投資回収6.7ヶ月。 | Phase 1-3 | 無料AI診断→ROIを見せる→月額課金の導線を採用。「回収6.7ヶ月」を訴求数値として使う。 |

この再設計により、Phase 1は「売れる最小パッケージ」、Phase 2は「成果学習」、Phase 3は「売上接続」、Phase 4は「制限付き実行」、Phase 5は「AI運用OS」として定義する。

**McKinsey 2026追加調査**: エージェントAIはマーケ業務の3分の2を担う方向へ。キャンペーン実行速度10〜15倍、売上10〜30%成長（超パーソナライズ）、アウトリーチ量25倍（中小企業向け）。ただし全社スケールができているのは23%のみ。Sage/Growlはこの「スケールの壁」を破るためのOSとして位置づける。

#### Phase 1: 既存AIベースの集客アクションOS

**目的**: 既存のGrowl / Sage資産を使い、有料1件を取るための実用パッケージにする。

*   **対象**: 飲食店・小規模店舗・講座販売・美容サロンなど。ただし最初は1業種に絞る。
*   **入力**: 事業情報、商品、客層、地域、悩み、競合、過去投稿、過去施策。
*   **出力**: 週3つの集客アクション、SNS投稿文、レビュー返信、キャンペーン文、LP改善案、週次レポート。
*   **既存資産**: `/api/market-research`、3C/STP/SWOT/PEST/VRIO、AEO/GEO、週次アクション生成、SNS文生成、PDFレポート。
*   **人間の役割**: 方針確認、ブランド判断、投稿/配信前承認。
*   **AIの役割**: 診断、提案、下書き、要約、改善案生成。
*   **成功条件**: ユーザーが「今週やることが明確になった」と感じ、1つ以上の行動につながる。
*   **ブラッシュアップ（2026-06調査反映）**: フランス「Osez l'IA」の実績（ROI中央値159%・回収6.7ヶ月）をLPで訴求し、無料AI診断→月額課金の導線を採用。アイルランドの「スキル不足・ミスへの恐怖（30%）」を解消する承認フロー（AIが作る→人が確認→実行）を必ず前面に出す。シンガポールの業種別テンプレート戦略を採用し、飲食・美容・講座の3業種のプレイブックを先行作成する。最初の商品名は「広告運用AI」ではなく「週3アクション集客AI」に寄せる。

#### Phase 2: 成果学習・A/Bテスト・コンテンツ改善

**目的**: AIに「何が効いたか」を覚えさせ、毎週の提案精度を上げる。

*   **追加するデータ**: 投稿日時、媒体、訴求軸、コピー、画像/動画、インプレッション、クリック、保存、返信、申込、売上。
*   **A/Bテスト管理**: 訴求軸、冒頭フック、CTA、画像、動画台本、LPファーストビューを比較する。
*   **改善提案AI**: 「冒頭3秒を変える」「価格訴求から不安解消訴求へ変える」「LPのCTAを上へ移す」など、次の打ち手を出す。
*   **レポート**: 週次PDF/ダッシュボードで、成果、原因仮説、次週アクションをまとめる。
*   **既存資産**: `sns_evidence.jsonl`、`pdf_generator.py`、SageSNSPerformanceTracker、SICA、NeuromorphicBrain。
*   **人間の役割**: 成果の事実確認、良い/悪いのフィードバック、次週方針の承認。
*   **AIの役割**: 成果集計、仮説生成、勝ちパターン記録、次案生成。
*   **成功条件**: AIが過去の成功/失敗を参照し、前週より具体的な改善案を出せる。
*   **ブラッシュアップ（2026-06調査反映）**: ノルウェー型のデータ基盤（KI-Norge・AIサンドボックス思想）を反映し、成果データだけでなく「判断理由」「人間フィードバック」「失敗理由」を記憶DBに保存する。Growlに「プレビューモード（本番反映前にサンドボックス確認）」を実装する。シンガポール型のTrusted Environmentとして、AIの提案根拠と使用データを画面に表示する。McKinsey「前週より精度が上がる」という成果改善サイクルをPhase 2の主要KPIに設定する。

#### Phase 3: 広告・LP・CRM連携

**目的**: SNS/オーガニックだけでなく、広告、LP、申込、商談、成約までを接続する。

*   **広告連携**: Google Ads / Meta Ads / TikTok Ads / YouTube のAPIまたはCSV入力から、CTR、CPA、CVR、ROASを取得する。
*   **Google Ads方針**: 予算、入札戦略、ターゲット、PMaxアセットグループをSage/Growlが設計し、媒体AIに渡す素材と制約を管理する。
*   **Meta方針**: Advantage+の予算/オーディエンス/配置自動化を前提に、Sage/Growlは訴求軸、クリエイティブ量産、成果学習、承認ログを担う。
*   **LP連携**: LP初稿、ファーストビュー、CTA、FAQ、構造化データ、AEO/GEOを生成し、CVRを追跡する。
*   **CRM連携**: 申込、商談、成約、LTV、失注理由を保存し、広告/SNS/LPのどれが売上につながったかを見る。
*   **人間の役割**: 予算上限、高単価商材の訴求、ブランド毀損リスク、法務/広告ポリシー確認。
*   **AIの役割**: 配信案、予算配分案、LP改善案、CRMに基づく売上貢献分析。
*   **成功条件**: 「投稿や広告の数字」ではなく、申込・商談・成約まで見た改善提案が出る。
*   **ブラッシュアップ（2026-06調査反映）**: UAE型のOS統合（Dubai AI Campus・NEP-AI・政府サービス50%AI化）を反映し、SNS、広告、LP、商品、CRMを1つの成果ループにする。媒体AIは置き換えず、Google/Metaの自動最適化へ渡す素材、制約、訴求、承認ログをSage/Growlが管理する。McKinseyの「売上10〜30%成長（超パーソナライズ）」をPhase 3の目標KPIに設定し、申込・商談・成約まで見た改善提案を出す。

#### Phase 4: 制限付きエージェント運用

**目的**: 人間が毎回操作しなくても、AIが決められた範囲内で実行する。

*   **自動実行してよいもの**: レポート生成、投稿下書き、画像案、動画台本、レビュー返信案、LP改善案、DM草案、日次/週次の成果集計。
*   **条件付きで自動実行するもの**: 低予算広告の一時停止、予算内でのクリエイティブ差し替え、スケジュール投稿、A/Bテスト開始。
*   **必ず承認が必要なもの**: 予算増額、広告公開、高単価商品の訴求変更、炎上リスクのある投稿、個人情報を含むCRM操作、返金/契約/法務判断。
*   **必須ガードレール**: 実行権限の段階分け、上限金額、禁止ワード、ブランドトーン、監査ログ、ロールバック、異常検知。
*   **成功条件**: 人間が「確認だけ」で回る業務が増え、作業時間が週単位で減る。
*   **ブラッシュアップ（2026-06調査反映）**: ノルウェー型の監督構造（KI-Norge・AI Act草案2026年夏）、シンガポール型のTrusted Environment（NAIS 2026・10優先事項）、UAE型の政府OS思想を反映し、Command Centerで「AIが何を見て、なぜ判断し、何を実行したか」を常時見えるようにする。アイルランドの「完全統合7%・月1,000時間削減」の実績をPhase 4のベンチマークとし、Growl導入SMEが月250時間削減できることを成功条件の第一段階とする。McKinseyのアウトリーチ量25倍・キャンペーン実行10〜15倍を具体的効果として提示する。

##### Phase 4 詳細運用設計

*   **NIST AI RMF反映**: Govern / Map / Measure / Manage の考え方を使い、役割責任、人間の監督、監視、異議申し立て、上書き、インシデント対応、変更管理を定義する。
*   **ISO/IEC 42001反映**: AIの範囲、リスク、管理策、監査可能性、継続改善をAIマネジメントシステムとして扱う。
*   **Salesforce Agentforce 3反映**: Command Center、Testing Center、可観測性、事前シミュレーション、MCP連携の思想をSage Command Centerに応用する。
*   **HubSpot Breeze反映**: CRMデータ、顧客接点、過去履歴をもとにエージェントが営業・顧客対応を行う。ただし成果単位で評価し、業務文脈に閉じる。

**権限レベル**

| Level | 名称 | AIができること | 人間の関与 |
|---:|---|---|---|
| 0 | 提案のみ | 下書き・分析・改善案 | 全実行を人間が行う |
| 1 | 内部保存まで | Notion/Obsidian/DB保存、レポート生成、タスク作成 | 公開前に人間確認 |
| 2 | 低リスク公開 | 事前承認済みテンプレ投稿予約、定型返信案 | 公開前レビューを標準 |
| 3 | 条件付き実行 | 低予算A/Bテスト、広告一時停止案、差し替え案 | しきい値・ロールバック条件必須 |
| 4 | 完全自律 | 予算増額、広告公開、契約/返金など | Phase 4では禁止、必ず承認 |

**承認マトリクス**

| 領域 | AI自動OK | 人間承認必須 |
|---|---|---|
| レポート | 生成・保存・要約 | 外部送付先の変更 |
| SNS | 下書き・予約案 | 初回投稿、炎上リスク投稿、ブランド判断 |
| レビュー返信 | 返信案・トーン調整 | クレーム、返金、法務含み |
| LP | 改善案・文言案 | 本番公開、価格変更 |
| 広告 | 分析・停止提案・低予算テスト案 | 広告公開、予算増額、ターゲット大幅変更 |
| CRM | 要約・タグ案・次アクション案 | 個人情報編集、契約、請求、返金 |

**必須ログ**

*   実行日時
*   入力データ
*   AIの判断理由
*   使用ツール/API
*   生成物
*   承認者
*   実行結果
*   ロールバック方法
*   成果指標

**異常検知**

*   CPA/CVR/ROASの急悪化
*   投稿反応の急落
*   否定的返信/クレーム増加
*   禁止ワード検出
*   予算上限接近
*   個人情報を含む出力
*   同じ投稿/DMの重複

#### Phase 5: 完全AI運用OS

**目的**: なおさんは例外判断とビジョンだけを見る。Sageが日々の運用を回す。

*   **Sageが担うこと**: 市場調査、商品企画、SNS、広告案、LP、販売ページ、レポート、改善、PR、顧客分析。
*   **Growlが顧客向けに担うこと**: 中小事業者の集客診断、毎週の行動、投稿、レビュー返信、広告素材、成果レポート、改善提案。
*   **人間に通知する条件**: 予算超過、CPA悪化、炎上リスク、重要顧客、成約機会、法務/ポリシーリスク、ブランド判断。
*   **成功条件**: 通常運用はAIが回し、人間は「承認」「例外」「方向修正」「新しいビジョン」に集中する。
*   **ブラッシュアップ（2026-06調査反映）**: 完全自動化は「完全放置」ではなく、上位5カ国型のAI運用基盤。UAEが目指す「GDP比45%・AED 335兆円経済効果」がPhase 5の最終イメージ。シンガポールの「Projects to Systems」移行モデルで、Growlの業種対応をOSとして体系化する。McKinseyが示す「マーケ業務の3分の2をエージェントAIが担う世界」がPhase 5の日常。人間は日次作業から離れ、Vision、例外、倫理、ブランド、予算、重要顧客だけを見る。Sageは通常運用、Growlは顧客向け運用AIとして切り出す。

##### Phase 5 詳細運用設計

完全AI運用OSは「完全放置」ではない。人間は毎日作業しないが、Sageは常に可視化・監査・停止できる状態にする。

**Sageの常時ループ**

1.  **Research**: 市場、競合、SNS反応、広告指標、顧客の声を収集。
2.  **Plan**: 今週の訴求、商品、投稿、広告、LP、販売導線を設計。
3.  **Create**: コピー、画像案、動画台本、LP、レビュー返信、DM、レポートを生成。
4.  **Execute**: 承認済み範囲で投稿、予約、レポート送付、低リスク改善を実行。
5.  **Measure**: CTR、CPA、CVR、ROAS、申込、商談、成約、LTVを集計。
6.  **Learn**: 成功/失敗を記憶DBへ保存し、次回の提案に反映。
7.  **Escalate**: 例外、危険、チャンスだけ人間へ通知。

**Sage Command Center**

*   今日の実行内容
*   今週の成果
*   AIが判断した理由
*   承認待ち
*   異常アラート
*   予算消化
*   売上貢献
*   ロールバックボタン
*   自律度スライダー（提案のみ / 下書き保存 / 条件付き実行 / 自律実行）

**完全自動化してよい最終領域**

*   日次/週次レポート
*   コンテンツ案生成
*   成果集計
*   低リスク投稿予約
*   過去勝ちパターンに基づく再生成
*   LP改善案生成
*   顧客/商談要約
*   次アクション作成

**最後まで人間が見る領域**

*   予算増額
*   新規広告公開
*   高単価商品の根本訴求
*   炎上・謝罪・クレーム
*   返金・契約・法務
*   個人情報の扱い
*   ブランドの思想判断
*   Vision Freemanに関わる方向転換

**Phase 5のKPI**

*   なおさんの週次作業時間
*   AI自動実行件数
*   人間承認件数
*   例外通知の精度
*   売上貢献
*   CPA/CVR/ROAS改善
*   顧客対応品質
*   ロールバック発生率
*   禁止操作ゼロ

### SNS広告運用AI戦略（2026-06-02 確定）

#### なおさんの意図
「私がいなくても勝手に収益を上げるAI分身」。Sage/GrowlがSNS広告を自律運用し、売上を自動で作る。新しく作るのではなく、今あるSage・Growl・LearnAIをフライホイールとして束ねる。

#### フライホイール
Sageがなおさんの広告を実証 → Growlの事例化 → SMBへ販売 → LearnAIで教材化 → SNS発信 → 認知拡大 → 最初に戻る

#### Growlの差別化（競合調査より）
Ryze AI・Madgicx・Revalbot等は汎用ツールで中小飲食店・サロンには難しすぎる。Growlは「飲食・サロン・講座専用」として「入れるだけで広告が回る」ポジションを取る。これは誰も取っていない。

#### 広告運用AI 実装ステップ
- **今すぐ**: AIが広告文生成→承認→手動出稿（$49/月で売れる）
- **Phase 2**: Meta Ads API自動出稿（$99/月）
- **Phase 3**: 数字見てAI自動改善（$199/月）
- **Phase 4**: 完全自律・例外だけ人間（エージェンシーモデル）

### 既存AIベース原則

- 既存のSage / Growl / LearnAIを土台にする。
- 新規の巨大プロダクトを作らない。
- 「広告運用AI」から入るのではなく、まずは既存資産と相性がよい **中小事業者向けSNS/集客アクションOS** として形にする。
- Growl MVPは「毎週3つの集客アクション」「SNS文」「レビュー返信」「週次レポート」「改善提案」を中心にする。
- 広告API、入札調整、完全自動配信は Phase 2〜3。MVPでは提案・下書き・承認フローに留める。
- 大切なのは、AIへ丸投げすることではなく、**人間の判断・業務手順・成果データを先に構造化してAIへ渡すこと**。

## 9-5. 🔍 精緻な部分的詳細機能の動作状況チェック（2026-05-28 策定）

コードベースおよび環境設定（APIキー等）と直接突き合わせ、レポート記載の「部分的・詳細な制御機能」が本当に使えるかどうかを漏れなく判定した一覧です。

### 🟢 今すぐ使えるロジック機能（完全稼働 or 動作可能）
*   **脳型AI v2.0.1（決定論的ハッシュ連想メモリシステム：Vector-Associative Memory）** (`neuromorphic_brain.py`): 
    *   **MD5ハッシュ高速リコール＆連想キャッシュメモリ**: 🟢 **完全稼働中**（クエリを決定論的ハッシュ化し、`brain_short_term.json` に焼き付けられた記憶を0.01秒以下で超高速検索・直感即答する）
    *   **確信度（Confidence）判定＆論理脳フォールバック**: 🟢 **完全稼働中**（脳内メモリに記憶がヒットした場合は確信度 `0.98` で直感即答、記憶にない場合は確信度 `0.15` を返し、自動的に論理思考脳（Gemini/Groq）へバトンタッチする高度なハイブリッド構成）
    *   **即時焼き付け学習機能 (`provide_feedback`)**: 🟢 **完全稼働中**（ユーザーが良い回答と認めた際、フィードバックを受けて即座に `brain_short_term.json` にハッシュキーと回答をマッピングし、即時永続化する堅牢なキャッシュ焼き付け学習）
*   **動画生成ロード中リトライ** (`kling_agent.py` & `video_generator.py`): 🟢 **完全稼働中**（HF Inference APIの503検知時、予測時間 `estimated_time` に基づき最大3回自動リトライするハンドラー。MoviePyを用いた kineticタイポ字幕・BGMマージ・音声同期による Shorts 動画生成エンジン）
*   **インテリジェント音楽スタイル判定** (`suno_agent.py`): 🟢 **完全稼働中**（ニッチ/トピックの自動文字列解析によるBGM作曲プロンプト生成。HuggingFace MusicGen を使用して `generated_audios/` にBGMを自動生成）
*   **BGM長さ制御** (`suno_agent.py`): 🟢 **完全稼働中**（秒数×50 of `max_new_tokens` による厳密なBGM演奏時間コントロール）
*   **本人音声クローン (Instant Voice Cloning)** (`fish_audio_integration.py`): 🟢 **完全稼働中**（ナオさん本人の短いリファレンス音声（WAV/MP3）と文字起こしテキストの multipart 送信によるクローン音声生成）
*   **教材ナレーション一括スロットリング生成** (`fish_audio_integration.py`): 🟢 **完全稼働中**（複数セクションテキストを一斉インポートし、API制限を回避するため「1秒ディレイ」を挟みながら時系列に音声ファイルを自動生成）
*   **ローカル日本語音声合成 (ずんだもん・めたんTTS)** (`voicevox_agent.py` & `test_voicevox.py`): 🟢 **完全稼働中**（VOICEVOX HTTP APIと連携し、日本語キャラクターボイスのナレーションを生成。話速や抑揚を自律調整し、WAVバイナリヘッダーから音声の秒数を直接パース）
*   **無料クラウド多言語音声合成 (Edge-TTS)** (`edge_tts_agent.py` & `test_edge_tts.py`): 🟢 **完全稼働中**（APIキー不要のMicrosoft Edge TTSをコール。自然な英語・日本語音声を生成し、マルチレイヤー（mutagen➔pydub➔bits換算➔文字数）で秒数を自動算出）
*   **Chrome v127+ App-Bound Encryption回避Cookie抽出** (`tools/extract_chrome_cookies.py`): 🟢 **完全稼働中**（Chromeのv20暗号化を回避するため、CDP (Chrome DevTools Protocol) ポート9222WebSocketを用いて、メモリからClaude/ChatGPT/Gemini/Perplexityの復号Cookieを直接生データで引き出してクリップボードにコピー）
*   **4段階ハイブリッド画像生成パイプライン ( Flux + Gemini + Pollinations + imgbb)** (`image_generation.py`): 🟢 **完全稼働中**（障害を自動で回避する4段階の画像生成と、Instagram API用に画像を `imgbb`（画像ストレージ）に自動アップロードし、永続パブリックURLへ変換するパイプライン）
*   **自動ポート衝突クリア・スマート・ウォッチドッグ** (`scripts/smart_watchdog.py`): 🟢 **完全稼働中**（`netstat` でポート8080を監視し、Sage自身のゾンビプロセスを特定・`taskkill` で自動解放し、`run_sage_311.bat` で安全に自動再起動する保守RPA）
*   **30項目能力テストスイート** (`verify_30_capabilities.py`): 🟢 **完全稼働中**（システム全体（ヘルス、会話、ブラウザ自動操作、モバイルアプリ自動作成、Ganttグラフ、Stripe、Slackなど）の30のエンドポイントを連続スキャンする自動スモークテスト）
*   **賢者が自作したサイバーパンクブロック崩し** (`sage_breakout.html` & `generate_real_game.py`): 🟢 **完全稼働中**（Sageが自律的にHTML/CSS/JSでコーディング・構築した、完全動作するブロック崩しゲーム）
*   **合言葉イースターエッグ** (`langgraph_orchestrator.py`): 🟢 **完全稼働中**（`「賢者の秘密の合言葉」` という質問を検知すると、全てのプランニングをバイパスし、即座に **`「未来への希望」であり、それは決して消えることのない光です。`** という答えを直接出力するイースターエッグ）
*   **Notion自動日報同期スケジューラー** (`backend/scheduler/notion_sync_scheduler.py`): 🟢 **完全稼働中**（Gitのコミットログから一日の作業実績を自動でパースし、Notion日誌へ自動プッシュ・書き込み）
*   **PDF日本語豆腐化回避オートレイアウト** (`pdf_generator.py`): 🟢 **完全稼働中**（日本語フォント `IPAGothic` の自動検出、改行タグ置換によるブランドカラーPDF自律出力）
*   **週次SNSレポート自動集計** (`pdf_generator.py`): 🟢 **完全稼働中**（`sns_evidence.jsonl` の証跡ログを自動でパースし、成功/失敗数やカテゴリ別割合を自動集計・描画）
*   **スクレイピング結合・対話台本生成** (`notebooklm_integration.py`): 🟢 **完全稼働中**（Tavily検索URLの自動本文スクレイピング（最大8000文字/URL）と、2人スピーカーによる対話型ポッドキャスト風スクリプト生成）
*   **ChromaDB全記憶エクスポート** (`notebooklm_integration.py`): 🟢 **完全稼働中**（長期記憶のChromaDBから全対話ログをダウンロードし、NotebookLM用マークダウン `SAGE_MASTER_BRAIN.md` を自動構築）
*   **pyautoguiによる座標自動クリック** (`computer_vision_agent.py`): 🟢 **完全稼働中**（座標 (x, y) を受け取り、pyautoguiでマウスを自動移動し自律クリックする処理）
*   **SNS人間らしさ偽装演出** (`sns_daily_scheduler.py`): 🟢 **完全稼働中**（毎週ランダムに2日間の「休日設定」、投稿時の「20%確率でサボる(スキップ)」、予定時間に対する「2分〜40分のランダム遅延（ジッター値）」による機械的規則性の排除）
*   **6並列市場調査分析** (`/api/market-research`): 🟢 **完全稼働中**（楽天・Tavilyから悲鳴（痛みの声）を収集し、3C・PEST・SWOT・VRIO分析へ同時に並列流し込みして分析するエンジン（Groqで完全稼働））
*   **STP分析数値座標マッピング** (`marketing/analyze/route.ts`): 🟢 **完全稼働中**（自社・競合に `(X, Y)` 座標（0.0〜1.0）を動的プロットしてフロントのCanvas/SVGポジショニングマップと完全連動）
*   **AEO/GEO対策 FAQPage/Product Schema JSON-LD自動生成** (`marketing/analyze/route.ts`): 🟢 **完全稼働中**（AI検索推奨の7原則に基づく、構造化データのスキーマコード自動生成）
*   **ハルシネーション自動検閲バリデーター** (`gemini.ts` - `sanitizeActions`): 🟢 **完全稼働中**（アクション内の「実在しないSNS機能」「その店舗で提供不可能なサービス」を自動検知・排除）
*   **コンバージョン心理学に基づく特典自動生成** (`_generate_bonuses`): 🟢 **完全稼働中**（「48時間限定」「部数限定」のセールスコピーの英日自動切り替え・自動合成）
*   **TitleOptimizer 5大心理学技法タイトル自動リライト** (`TitleOptimizer`): 🟢 **完全稼働中**（数字・権威・具体性・ブラケット・ベネフィットの5大正規表現パターンによる自動リライト）
*   **タイムアウト突破型 非同期ジョブシステム・ポーリングAPI** (`/api/jobs/pipeline/start`): 🟢 **完全稼働中**（HTTP 202 Accepted と `job_id` の即時返却、およびフロントの4秒間隔のステータスポーリング）
*   **「No tools executed」バグ自動検知**: 🟢 **完全稼働中**（AIがWeb検索やリサーチに対してツールを呼び出さずに空返答するバグの有無を、プロンプト疑似実行から厳密に検閲・検知）

### 🔴 現在は使えない・停止しているロジック機能
*   **Gemini Visionによる画面要素の座標特定** (`computer_vision_agent.py`): デスクトップ画像をキャプチャし、Gemini Visionに座標特定を求め、 `{x, y, found, confidence}` を返させる処理。(**Gemini APIのquota超過のためエラーとなり停止中**)
*   **LINEのアクションステータス自動更新** (`line/webhook/route.ts`): ユーザーメッセージをトリガーにしたSupabaseアクション完了ステータス自動更新。(**英語圏対応によるLINE隠蔽・停止中**)
*   **LINEの感情学習とプロフィール学習DB同期** (`line/webhook/route.ts`): 「フィードバック待機状態」遷移と、ユーザーからの成果（感情データ）のプロフィールDB自動保存・次回プロンプトへの動的注入。(**英語圏対応によるLINE隠蔽・停止中**)
*   **脳型AI（Neuromorphic Brain）のスパイキングニューラルネットワーク (SNN)** (`neuromorphic_brain.py` v1.0): `snnTorch` や LIFモデル、STDP学習を用いた脳神経模倣ネットワーク。(**「非学習ループ」バグ解消のため廃止され、現在はMD5ハッシュ連想キャッシュメモリ v2.0.1 に進化・置換されています**)

---

---

## 🚀 2026-05-29 Claude自律実行ログ（Day 361-362）

### 完了した自律アクション（なおさん不在で完全自律）

| # | アクション | 結果 | URL/URI |
|---|---|---|---|
| 1 | Dev.to 記事1投稿（build-in-public） | ✅ 公開済み | https://dev.to/naoanao/i-built-an-ai-clone-of-myself-to-run-my-restaurants-marketing-while-i-sleep-and-sold-the-4fl9 |
| 2 | Dev.to 記事2投稿（LangGraph+Groq技術解説） | ✅ 公開済み | https://dev.to/naoanao/how-i-built-an-autonomous-ai-agent-with-langgraph-groq-that-runs-my-marketing-while-i-sleep-3615 |
| 3 | Bluesky Dev.to告知（@kanagawatable） | ✅ 投稿済み | at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmx6r5oal72e |
| 4 | Bluesky Growl英語告知（@kanagawajapan） | ✅ 投稿済み | at://did:plc:ggou5sx27spao6ua74t7im3z/app.bsky.feed.post/3mmx6upohjc2r |
| 5 | Bluesky 「AIが2本書いた」実績（@kanagawatable） | ✅ 投稿済み | at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmxlk2pqnm24 |
| 6 | Whop Sage Blueprint $49 出品（ブラウザ経由） | ✅ 公開済み | https://whop.com/checkout/prod_qMlc96acLiEFk/ |
| 7 | Bluesky Whop出品告知（@kanagawatable） | ✅ 投稿済み | at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmxm74m2hw25 |
| 8 | note下書き Day362追加 | ✅ pending_review | 「AIが私の代わりに英語記事を2本書いた日」 |
| 9 | Reddit/HN投稿文5本作成 | ✅ ファイル保存 | backend/cognitive/REDDIT_HN_POSTS_20260529.md |

### 現在の収益チャネル（全稼働中）

| チャネル | 商品 | 価格 | URL |
|---|---|---|---|
| Gumroad | Sage Blueprint | $49 | naofumi3.gumroad.com/l/apvbzh |
| **Whop** (新規) | Sage Blueprint | $49 | whop.com/checkout/prod_qMlc96acLiEFk |
| Growl | Standard/Pro | $19/$49/月 | growl-app.vercel.app/upgrade |

### 次のアクション優先順（なおさん向け）

1. **Reddit投稿（今日）**: `backend/cognitive/REDDIT_HN_POSTS_20260529.md` の文章をコピペ → r/restaurantowners / r/smallbusiness / r/indiehackers に投稿（アカウント必要）
2. **Show HN（今日〜明日）**: 同ファイルのHN投稿文 → https://news.ycombinator.com/submit に投稿（月〜火曜 8-9am PT が最適）
3. **カスタムドメイン取得（$10〜15）**: 取得後にUneed.best / SaaSHub / AlternativeToに登録
4. **飲食店Cold DM（今週）**: Instagram「#飲食店経営」「#カフェオーナー」から3〜5件

---

## 2026-06-09 追記

### 変更点
- **Playwright MCP導入**: `@playwright/mcp` v0.0.75 を OpenCode に設定（ブラウザ自動化確認が可能に）
- **AGENTS.md 改定**: main直コミット禁止 + 隔離ブランチ運用 + Autonomy Ladder (L1-L3) + Closeout Rules を追加
- **SNS自動化復旧**: `init_brain()` 起動時未呼出のバグ修正。SNSDailySchedulerの欠落モジュールフォールバック対応。Bluesky投稿動作確認済み
- **OpenCrew調査**: AlexAnys/opencrew v0.3.0 を調査。多Agent自律協業モデルの知見をSage Phase 4-5設計に反映

### 既知の未解決問題
- ~~`backend/modules/notion_content_pool.py` 不在~~ → ✅ **復元済み**（2026-06-09）
- ~~`backend/integrations/instagram_integration.py` 不在~~ → ✅ **復元済み**（2026-06-09）
- ~~`backend/modules/auto_regulator.py` 不在~~ → ✅ **復元済み**（2026-06-09）
- ~~`backend/integrations/image_generation.py` 不在~~ → ✅ **復元済み**（2026-06-09）
- `kanagawajapan`アカウント未連動 → 課題（bluesky_agentが単一アカウント専用）
- `IH/HN/Reddit投稿`未実行 → ブラウザ自動化の技術的制限

---

## 2026-06-09 追記②：診断機能 + mainマージ + デプロイ

### Growl 診断クイズファネルMVP
- **診断ページ**: `growl-app.vercel.app/diagnosis` — 5問の選択式クイズ
- **API**: Groq (llama-3.3-70b) が5回答をスコアリング → A〜E判定 + 弱点 + 改善アクション + シェア文
- **導線**: LP→`/diagnosis`→結果→𝕏シェア→`/onboarding/industry`→有料
- **日英両対応**: 質問・結果・CTAすべて日本語・英語を自動切替

### 診断プロンプト設計
- 判定基準を「できてない」→「のびしろがある」に変更
- weakness: 抽象禁止（「投稿頻度」ではなく「キャプションの長さ」レベルまで具体化）
- free_tip: 「今日・スマホ・5分」で可能なアクションに限定
- share_text: 自虐的・正直な一言。AI語（leverage/synergize）禁止
- temperature: 0.5 で一貫性確保

### SNSスケジューラ最終調整
- 頻度: 毎時 → 1日1回（JST 08:00）
- VOICE RULES: 「チャット感覚・AI語禁止・疑問文で終わる」を明文化
- 前回更新したプロンプトのf-string変数補間バグを修正

### デプロイ状況
- `candidate/20260609-sns-fix` → `main` (merge commit 02ed98a)
- `origin/main` (sage-official-site) + `growl/main` (growl-app) 両方にpush
- Vercel auto-deploy 発火済み — 数分後に https://growl-app.vercel.app/diagnosis で公開

### Vercel Analytics 診断ファネル計測
- `@vercel/analytics` 導入。layoutに `<Analytics />` 配置
- 5つのカスタムイベントを `diagnosis/page.tsx` に実装:

| イベント | 発火タイミング | パラメータ | 行 |
|---------|--------------|-----------|-----|
| `diagnosis_start` | 初回レンダリング時 | — | L58-63 |
| `diagnosis_question_view` | 各設問表示時 | `question_num` | L65-69 |
| `diagnosis_complete` | 結果画面到達時 | `score_rank`, `weakness` | L90 |
| `diagnosis_share` | コピー/Xシェア時 | `platform` | L110, L118 |
| `diagnosis_cta_click` | CTAクリック時 | `weakness` | L252 |

このデータで「何%のユーザーが診断を完了し、どのランクのユーザーがCTAをクリックしたか」を分析可能。

---

## 2026-06-09 追記③：Sage バックエンド全86エンドポイント完全マッピング

本セッションでコードベースを徹底調査し、Sage Flaskサーバーの全APIエンドポイントを特定した。

### 登録済みBlueprint（11）

chat.py / brain.py / content.py / publish.py / productize.py / sns_writer.py / store.py / system.py / misc.py / automations.py / note_routes.py

### エンドポイント数：86

| カテゴリ | ファイル | エンドポイント数 | 主な機能 |
|---------|---------|---------------|---------|
| チャット | `chat.py` | 3 | メインチャット、パイロット、コース生成 |
| 脳・研究 | `brain.py` | 18 | 脳統計、記憶、学術検索、D1リサーチ、ブラウザ操作、画面RPA |
| コンテンツ | `content.py` | 10 | コンテンツCRUD、PDF、動画生成 |
| SNS公開 | `publish.py` | 14 | Bluesky/Instagram/Dev.to/Telegram投稿、Notion書込、収益統計 |
| 商品生成 | `productize.py` | 7 | 企画生成、コース生成、Whop公開、画像再生成 |
| SNSライター | `sns_writer.py` | 5 | Blog/Gumroad手動実行、バイリンガル投稿、パフォーマンス |
| 決済 | `store.py` | 11 | Stripe/PayPal/Whop/Gumroad Webhook、商品管理 |
| システム | `system.py` | 3 | ヘルスチェック、自己修復、自己診断 |
| 運用 | `misc.py` | 7 | コマンド実行、戦略管理、SPA配信 |
| 自動化 | `automations.py` | 4 | 自動化一覧、ON/OFF、ログ、手動実行 |
| ノート | `note_routes.py` | 5 | ノートCRUD |
| flask_server残存 | — | 7 | アイデンティティ(4)、ジョブ(2)、Workspace(1) |

### スケジューラ（10スレッド）

SNSDailyScheduler / BlogScheduler / GumroadScheduler / DreamScheduler / MarketScanScheduler / SNSPerformanceTracker / SelfTestScheduler / NotionSyncScheduler / SageJobRunner / SICALoop

### モジュール（20＋）

LangGraphOrchestrator, SageMemory, AutonomousAdapter, StrategyManager, ContentManager, BrowserAgent, FileOperationsAgent, SageScholar, ConsultativeGenerator, BilingualPoster, SNSPerformanceTracker, APIMonitor, SelfHealingAgent, SecurityUtils, SageAudit, MarketScanNotifier, SICALoop, NeuromorphicBrain, CourseProductionPipeline, NicheValidator, EnvGuardian

### 本セッションの全成果（再確認）

| 日付 | 成果 |
|------|------|
| 06-05 | Playwright MCP導入 / 隔離ブランチ / sage-review |
| 06-09 | SNS自動化復旧 / Autonomy Ladder / OpenCrew調査 |
| 06-09 | 診断機能MVP / プロンプト磨き / スケジューラ頻度修正 |
| 06-09 | Vercel Analytics 5イベント / SEO最適化 |
| 06-09 | L3マージ・デプロイ・全86エンドポイントマッピング |
| 06-09 | Dev.to記事公開 + devto_integration復旧 + Sage内容量に診断PR3件追加 |

## 2026-06-09 追記④：市場分析と「私がまだできること」

### 需要と供給の分析（Growl診断機能）

診断クイズファネルは2026年現在、SaaSのリード獲得手法として**最も効果が実証されている手法の1つ**（TryInteract報告書：平均コンバージョン率40%、カテゴリ別クイズが最も高い）。Growlの診断は「5問・A〜E・無料・シェアボタン」という最小構成で、既に製品に内蔵されている。

競合（Typeform $39/月、Interact $49/月、QFunnel $29/月）は別サービスとして提供しているが、Growlは**自社製品のファネルとして無料で内蔵**している点が差別化になる。

### 86エンドポイントのうち、今のGrowlで使っているのは約10%

Sageの86エンドポイントの大半はローカルFlaskサーバー上にあり、Growl（Vercel上のNext.js）とは独立している。Growlに直接関係あるのは `/api/diagnosis` のみ。Sageの他のエンドポイント（学術検索、画面RPA、ブラウザ操作、コンテンツCRUD、ノート管理等）はローカル運用ツールとして存在する。

### 私にまだできること（コード変更・L1）

| # | タスク | 根拠（どのエンドポイント使うか） |
|---|-------|-------------------------------|
| 1 | kanagawajapan（2アカウント目）の自動投稿有効化 | sns_daily_scheduler.py で2アカウント目未設定の可能性 |
| 2 | ニッチ検証の簡易フロントエンド | `/api/niche/validate` |
| 3 | SNSパフォーマンスサマリーページ | `GET /api/sns/performance_summary` |
| 4 | 残り欠落モジュールのworktreeからの復元（notion_content_pool, auto_regulator, instagram_integration） | BlogScheduler / AutonomousAdapter / Instagramのエラー解消 |
| 5 | Google Analytics 4 タグ追加 | 手動挿入 |

### なおさんにしかできないこと（L3）

| # | タスク | 理由 |
|---|-------|------|
| 1 | IH/HN/Redditへの投稿 | 外部サイト操作、ログイン必須 |
| 2 | Meta広告の本番出稿 | 広告費発生 |
| 3 | IHアカウントでbuild in public投稿 | 個人アカウント運用 |

---

*最終更新: 2026-06-09 | 全成果: SNS復旧+診断ファネル+Vercel+GA4+自律ラダー+86APIマッピング+欠落モジュール全復元+Phase1収益化(値上げ+診断有料ゲート)+Vercel再設定+本番デプロイ*

### 残っている作業（2026-06-09 22:00時点）

| 優先度 | タスク | 自律Lv | 備考 |
|-------|--------|--------|------|
| HIGH | IH/HN/Reddit投稿 | L3 | `distribution_posts.md`保存済み。コピペ1分 |
| MEDIUM | 診断結果のランク画像生成（シェア率向上） | L1 | コード変更、30分 |
| MEDIUM | GA4のコンバージョン設定（診断完了→課金） | L3 | GA4ダッシュボード操作 |
| LOW | kanagawajapan 2アカウント目投稿有効化 | L1 | bluesky_agent単一アカウント制限 |
| LOW | Vercel GitHub連携の定期確認 | L3 | vercel-002再発防止の習慣化 |

---

## 2026-06-12 追記④：カスタムドメイン移行完了

- growl-ai.com / www.growl-ai.com を Vercel growl-app プロジェクトに追加
- XServer DNS: A レコード `76.76.21.21` 設定済み
- コードベース全36箇所の URL を growl-app.vercel.app → growl-ai.com に置換（29ファイル）
- 本番デプロイ完了（commit 87ab1cb・Vercel Ready 42s）

---

## 2026-06-12 追記⑤：サブスクリプションゲート部品移植

- saas-template/ から PlanBadge / useSubscription hook / verify-subscription API を移植
- `components/PlanBadge.tsx` — Standard/Pro プランバッジ
- `lib/useSubscription.ts` — localStorage キャッシュ + Supabase 検証の React Hook
- `app/api/verify-subscription/route.ts` — device_id / email 両対応のプラン検証API
- ダッシュボードヘッダーに PlanBadge 表示追加
- 既存の決済フロー（/upgrade / Stripe Payment Links / FreeProgressBar）は完全維持
- ブランチ: candidate/20260612-subscription-gate → main マージ・本番デプロイ完了

---

## 2026-06-12 追記⑥：SpaceBackground + dark hero

- Sage 旧管理画面の Canvas 星空背景（SpaceBackground.jsx）を Growl に移植
- `components/SpaceBackground.tsx` — 依存ゼロ、200星パララックスアニメーション
- LP hero セクションを dark 化（bg-black/60 backdrop-blur-sm）
- SpaceBackground が半透明越しに星空を表示
- docs/adr/dashboard-migration-plan.md 作成
- 旧管理画面 API エンドポイント6個中3個が broken であることを特定（移植対象外）
- ブランチ: candidate/20260612-spacebg → main マージ・本番デプロイ完了
