# SAGE_MASTER_CONTEXT.md
> **AIアシスタントへ**: このファイルはすべてのセッション開始時に必ず読むこと。  
> Sageシステムの全体構造・なおさんのアイデンティティ・既知問題と解決策を含む。  
> 「2ヶ月に一回同じことを繰り返す」を防ぐためのシステムメモリ。

最終更新: 2026-05-20（note戦略強化・SNSプライバシー修正・gitデバッグ解決）

---

## 1. なおさんとは誰か（オーナーアイデンティティ）

**名前**: Nao（なお）  
**拠点**: 神奈川県、日本  
**バックグラウンド**: バーガーショップ（Uncle Sam）オーナー → ソロAIビルダーに転身中  
**現在地**: AI副業で1日3時間・年収1千万円を目指す1年目

### Vision Freeman（3年ロードマップ）
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
| **Growl** | AIマーケリサーチツール（3C分析・Amazon/楽天レビュー解析） | growl-app.vercel.app |
| **LearnAI** | AI学習支援ツール | LearnAI.html (local) |

### SNSアカウント
- **kanagawatable.bsky.social** → なおさんの個人ビルダー視点。リアルで飾らない旅
- **kanagawajapan.bsky.social** → Sage AIのプロダクトアカウント。具体的な成果・使用例

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
| SageEngagementBot | Bluesky自動いいね・返信 | ✅ 起動中 |
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
│
├── backend/
│   ├── flask_server.py              # メインサーバー（80+エンドポイント、全スレッド管理）
│   ├── config/
│   │   └── identity.json           # なおさんのアイデンティティ・マーケ基礎知識（2026-05-19更新）
│   ├── modules/
│   │   ├── sica_loop.py            # 自己改善ループ（Groq切替済 2026-05-19）
│   │   ├── neuromorphic_brain.py   # JSON永続化メモリシステム
│   │   ├── dream_mode.py           # 夜間アイデア生成（Groq使用）
│   │   ├── langgraph_orchestrator_v2.py  # LangGraphオーケストレーター
│   │   └── sage_master_agent.py    # マスターエージェント
│   ├── scheduler/
│   │   ├── sns_daily_scheduler.py  # Bluesky投稿スケジューラー（メイン）
│   │   ├── instagram_daily_scheduler.py  # Instagram + YouTube Shorts
│   │   ├── blog_scheduler.py       # ブログ自動生成
│   │   └── dream_scheduler.py      # 夜間アイデア生成スケジューラー
│   ├── data/
│   │   ├── local_content_pool.json     # SNSコンテンツプール（15件、2026-05-19拡充）
│   │   ├── post_rotation_state.json    # Account 1 ローテーション状態
│   │   └── post_rotation_state_2.json  # Account 2 ローテーション状態（2026-05-19作成）
│   └── integrations/
│       ├── bluesky_bot.py          # Bluesky投稿
│       ├── instagram_integration.py # Instagram投稿
│       └── youtube_integration.py  # YouTube Shorts アップロード
│
└── ai-marketing-app/               # Growl（Next.js）
    ├── app/api/market-research/
    │   └── route.ts                # 3C分析API（Tavily + Rakuten scraping + Groq fallback）
    └── .env.local                  # Growl環境変数
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

### market-002: Rakuten h2タイトル抽出が0件
**根本原因**: 単行regexがh2とaタグが別行にある楽天HTMLに未マッチ  
**解決済み**: `[\s\S]*?` でDOTALLに相当するパターンに変更（bash検証済み: 44件マッチ）

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

### 現在地：1年目 Day 353

**1年目のゴール**: Sage + Growl + LearnAI の収益化。1日3時間で年収1千万。業務を全部AIに任せる。

#### 収益化の現状
| 商品 | 状況 | アクション |
|---|---|---|
| Sage 3.0 Developer Blueprint ($49) | Gumroad掲載済み。Sales: 0 | **全soft_cta投稿がここに向くよう設定済み（2026-05-19）** |
| Growl | vercel稼働中。未収益化 | 次のステップ：Gumroadに無料版登録 |
| LearnAI | ローカル稼働。未公開 | 将来の収益化候補 |
| CBD ECショップ | 未着手 | 1年目の後半に検討 |

#### 収益化のための投稿戦略（Sage自律実行）
- **build_in_public** (kanagawatable): `Day 353.` で始まるリアルな�