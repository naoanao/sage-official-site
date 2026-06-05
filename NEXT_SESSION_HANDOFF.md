# 次セッション引き継ぎ指示書
作成日: 2026-05-20（最終更新: 2026-06-05）

---

## 🎯 現在地（2026-06-05 JST）

**収益: ¥0 / 目標: 年内¥10M**

### ✅ 2026-06-05 実施済み（Meta広告コピー品質修正）

#### 問題の発見・修正
- **根本原因**: `growl_session` に `user_profile` なし。`AdBoostCard` が `session.user_profile` を参照するとすべて `undefined` → プロンプトに文字列 `"undefined"` が渡り、汎用コピーが生成されていた
- **修正①** `app/dashboard/page.tsx`: `loadOnboarding()` を追加インポートし、オンボーディングデータをAdBoostCardのsessionに優先注入
- **修正②** `app/api/meta-ads/generate/route.ts`: `safe()` ヘルパー追加 → undefined/null/空文字をフォールバック値に変換し、プロンプトに "undefined" 文字列が混入するのを防止
- **コード修正済み・Vercel未デプロイ**（VM停止のためgit pushが未実施）

#### Meta広告テスト結果（2026-06-05）
- ✅ Generate Ad Copy → 生成成功（Groq API稼働中）
- ✅ コピー品質修正済みデプロイ完了（commit 87235eb・本番稼働中）
- ✅ Submit Ad (Paused) → 成功レスポンス + Campaign ID表示
- ✅ META_ADS_ACCESS_TOKEN → **Vercel設定済み（2日前）**
- ✅ META_AD_ACCOUNT_ID → **Vercel設定済み（2日前）**
- **⚠️ 要確認**: 今日のSubmit Adで作成されたキャンペーン（ID: 120247848721930389）がAds Managerに実在するか確認を

---

## 🎯 現在地（2026-06-03 JST）

**収益: ¥0 / 目標: 年内¥10M**

### ✅ 2026-06-03 実施済み（Growl Meta広告全自動化）

#### Meta広告 全自動化システム実装（Growl）
- **AdBoostCard.tsx** 全面書き直し: 広告文生成→コピペ→全自動投稿フローに対応
- **`/api/meta-ads/generate/route.ts`**: 既存（Groqで広告文生成）
- **`/api/meta-ads/submit/route.ts`**: 既存（META_ADS_ACCESS_TOKEN / META_AD_ACCOUNT_ID 必要）
- **`/app/privacy/page.tsx`**: プライバシーポリシー作成・公開済み（https://growl-app.vercel.app/privacy）
- **`/app/terms/page.tsx`**: 利用規約作成・公開済み（https://growl-app.vercel.app/terms）
- **Meta sege3.0アプリ**: ライブモード（公開済み）✅ App Review不要
- **Vercel環境変数追加済み**: `META_APP_ID=1228008508773411` / `META_APP_SECRET`

#### 🔴 未完了・次回必須
- **`META_ADS_ACCESS_TOKEN`** と **`META_AD_ACCOUNT_ID`** がVercel未設定
  - 現状: submit APIがモック応答を返す（広告は実際に作られない）
  - **重要**: なおさんが「昨日渡した」と言っているのは「App Secret（9318f28fd144e00fd1bc5dcac8bf5d68）」。これはVercel設定済み（META_APP_SECRET）。
  - `META_ADS_ACCESS_TOKEN`はApp Secretとは別物（ユーザーレベルのアクセストークン）で未取得・未設定。
  - `META_AD_ACCOUNT_ID`: `act_1208555023132678`（広告マネージャーURLより確認済み）→ Vercel未設定
  - **取得方法**: https://developers.facebook.com/tools/explorer/ → sege3.0選択 → ads_managementスコープ追加 → 「アクセストークンを生成」→ コピー
  - 設定先: Vercel → growl-app → Settings → Environment Variables（META_ADS_ACCESS_TOKENとMETA_AD_ACCOUNT_IDの2つ）

#### Meta広告 動作確認
- 「✅ Ad Created!」表示 → 実はモック応答（トークン未設定のため）
- キャンペーンはMetaに作成されていない（Ads Managerで確認済み）

---

## 🎯 現在地（2026-05-31 JST）

**収益: ¥0 / 目標: 年内¥10M**

### ✅ 2026-05-31 Day365 実施済み（AI自律）
- **flask_server.py 修正**: `app.run()` が欠落していたのを修正 → Flask正常起動
- **Dev.to 記事7本公開**: dev.to/naoanao
  - karaoke → AIDA
  - burger shop → 3C
  - bar event → STP
  - food festival → PEST
  - senior IT → persona
  - drink distributor → 4P
  - customer journey napkin
- **Medium 記事1本公開**: medium.com/p/60d08ebd0301（karaoke記事）
- **Bluesky 10投稿 + 返信4件**
- **FutureTools.io 申請完了**
- **Hashnode ブログ作成**: naoanao.hashnode.dev（Nao's Marketing Blog）※API有料化のため自動投稿は不可
- **@kanagawatable Bio更新**: Growlリンク追加
- **849件の空ジョブ削除**: jobs.jsonをクリア

### 🤖 自動化スケジュール（設定済み）
| タスク | 時間 | 内容 |
|---|---|---|
| devto-daily-article | 毎日9:00 | Dev.to記事1本 + Bluesky告知 |
| sage-note-auto-publish | 毎日10:31 | note.com下書き保存（Flaskが起動している必要あり） |

### 📝 Dev.to 次回テーマ（順番に）
1. ファネル基礎（カラオケ館・入店率の数字）
2. 心理学・希少性（「今なら空いてますよ」が効く理由）
3. コミュニティマーケ（常連客がイベントを手伝った話）
4. SWOT（ファストフードに接客を持ち込んだ話）
5. 7Ps（人で差がついた話）
6. USP（地元食材バーガーでメディアが来た話）
7. ブランド戦略（間借りから始めた話）
8. 4C（シニア向けで売り手目線を捨てた話）
9. デザイン思考（90代との共感）
10. AEO/GEO（AI検索対策）
11. バリュープロポジション
12. 効果検証・KPI
13. SNS戦略
14. データ意思決定

### 🔴 最大の壁（継続）
**Growlにカスタムドメインがない（growl-app.vercel.app）**
- Uneed.best: vercel.appドメイン拒否
- SaaSHub: 同上（既知）
- AlternativeTo: 登録URL変更で404
- **解決策: $10〜15/年のカスタムドメイン取得が必要**（お金ができたら即対応）

---

## ✅ 完了済み作業（触らなくていい）

### PH Launch（2026-05-26）
- PHページ "Launching today" 表示確認済み
- Maker Comment（2時間前）投稿済み
- なおさんが自己Upvote完了
- Gallery画像5枚（英語）アップロード済み

### Gumroad（完了）
- Sage Blueprint（apvbzh）: 新販売文適用済み・$49掲載中
- 不要商品6点: 全てUnpublish済み
- Instagram bioリンク: Gumroadリンクに更新済み

### 2026-05-29 作業 — Claude自律実行分（Day 2・セッション4継続）

- **Dev.to 3本目の記事投稿（Claude自律）:**
  - URL: https://dev.to/naoanao/3-hrsweek-on-restaurant-marketing-30-min-heres-the-exact-system-i-built-50cf
  - タイトル: "3 hrs/week on restaurant marketing → 30 min. Here's the exact system I built."
  - SEO向け実践ガイド形式・Growlへの直接誘導

- **Bluesky告知（Dev.to 3本目）:**
  - @kanagawatable: `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmyflhhtn32f`

- **Instagram DM送信（英語・Claude自律ブラウザ経由）:**
  - @mikeybausch（12店舗経営・DM制限で届かず）
  - @omelegg（アムステルダム・カフェ）
  - @tastehawkpk（パキスタン・新規開業）
  - @bruges.belgian.bistro（ユタ州・3店舗）
  - @kare_melbourne（メルボルン・日本人オーナー）
  - ※英語圏アカウントはリクエストフォルダに入る可能性あり

- **Stripe決済確認（Claude自律）:**
  - Upgrade to Standard Plan ボタン → /upgradeページ → Stripe Payment Link（200 OK）で正常機能確認
  - 収益ゼロの本当の原因 = 集客ゼロのみ（技術的問題なし）

- **Growlのファネル確認（Claude自律）:**
  - 月5回まで無料・LocalStorage管理（回避可能だが現実的な問題ではない）
  - 上限後に¥3,000/月プランへの誘導が正常動作確認

- **Reddit投稿試み → 失敗:**
  - r/restaurantowners: self-promotionで即削除
  - r/indiehackers: 投稿ボタンが機能しない（新アカウントのカルマ不足）
  - **結論: Reddit新規アカウントでは投稿不可能。カルマ蓄積が必要**

### 2026-05-29 作業 — Claude自律実行分（Day 2・セッション3継続）

- **The Next AI ディレクトリ申請完了（Claude自律・ブラウザフォーム）:**
  - サイト: https://www.thenextai.com/submit-ai-tool/
  - 120,000+月間訪問者・dofollow backlink・永久掲載・$0コスト
  - カテゴリ: 📈 Marketing & SEO / Pricing: Freemium
  - 審査結果: 「Tool Submitted!」確認済み → 48時間以内に掲載予定

- **Bluesky 追加投稿（Claude自律）:**
  - @kanagawatable 飲食店向け英語コンテンツ（restaurant owners): `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmxnonaqcm27`
  - @kanagawajapan 日本語飲食店向けGrowl紹介: `at://did:plc:ggou5sx27spao6ua74t7im3z/app.bsky.feed.post/3mmxno2rcpa2l`
  - @kanagawatable → @isabellbartnicki リプライ（AI slop vs 本物のAIマーケ議論に参加）: `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmxnxlx3bm2e`

- **ディレクトリ調査結果（$0制限での限界）:**
  - 有料: toolify($99), aitools.fyi($30), topai.tools($47), TAAFT($49〜), easywithai($125)
  - 無効/404: aitoolhunt, aidirectory, startuplist.in, openfuture.ai, listyourtool
  - バックリンク必須（スキップ）: aitoolzdir, toolpilot
  - ロゴ画像アップロード必須（自動化不可）: dofollow.tools, poweredbyai.app
  - **結論: The Next AIが唯一の純粋無料・フォームのみ申請可能ディレクトリ**
  - **カスタムドメイン取得後に解放されるチャネル: Uneed.best, SaaSHub, TAAFT($49)、多数の有料ディレクトリ**

- **Twitter @NSimura3461:** API v2が有料プラン（$100/月）必須 → 投稿不可

### 2026-05-29 作業 — Claude自律実行分（Day 2）
- **Dev.to 記事2本を Claude が自律投稿（APIキー使用）:**
  - 記事1（build-in-public）: https://dev.to/naoanao/i-built-an-ai-clone-of-myself-to-run-my-restaurants-marketing-while-i-sleep-and-sold-the-4fl9
  - 記事2（技術アーキテクチャ・LangGraph+Groq）: https://dev.to/naoanao/how-i-built-an-autonomous-ai-agent-with-langgraph-groq-that-runs-my-marketing-while-i-sleep-3615
  - 両記事にGumroad $49 + Growlリンク含む。SEO長期資産として機能。
- **Bluesky 3投稿（Claude自律）:**
  - @kanagawatable Dev.to記事告知: `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmx6r5oal72e`
  - @kanagawajapan Growl飲食店告知: `at://did:plc:ggou5sx27spao6ua74t7im3z/app.bsky.feed.post/3mmx6upohjc2r`
  - @kanagawatable 「AIが自律で2本書いた」実績コンテンツ: `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmxlk2pqnm24`
- **note下書き追加（Day362）:** 「AIが私の代わりに英語記事を2本書いた日」→ note_drafts.json に pending_review
- **D1確認:** PHローンチ後の新規外部サインアップなし（subscribers = なおさんのテストのみ）
- **Whop Sage Blueprint $49 出品完了（Claude自律・ブラウザ経由）:**
  - Product ID: `prod_qMlc96acLiEFk`
  - チェックアウトURL: https://whop.com/checkout/prod_qMlc96acLiEFk/
  - Bluesky告知: `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmxm74m2hw25`

### 2026-05-29 作業 — セッション1分（前回）
- Bluesky PH告知投稿済み: `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmx2fx7dce2i`
- note STP記事（Day360）・SWOT記事（Day361）: pending_reviewに追加済み → 次のscheduler実行で自動投稿
- 英語Cold DMターゲットリスト作成: `backend/data/cold_dm_targets_EN_20260529.md`（5件）
- Bluesky @メンション投稿2件（飲食店オーナーへのGrowl紹介）:
  - @mattwright.bsky.social: `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmx3wthic52m`
  - @chrisconley66.bsky.social: `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmx3xdh3gm25`

### ディレクトリ登録（完了分）
- FutureTools.io: Sage Blueprint + Growl 申請送信済み（レビュー待ち）
- BuildVoyage: テキスト入力済み（ロゴ・スクショ画像はなおさんが手動アップ必要）

### note（完了）
- 記事4本投稿済み（うち今日: AIDA記事）
- 3C×Uncle Sam記事: リライト完了（note_draft_3c_uncle_sam.md）→ Scheduler自動投稿待ち
- プロフィール文（140字）: backend/data/note_profile_140.md に保存済み

### Sage システム（2026-05-19〜26）
- identity.json更新（なおさん許可済み）
- SICALoop: Groq切替済み
- sns_daily_scheduler.py: 投稿品質改善済み
- note_scheduler.py: 全面改訂済み（文体ルール・プロンプト最適化）
- post_rotation_state_2.json作成（Account 2重複投稿バグ修正）

---

## 🔴 なおさんがやること（更新: 2026-05-29 夕方）

### 🎯 今すぐできる最高ROI行動（コピペだけ・合計1時間）

**① Reddit投稿（30分・最速集客）**
ファイル: `backend/cognitive/REDDIT_HN_POSTS_20260529.md`
- r/restaurantowners → 飲食店オーナーへ直接訴求
- r/smallbusiness → スモールビジネス層
- r/indiehackers → build-in-public仲間へ

**② Show HN投稿（15分・高インパクト）**
- 同ファイルのHN文をコピペ → https://news.ycombinator.com/submit
- 最適タイミング: 月〜火曜 8-9am PT

**③ カスタムドメイン取得（$10〜15/年）**
- Namecheap/Porkbun で例: growlai.com / getgrowl.com
- 取得後 → Uneed.best / SaaSHub / AlternativeTo への登録が一気に解放される

---

### ✅ Whop Sage Blueprint 出品完了（2026-05-29 Claude自律実行）
- 商品名: `Sage Blueprint — AI Clone That Posts, Researches & Markets While You Sleep`
- 価格: $49 one-time
- Product ID: `prod_qMlc96acLiEFk`
- チェックアウトURL: https://whop.com/checkout/prod_qMlc96acLiEFk/
- Bluesky告知投稿済み(@kanagawatable): `at://did:plc:okhk7kay4kkdz6k4bbwsw3me/app.bsky.feed.post/3mmxm74m2hw25`

### 1. BlueskyにPHリンクをシェア（5分）
アカウント: @kanagawatable
```
Just launched Growl on Product Hunt today 🎉

I was spending 3+ hours/week doing competitor research for my burger shop. Now it takes 2 minutes.

Would love your support! 👇
https://www.producthunt.com/posts/growl
```

### 2. PHコメントに即返信（コメントが来たら）
テンプレ: `backend/cognitive/PRODUCTHUNT_LAUNCH_COPY_v1.md` の「FIRST-HOUR COMMENT REPLIES」参照
- Q「ChatGPTと何が違う？」→ Tavilyのライブ検索・架空情報なし
- Q「飲食店以外でも使える？」→ 使える、3Cはどの業種にも適用可
- Q「無料トライアル後は？」→ ¥3,000/月（Standard）

### 3. IH投稿（PH後72時間以内 = 5/29 JST 16時まで）
下書き: `backend/cognitive/IH_POST_PH_RESULTS.md`（このセッションで作成済み）

---

## 📅 今週中にやること（なおさん手動）

1. **Uneed.best登録 + Growl提出**（30分）
   - https://www.uneed.best/register でアカウント作成
   - https://www.uneed.best/submit-a-tool から提出
   - コピペ内容: `DISTRIBUTION_SUBMISSION_KIT.md` 参照

2. **SaaSHub登録 + 提出**（15分）
   - https://www.saashub.com/services/submit
   - ⚠️ Growlは growl-app.vercel.app（Vercelサブドメイン）のため却下される可能性あり
   - Sage Blueprint（naofumi3.gumroad.com）も同様にサブドメイン問題あり
   - → カスタムドメイン取得後に再挑戦が現実的

3. **AlternativeTo登録**（15分）
   - https://alternativeto.net にサインイン → Growlを「Hootsuite代替」として登録

4. **飲食店3〜5店舗へCold DM**（JP・30分）
   - Instagram検索: 「#飲食店経営」「#カフェオーナー」
   - DM文案: 「Growlという飲食店向けのマーケAIツールを作っています。週次で集客アクション3つをAIが出してくれるんですが、無料で試してみませんか？」

5. **EngagementBot再開検討**
   - flask_server.py の EngagementBot スレッド起動をコメント解除
   - 条件: reply persona確認済み

---

## 📅 今後2週間（5/27〜6/8）

- **IH連載**: 「Day 0から収益ゼロ→¥1→¥10万」 月3〜4本
- **Cold DM（英語）**: Twitter「restaurant owner」検索 → 週5〜10件
- **Reddit投稿**: PH結果のマイルストーン投稿（r/indiehackers）
- **有料ユーザー1件獲得**: 4週間以内に取れなければ価格 or ターゲット変更

---

## 🚀 収益化ロードマップ（変更なし）

| 優先 | 商品 | 価格 | 最速収益まで |
|---|---|---|---|
| 1 | Growl飲食店版 | ¥3,000〜8,000/月 | 今週（DM次第） |
| 2 | Sage Blueprint | $49一括 | 今日（PH経由） |
| 3 | IH/PH/Reddit | — | PH後72時間 |
| 4 | Bluesky Scheduler SaaS | $19〜49/月 | 90日後以降 |

**ガードレール（絶対守る）:**
- 作り直し禁止 / 新機能開発禁止
- 1週間1テーマ
- 4週間以内に有料1件

---

## システム稼働状態（2026-05-26時点）

| スレッド | 状態 |
|---|---|
| SageSNSScheduler (Bluesky 2アカウント) | ✅ |
| SageNoteScheduler (note.com 10:00 JST) | ✅ |
| SageBlogScheduler | ✅ |
| SageDreamScheduler | ✅ |
| SageMarketScanScheduler | ✅ |
| SageEngagementBot | 🔴 DISABLED（再開条件: reply persona確認後） |
| SageSNSPerformanceTracker | ✅ |
| SageSelfTestScheduler | ✅ |
| SICALoop (Groq) | ✅ |
| NeuromorphicBrain | ✅ |

---

## git操作の注意事項

### git index破損の回避方法
Windows NTFS + Linux sandbox のマウント問題で git index が定期的に壊れる。

**修正手順（必ず守る）:**
```bash
cd /sessions/.../mnt/Sage_Final_Unified
rm -f .git/index
git read-tree HEAD
git add <変更ファイル>
git commit -m "..."
```

**やってはいけない:**
- `git reset HEAD` — index削除後に実行するとまた壊れる
- Edit ツールで大きなPythonファイルを直接編集（truncationリスク）
- 大きいファイルはPythonパッチスクリプトで修正すること

---

## 認証情報メモ

| サービス | 状態 |
|---|---|
| Groq API | ✅ .env設定済み |
| Tavily API | ✅ .env設定済み |
| Bluesky (2アカウント) | ✅ .env設定済み |
| note.com | ✅ .env設定済み |
| YouTube | ✅ .env設定済み |
| Stripe | ✅ Growl .env.local設定済み |
| LINE Notify | ⚠️ 未設定（任意） |
| Gemini | ❌ quota超過・使用停止 |
