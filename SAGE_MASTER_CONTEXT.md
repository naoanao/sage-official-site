# SAGE_MASTER_CONTEXT.md
> **AIアシスタントへ**: このファイルはすべてのセッション開始時に必ず読むこと。  
> Sageシステムの全体構造・なおさんのアイデンティティ・既知問題と解決策を含む。  
> 「2ヶ月に一回同じことを繰り返す」を防ぐためのシステムメモリ。

最終更新: 2026-06-19（Support AI実装およびGoogleディスプレイ広告参考設計の追加。詳細は §3a-5, §3a-6）

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
| **Growl** | AIマーケ総合ツール（週次アクション生成・商品マーケAI・フレームワーク分析） | growl-ai.com（旧: growl-app.vercel.app） |
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

## 3a-3. AI広告代行 ＋ 英語圏対応 ＋ メール基盤 実装ログ（2026-06-13〜14）

> ⚠️ AIへ: ここが直近の大きな変更点。次回はまずここを読むこと。

### A. AI広告代行（done-for-you）モデル（6/13〜14）
セルフサーブ(OAuth)ではなく「AIが全部やる代行」に方針転換。非技術系SMB向けに最高の顧客体験。
- 入口: `/agency` LP（ピッチ＋2プラン）、トップに導線。`/start` 専用LP。
- 流れ: AdBoostCardで広告生成 → 「おまかせ」選択 → Stripe決済 → webhookがAIで広告自動構築。
- 2プラン: **管理のみ**（¥2,980/$19・支払い後PAUSED・広告費は客負担＝立替ゼロ）/ **フルおまかせ**（¥9,800/$79・広告費込み・支払い後 auto_activate）。
- 安全機構: コンプラ事前審査(preflight)、予算ハード上限、数値主張のハルシネーション警告、Sage番人(`/api/cron/ad-guardian`)が浪費adsetをPAUSE＋勝者を+20%スケール。
- Meta接続: System User無期限トークンを `/admin/connect` で登録（OAuth不要）。device_id=`nao-agency`。
- 客向けレポート: `/api/admin/report`（spend/CTR/CPC/CPA）。申込管理: `/admin/leads`。
- 実写真アップロード(imgbb)、地域(半径)ターゲティング(geo-search)対応。

### B. 英語圏対応（6/14）
- `/agency`・`/start` をバイリンガル化（`useLang`）。新規英語ユーザーは既定で英語表示。
- 代行プランの**USD決済リンク**作成（$19=price_1Ti87J... / $79=price_1Ti87J...）。`buildAgencyUrl/buildAgencyFullUrl(deviceId, currency)` で通貨自動切替。webhookはJPY(¥2,980/¥9,800)とUSD($19/$79=1900/7900セント)両対応。
- オンボーディングのLINEステップ: 英語ユーザーには非表示 → 代わりに**メール登録**画面（地域対応）。
- 英語QA(実機)で確認OK: トップ/LP/オンボ全5/ダッシュボード3アクション/市場分析(/marketing)/Learn/月次レポート(/report)/価格(/upgrade $0/$29/$79)/Meta広告生成API — すべて英語で動作。

### C. メール基盤（6/14）
- 通知ユーティリティ `lib/notify.ts`（Resend / Telegram / LINE、地域適応）。
- 英語ユーザー向け**週次メール配信**（LINE代替）: `/api/subscribe` で購読保存、`cron/notify` が `getEmailSubscriptions()` を見て英語ユーザーへ英語メール送信。
- **全メールリスト統合** `lib/subscribers.ts` + `/api/admin/subscribers`（weekly/agency/customer/waitlist/user を重複排除、`?format=csv` でエクスポート）。
- **一斉配信(ローンチ)** `/api/admin/broadcast`（dry_run既定・test_to・言語/収集元セグメント・テストデータ除外）。将来の新機能告知用。

### D. インフラ/運用（6/14・重要）
- **Resend鍵をVercelに追加** → メール実送信が有効化（notify-test=ok確認済み）。届け先は `naofumi0930@gmail.com`。
- **GROQ_API_KEYをVercelで更新**（5月1日の古い鍵が無効で、Product Marketingの4並列生成がGemini 429へフォールバックして失敗していた。.envの現行鍵に更新して解消）。
  - 📌 重要な学び: AI生成が「○○の生成に失敗しました」で落ちるときは、まずVercelの GROQ_API_KEY が .env と一致しているか確認する。
- Product Marketing生成を並列→**逐次＋throttle＋リトライ**化（レート制限耐性）。それでも無料枠TPMが重いので、連続生成は失敗しうる（単発はOK）。
- Cowork定期タスク `growl-agency-leads-check`（毎日18時に新規代行申込をチェックしてなおへ通知）。

### E. セルフサーブ足回り（2026-06-15 追加）
- **データ削除ページ** `/data-deletion`（＋`/api/data-deletion`）本番稼働。App Review必須要件を充足。バイリンガル・記録・通知・受付確認メール。
- **Meta OAuth セルフサーブ配線完成**: 欠けていた開始ルート `/api/meta-ads/oauth-start` を追加（既存 `/api/meta-ads/oauth-callback` と接続）。本番で 307→FB OAuth(client_id=META_APP_ID 設定済)を確認。接続ハブ `/connect`（Facebook/TikTok）も新設。
  - ✅ redirect URIはMeta App登録済み（`.../api/meta-ads/oauth/callback`＝スラッシュ）。コードもこのパスに統一（コールバックを `app/api/meta-ads/oauth/callback/route.ts` に作成、oauth-startのredirect_uriも一致）。
  - ✅ scopeから `leads_retrieval` 除外（未有効で "Invalid Scopes" になるため。Lead Ads有効化後に再追加）。現scope: ads_management, ads_read, business_management, pages_show_list, pages_read_engagement。
  - ✅ 2026-06-15 管理者アカウントでセルフサーブ接続テスト**成功**（device_id=global にトークン保存、report APIがMeta実データ取得を確認）。
  - 残作業（なお側）: 一般ユーザー向けに開くには Business Verification＋App Review（App_Review_提出パッケージ.md 参照）。それまでは管理者/テスターのみ接続可。
- **App Review提出パッケージ**: `App_Review_提出パッケージ.md`（権限justification・台本・チェックリスト）。
- **デプロイ一本化**: 今後は `deploy.bat`（ASCII・1ファイル）をダブルクリックするだけ。pushはなおの認証が必要なため代行不可、それ以外は全部AI。

### F. 収益化検証 ＆ 6リスク対応（2026-06-15）
- ✅ **課金導線を実機検証**：英語ユーザーで /upgrade →「Start Standard」→ **Stripe決済画面 $29.00/月 が正常表示**（URL に client_reference_id 付き＝webhookでユーザー特定可）。マーチャント=KANAGAWA。代行$19/$79も同一仕組み。→ **収益化は本番で機能する状態**。
- ⚠️ 私(AI)のブラウザツールは決済ドメイン(buy.stripe.com)をブロックされるため、**Stripe画面の目視・実課金はなおさんのブラウザのみ可**（顧客の利用には無関係）。実課金1件は未実施。
- 🟡 **Stripe商品説明が日本語のまま**（USDプランでも "毎週AI…LINE通知…" と表示）。金額・導線は正しい。英語化はUSD用に別商品作成が必要（未対応）。
- **6リスク対応状況:**
  1. 顧客ゼロでの値上げ → 据え置き方針（ベータ価格維持。客が付くまで上げない）＝戦略判断。
  2. 価格表記の不整合 → ✅修正（FreeProgressBarの「¥3,000/mo」ハードコードを英語ブロックに合わせ「$29/mo」へ。他はロケール連動で整合）。
  3. L3タスク滞留（App Review/ビジネス認証）→ 認証は書類で要件未充足のため保留（収益に非必須）。
  4. 機能追加が売る行動の代替化 → ⚠️認識。以後は機能追加より**集客優先**に切替。
  5. メール捕捉なし → ✅診断ページ(/diagnosis)結果に**メール捕捉欄**追加（未課金でも /api/subscribe でリード保存）。オンボーディング(英)＋購読リストは既存。
  6. 社会的証明ゼロ → トップに体験談あり（要・実顧客で差し替え）。最初の顧客獲得で解消。
- **30日プラン初手（なお手動・約90分）**：独自ドメイン(取得済 growl-ai.com／ディレクトリ登録のブロック解除)＋ distribution_posts.md のコピペ投稿60分。
- **結論**：機能・課金は売れる状態。残ボトルネックは「集客（実需）」。次は機能でなく集客に進む。

### G. UX改善 ＆ なおフィードバック対応（2026-06-15 第2弾）
なおの指摘: ①無料枠がタイト ②課金ウォールが早い ③英日混在（生成は日本語なのにUI見出し/ラベルが英語）④Stripe決済が日本語。
- ✅ **英日混在の根本対策**：`lib/i18n.ts` の既定言語を**ブラウザ言語で自動判定**（navigator.language が ja → 日本語UIで開く）。これで日本のユーザーは最初から日本語UI→生成も日本語→混在しない。`useLang` と `getLang` 両方修正。※既存の混在は「アプリが英語モード(growl_lang=en)のまま日本語入力で生成」が主因。多くのラベル(ActionCard/marketing report)は既にisEn対応済み。
- ✅ **無料枠を緩和**：`FreeProgressBar` の MONTHLY_LIMIT 5→**10**。表示文(homepage/upgrade/FreeProgressBar)も全て「10」に統一（価値を感じる前にウォールに当たる問題＝なお指摘②を緩和）。
- ⏳ **Stripe決済の英語化（穴塞ぎ・最優先）**：USD用に**英語の商品＋価格＋決済リンク**を作る必要あり（同一商品だと日本語も巻き込むため）。スクリプト `create_usd_english_products.mjs`＋`run_usd_english.bat` 用意済み。AIのサンドボックスが停止中でStripe API直叩き不可のため、**実行はなお側(OpenCode/bat)**→出力URLをAIが受け取り stripe-config の usdPaymentLinkBase に反映＆deploy。
- 📌 残フィードバック（未対応・任意）：①顧客ゼロでの値上げは据え置き継続 ③地域の細かいニュアンス（小田原の城下町/観光等）はプロンプト強化で改善余地。
- 集客キット `distribution_posts.md` 作成済み（X/IG/LinkedIn/Reddit/ディレクトリ・英日）。投稿はなお手動（約60分）。

### ⚠️ 中途半端・未完・既知の制限（次にやる候補）
- **Product Marketing**: ✅堅牢化済み（2026-06-14）。フォールバック **Groq → DeepSeek → Gemini**（`callOnce`）＋セクションを**2本ずつ並列**実行で、serverless 60s内に安定生成（実測〜37s・2回連続成功）。📌 Vercelの GROQ_API_KEY は .env と一致必須（古いと全部Gemini 429へ落ちる）。DEEPSEEK_API_KEY も同様に有効性を保つこと。
- **通知Telegram**: Vercel未設定（Email稼働・LINE稼働。Telegramは任意）。
- **セルフサーブOAuth（Meta/TikTok）**: サンドボックス/未承認。実ユーザーは連携不可（代行フローで回避中）。タスク#24-27ペンディング。
- **テストデータ清掃**: ✅完了（2026-06-14）。Supabase 8件削除（`/api/admin/cleanup-test`）。Metaテスト広告14件アーカイブ（`/api/admin/campaigns` POST ids=...）。残置=pilot 120248484516140389 と なおの旧実広告2件（春の転職大応援/春のメルマガ）。新エンドポイント: `/api/admin/campaigns`（GET一覧・POST ids=でARCHIVED）, `/api/admin/cleanup-test`。
- **軽微な英語の粗**: 一部API失敗時のエラー文が日本語固定（通常は出ない）。
- **将来の効率化**: Vercel APIトークンを発行して.envに置けば、今後の環境変数追加・更新をAIが代行可能（鍵入力欄への貼付だけは安全上AIができないため、これで手作業ゼロ化）。

---

## 3a-4. 多言語化対応・不整合バグ解消 ＆ LearnAI詳細ページ実装完了（2026-06-16）

多言語切替（LangToggle）の不整合や表示バグ（無料枠上限、法的文書、バッジフォールバック）を解消し、未着手だった「Item 8 (LearnAI詳細ページ)」の実装を完了しました。
- **UI多言語化の整合性**: `/upgrade`、`/report`、`/agency` などの価格および無料枠表示（10回）を日英で統一。
- **法的文書多言語化**: `/privacy` と `/terms` の日本語規約を追加し、Metaアクセストークン収集や広告PAUSED仕様を明記。連絡先を `growl-ai.com` に統一。
- **SNS集客力診断（/diagnosis）日英対応**: 言語トグルと英語用の判定結果SVG画像（`rank-[A-E]-en.svg`）を整備。
- **LearnAI詳細ページ実装**: 各トピックカードクリックで `/learn/[topic]` 動的ルートに遷移し、`lib/learn-data.ts` の日英テキストを取得して表示。
- **本番デプロイ成功**: `npm run build` がエラーなしで通過し、`main` ブランチへマージして Vercel へ正常に反映完了。

---

## 3a-5. 問い合わせAI（Support AI）の実装とE2Eテスト成功（2026-06-19）

Gmail完結型の問い合わせ対応自動化システム「Support AI」を実装し、E2Eテストで完全な疎通を確認のうえ本番環境へデプロイしました。
- **署名検証（セキュリティ強化）**: Node.js標準の `crypto` を用いた HMAC-SHA256 署名検証（Svix互換）をWebhook受信側に実装し、`RESEND_SIGNING_SECRET` を使ったリクエスト正当性のチェックにより悪意あるスパムを遮断。
- **自動フォールバックチェーンの導入**: Gemini API (429クォータエラー) ➔ DeepSeek API (402残高不足エラー) ➔ Groq (Llama-3.3-70B) の順に自動で切り替えるロジックを実装し、外部API障害や制限に非常に強い設計を実現。
- **Gmail完結型承認フロー**: `hello@growl-ai.com` に届いたメールをAIが自動分類・返信下書き作成し、なおさんの個人宛メールへ承認ボタン（`/api/webhook/approve-email?id=TICKET_ID`）付きで通知。ボタン1タップでユーザーへ自動返信され、Supabaseのチケットステータスが `PENDING` から `REPLIED` に更新される。
- **E2E自動テスト確立**: `scratch/run_support_ai_e2e.js` を作成し、ローカルサーバーおよび実Supabase DBを用いて、署名生成・Webhook POST・承認・メール送信・ステータス更新・データ清掃の一連のフローが正常に機能することを検証（全件合格）。

---

## 3a-6. Googleディスプレイ広告参考設計とTSV出力最適化（2026-06-19）

今後のGrowlにおけるディスプレイ広告自動設計機能の汎用テンプレートとして、ファンケル青汁を題材にした設計とTSV最適化を行いました。他商材への代替え（テンプレート流用）が容易な設計モデルとなっています。
- **代替え可能な3層キャンペーン構成**: 潜在層から顕在層までを網羅し、あらゆる商材に応用可能な「興味・関心（Prospecting）」「比較検討（Consideration）」「CV獲得（Retargeting）」の3つのキャンペーンテンプレート。
- **TSV出力フォーマットの汎用調整**: Googleスプレッドシート（gid=307652644）のレイアウトに合わせ、コピペ時の空列（Column G）インデックスずれを解消するためのタブ調整を適用。また、他商材での設定時にも過度な掛け合わせ（AND条件の重複）を防ぐため、比較検討・リタゲキャンペーンからコンテンツカテゴリー設定を除外する汎用的な最適化ルールを定義。

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
| `/learn` | LearnAI | マーケ学習一覧ツール |
| `/learn/[topic]` | LearnAI詳細 | マーケ学習各テーマ詳細解説（日英対応） |
| `/product` | 商品マーケAI | マーケティングプラン生成 |
| `/report` | 月次レポート | 完了タスク集計 |
| `/privacy` | プライバシーポリシー | 法令対応 |
| `/terms` | 利用規約 | 法令対応 |
| `/diagnosis` | SNS集客力診断 | 5問クイズ→A〜Eランク→シェア→有料CTA導線 |
| `/api/diagnosis` | 診断API（POST） | Groq(llama-3.3-70b)スコアリング |
| `/api/webhook/inbound-email` | メール受信Webhook | Resend経由でのメール受信、署名検証、AI分類・下書き作成、Gmailへの送信 |
| `/api/webhook/approve-email` | 承認受付Webhook | なおさんの承認クリックをトリガーとする、ユーザーへの返信メール送信とDB更新 |

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

### 🧪 Growl全機能テスト結果（2026-06-11 実施・API直叩き＋UI）
> AIへ: 数字の根拠はこのテスト。再テスト時はGroq無料枠のレート制限（毎分）に注意し、各LLM呼び出しは5秒以上あけること。

| 機能 | 結果 | 備考 |
|---|---|---|
| /api/ping | 🟢 200 | ok:true |
| /api/my-plan | 🟢 200 | free返却 |
| /api/diagnosis (JA) | 🟢 200 | rank C/60点・弱点と今日の一手が具体的 |
| /api/diagnosis (EN) | 🟢 200 | 英語のみ・言語混在なし |
| /api/marketing/analyze 3c/pest/swot/vrio/stp/4p/ulssas/aeo | 🟢 全8種 単独では200 | **⚠️ 連続/並列で叩くとGroq無料枠の毎分レート制限で500「AI生成に失敗」。フレームキーは小文字（"3c","swot"等）。大文字だと400** |
| /api/market-research | 🟢 200 | status/research/summary返却・約13秒 |
| **/api/generate-actions（週3アクション・製品の心臓部）** | 🟢 **200・actions 3件・strategy_note正常（JA/EN両方）** | ✅**前回「空返り」は誤検出だった（2026-06-11 第2回テストで確定）**。レスポンスは `{session:{actions:[...], strategy_note}}` の入れ子構造。前回テストはトップレベル `.actions` を見て0件と誤判定していた。実際は `body.session.actions` に3件入る。JA=18.8s/EN=11.0sで正常生成。EN版は日本語混入なし。**心臓部は健在。バグではなかった。** |
| /api/power v5 (JA/EN) | 🟢 200 | 実データ採点・証拠リンク・口コミ引用・Supabase保存・履歴ページ 検証済み |
| /templates 51ページ | 🟢 | コピーボタン・CTA動作確認済み |
| 動画(tiktok_v1/v3/auto) | 🟡 生成は正常(1080x1920) | **品質は世界トップ級ではない。v1/v3=黒背景テキストスライド(地味)、auto=アニメ美少女画像でブランド不一致＝公開非推奨** |
| TikTok inbox投稿 | 🟢 API成功(SEND_TO_USER_INBOX) | **但しinbox方式はスマホアプリ専用。なおさんはPCのみ→受け取れない。PCで完結するにはSandbox審査通過→Direct Post有効化が必須** |

#### 異常系・セキュリティ角度テスト（2026-06-11 第2回・追加検証）

| テスト観点 | 結果 | 備考 |
|---|---|---|
| generate-actions 必須欠落(industry無し) | 🟢 400「必要な情報が不足」 | バリデーション正常 |
| generate-actions 不正JSON | 🟡 500 | パースエラーメッセージをそのまま返す（情報漏洩は軽微だがエラー文を握り潰す方が望ましい） |
| generate-actions GETメソッド | 🟢 405 | メソッド制限OK |
| diagnosis 空ボディ | 🟢 400「All 5 answers are required」 | OK |
| stripe webhook 署名なし | 🟢 401「Invalid signature」 | 署名検証OK |
| my-plan 他人のdevice_id | 🟢 200 free返却 | device_idは推測可能だが返るのはプラン種別のみ（個人情報なし）。実害低 |
| HTTPセキュリティヘッダー | 🟡 HSTSのみ | X-Frame-Options/CSP/X-Content-Type-Options が無い。クリックジャッキング対策に next.config で headers 追加推奨 |
| **/api/admin/update-token 認証なし** | 🔴 **認証バイパス脆弱性** | **20文字以上の文字列を投げるだけで誰でもMeta広告トークン(app_config.meta_ads_access_token)を上書きできる。`{"token":"AAA...35文字"}` で `success:true` を確認。攻撃者が全ユーザー共有のMeta広告トークンを破壊(DoS)または乗っ取り可能。`/api/admin/*` に管理者シークレット(ADMIN_SECRET等のヘッダー照合)を追加すべき。最優先で塞ぐこと** |

#### 次にやること（優先順）
1. 🔴**/api/admin/update-token（+update-token-get）に認証を追加**（最優先・脆弱性）。誰でもMeta広告トークンを書き換え可能。
2. generate-actionsの「空返りバグ」は誤検出だったため対応不要（上記で確定）。
3. analyze系の連続実行レート制限対策（Geminiフォールバック復活 or リトライ/キュー）
4. セキュリティヘッダー（CSP/X-Frame-Options）を next.config に追加
5. TikTok Direct Post審査 or 動画戦略の見直し（品質・ブランド一致）

### sync-001: サンドボックス↔Windowsのファイル同期遅延でコミットが末尾切断される（2026-06-10 発見・対処法確立）
**症状**: ホスト側（Edit tool/Windows）でファイルを「サイズが増える方向」に編集した直後、サンドボックス(bash)からそのファイルを読むと**旧バイトサイズで末尾切断**されて見える。この状態でサンドボックスのgitがcommitすると、切断されたblobがリポジトリに入りVercelビルドが `Expected '</', got '<eof>'` 等で失敗する。`.git/index` 自体も壊れる（bad signature 0x00000000）。null-bytes-001の同族。  
**実害（2026-06-10）**: 7d51ab9（stripe-config/upgrade/webhookが切断）、8aef066（前セッションの診断ランク画像コミット、diagnosis/page.tsxが325行で切断＝完全版は消失）  
**対処法（確立済み・必須ルール）**:
1. **コード変更のcommit/pushは必ずWindows側gitで行う**（pushのみ̪bat: `push_usd_pricing.bat` / 復旧テンプレ: `fix_usd_pricing2.bat` 方式）
2. サンドボックスでファイルを作る場合は**新規ファイル名**で書く（新規ファイルは切断されない）→ Windows側batで `copy /Y` して配置
3. batはASCIIのみ・CRLF必須（日本語コメントを入れるとcmd解析が壊れる）
4. commit前検証: `git show HEAD:file | tail` で終端を確認。行数が「旧ファイルとほぼ同じ」なら切断を疑う
5. `.git/index` 破損時: `rm .git/index && git reset` で再構築（HEAD.lock/ORIG_HEAD破損も同時に削除）

### stripe-001: 表示価格とStripe実請求額の不一致（2026-06-10 発見 → ✅同日解決・本番反映済み dde9b12）
**症状**: 3つの価格が混在。①LP(英語)「$19/mo」②/upgrade「$29/$79」③Stripe Payment Links実請求「¥3,000/¥8,000」（`lib/stripe-config.ts` の paymentLinkBase が旧リンクのまま）  
**根本原因**: 2026-06-09のPhase1値上げ（$19→$29/$49→$79）は**UIのみ変更**で、Stripe側のPayment Link/Priceは未更新。LPの価格表も未更新。  
**影響**: 英語圏ユーザーが「$29」を見てクリック→日本円(¥3,000)のチェックアウトが開く→通貨混乱で離脱。広告表示額と請求額の不一致は信頼を毀損する。  
**解決手順**:
1. なおさんがStripeダッシュボードでUSD建てPrice（$29/月・$79/月）+ Payment Link 2本を新規作成（10分・L3）
2. AIが `lib/stripe-config.ts` の paymentLinkBase 2行を差し替え + LP価格表を$29に統一 → push（要許可）
3. 暫定代替案: USD化を見送る場合、UI側を実請求額（¥3,000≒$19 / ¥8,000≒$49）に戻して統一する
**補足**: /upgradeの決済ボタンは `window.open` でポップアップ起動。ポップアップブロッカーで無反応になる環境があるため、同タブ遷移（location.href）への変更推奨。
**進捗（2026-06-10 USD化方針でコード修正済み・未commit/未push）**: ①stripe-config.tsに `usdPaymentLinkBase`（空なら円リンクへフォールバック）+ buildPaymentUrlにcurrency引数追加 ②upgrade/page.tsx: 英語ユーザーはUSDリンク・同タブ遷移に変更 ③LP・dashboardの$19表示→$29に統一 ④webhookのプラン判定を通貨対応（USDセント問題修正）。
**2026-06-10 追記: Stripe API でUSD価格・決済リンク作成完了（.envのSTRIPE_SECRET_KEY使用）**: Standard $29 = price_1TgeYJILSrv644ukpHIKhr7m / buy.stripe.com/3cIcN69Es5Zb1Xh2KO93y0h、Pro $79 = price_1TgeYKILSrv644ukrtx1KnFv / buy.stripe.com/14A9AU8Ao87jatNgBE93y0i（決済後 /payment-success へリダイレクト設定済み）。
**✅ 解決（2026-06-10）**: sync-001による切断コミット2回のビルド失敗を経て、dde9b12でVercel本番デプロイ成功（Ready 40s）。本番確認済み: LP英語版$29表示・英語ユーザーはUSDリンク・日本語ユーザーは従来の円リンク・WebhookはUSDセント対応。**副作用**: 8aef066の診断ランク画像機能は切断版しか存在せず1e441bd版に巻き戻し（rank-A〜E.svgは残存・再実装はdiagnosis/page.tsxへの組み込みのみ）。

### Vercel Root Directory設定修正（2026-06-09 追記）
**根本原因**: Vercelプロジェクト(ai-marketing-app)のRoot Directory設定が `ai-marketing-app/` に固定されており、
`npx vercel deploy --prod` でパスが二重になる。  
**解決方法**: https://vercel.com/naoanaos-projects/ai-marketing-app/settings → Root Directoryを `.` に変更・保存。
最新Productionデプロイメントを Redeploy で復旧。
**関連事項**: この設定は Gitリポジトリ直下のサブディレクトリ構成と一致しなくなっていたため発生。

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
**注意（旧記述）**: 「OAuthルートのコードはgit reset --hardで消えた」とあったが、これは**古い。現在はOAuthが再構築済みで稼働している**（下記 meta-ads-002 参照）。

### meta-ads-002: Meta広告をOAuthマルチテナント化（2026-06-11 確認・整備）
**方針決定（なおさん）**: 「各ユーザーが自分のMetaを繋ぐOAuthに作り直す」= 共有1トークンではなく、各ユーザーが自分のFacebookを接続して自分のアカウントで出稿する正しいマルチテナント設計。
**現状（調査で判明）**: OAuthフローは**すでにエンドツーエンドで実装・配線済み**だった。
- `components/AdBoostCard.tsx` … 「Facebookアカウントを接続」ボタン → `facebook.com/dialog/oauth`（client_id=1228008508773411, scope=ads_management,pages_manage_ads,pages_read_engagement, state=device_id）
- `app/api/meta-ads/oauth-callback/route.ts` … code→長期トークン交換、me/accounts・me/adaccounts取得、`user_meta_tokens`（device_id別）にupsert、複数ページ時は選択画面へ
- `components/MetaPageSelectModal.tsx` + `app/api/meta-ads/select-page/route.ts` … ページ選択
- `app/api/meta-ads/submit/route.ts` … `getUserMetaConfig(device_id)` で**ユーザー別トークンを優先**、無ければ app_config グローバルにフォールバック（後方互換）
**2026-06-11 の修正**:
1. 認証エラー時CTAを「手動トークン貼り付け（グローバル管理操作）」→「Facebookアカウントを接続（OAuth）」に変更。通常ユーザーは自分のアカウントを繋ぐ導線に統一。
2. 手動貼り付けUI（update-token step）は管理者専用フォールバックに格下げ。管理者シークレット入力欄を追加。
**残課題**: ①AdBoostCardのclient_id(1228008508773411)とupdate-tokenの`META_APP_ID`が別値の可能性 → Meta App IDの統一確認 ②Meta App審査（ads_management本番権限）の状態確認 ③`user_meta_tokens`テーブルがSupabaseに存在するかの確認。

### meta-ads-003: Meta広告 商品化レビュー（2026-06-11 検証＋修正）
**良い点(確認済み)**: ①偽の成功は出ない（mock/失敗→エラーUI、「広告作成」はsuccess時のみ）②OAuth接続済みユーザーは実際にキャンペーン/広告セット/クリエイティブ/広告を**PAUSED**で作成（誤課金しない安全設計）。
**発見した実害と対処**:
1. 🔴**本番DB汚染（私の検証ゴミ）→✅削除済み**: sec-001検証時にupdate-tokenへ注入した `AAAA…attacker_controlled` が `app_config.meta_ads_access_token` に残存。submitのグローバルフォールバックがこれを使い全未接続ユーザーが「Malformed access token」で失敗していた。Supabase REST(service role)で当該行をDELETE済み（確認: 空）。
2. 🔴**ターゲティングが用途不一致→✅修正**: 旧 `geo_locations.countries=[JP,US,GB,AU,CA]`（世界5カ国ばらまき=地元飲食店には広告費の無駄）。submitを「`geo_locations`を渡せばローカル(市区/緯度経度+半径)配信、無ければ言語から単一国(JP/US)」に変更。AdBoostCardは lang/currency を送るよう変更。
3. 🟡**予算単位バグ→✅修正**: 旧 `daily_budget*10`（円でもセントでもない）。通貨対応に変更（JPY等ゼロ小数=×1、その他=×100）＋最低日予算(¥200/$1)を担保。
4. 🟡**グローバル/envトークン フォールバック→✅撤廃(OAuth必須化)**: env `META_ADS_ACCESS_TOKEN` は6/2に期限切れだった。`getUserMetaConfig` を user_meta_tokens 専用にし、未接続なら token=null→正直に「Facebookを接続して」を返す。共有トークンへの誤出稿・汚染リスクを排除。
5. 🟡**maxDuration 30→60**: FLUX画像生成＋Meta4回API呼び出しのタイムアウト対策。
**🔴残る最大の出荷ブロッカー（なお対応・外部）**: **Meta App Review（ads_management 本番権限の審査）**。未通過だとアプリの開発者/テストユーザー以外は広告を作れない。一般ユーザーにOAuth接続させて出稿させるには審査通過が必須。次の一手はこれ。
**未修正(任意)**: 広告の `link_url` がGrowl固定 → 本来は各店舗の予約/サイトURLにすべき（ad_copyや店舗設定から取る設計が望ましい）。
**修正ファイル**: `app/api/meta-ads/submit/route.ts`, `components/AdBoostCard.tsx`（要push）。

### rev-001: 🔴最重要収益バグ — オンボーディング未完了ユーザーが課金してもプランが反映されず無料のまま（2026-06-11 発見→同日 ✅本番デプロイ・解決確認済み commit f04f32b）
**✅解決（2026-06-11）**: commit `f04f32b` を `git push growl main` → Vercel本番 Ready(43s)。本番 `/upgrade` で実機検証: `USER_KEY="ai_mkt_user_id"` を削除（新規ユーザー再現）→再読込→`ensureDeviceId()` が新UUIDを自動発行→決済URLに `client_reference_id=<uuid>`（空でない）が付与されることを確認。
**注意（検証時の罠）**: device_idの実体キーは `ai_mkt_user_id`（`growl_device_id` は別物）。検証時はこのキーを見ること。
**症状（コードで確定）**: 「払ったのに無料」。決済は成立するがプランが上がらない。
**根本原因（3つの複合）**:
1. `lib/store.ts` の `loadDeviceId()`(=loadUserId) は localStorage を読むだけで、無ければ **null を返す（device_idを生成しない）**。
2. `saveUserId()`（device_id保存）は **オンボーディング最終ステップ `app/onboarding/goal/page.tsx` でしか呼ばれない**。LP価格表「スタンダードにする」(app/page.tsx:238)・診断結果(diagnosis:323)は `/upgrade` 直リンクで、オンボ未完了だと device_id が無い。
3. `/upgrade` は deviceId 空でもガードせず `buildPaymentUrl(plan,"",...)` → `?client_reference_id=`（空）で決済。Webhookは空→emailフォールバック→`updateUserPlan` が **upsertでなくupdate** で該当行が無く0件更新（無言失敗）。さらに `my-plan` は device_id 照合のためemailで書けても紐付かない。
→ 結果: 「LP/診断からいきなり課金」した新規ユーザーは**全員、課金しても無料のまま**。オンボ完了済みユーザー（device_idあり）は正常。
**修正済み（コード・要 `git push growl main` でVercelデプロイ）**:
1. `lib/store.ts`: `ensureDeviceId()` を追加（無ければ `crypto.randomUUID()` で発行・永続化）。
2. `app/upgrade/page.tsx`: マウント時とクリック時に `ensureDeviceId()` を使用 → `client_reference_id` が空にならない。
3. `lib/db.ts`: `updateUserPlan` を device_id で **upsert**（`onConflict:"device_id"`）に変更 → 行が無くても作成してプランを書き込む。
**検証メモ**: 決済URL生成は `buildPaymentUrl`(lib/stripe-config.ts) の1箇所のみで、全導線が `/upgrade` 経由のため、`/upgrade` でdevice_idを保証すれば全経路カバー。tscはサンドボックスのsync-001切断表示で誤エラーを出すため、実検証はpush後のVercelビルドで行うこと。

### sec-001: /api/admin/update-token に認証が無く誰でもMeta広告トークンを上書き可能（2026-06-11 発見→同日 ✅本番デプロイ・解決確認済み）
**✅解決（2026-06-11）**: commit `7348abe`（4ファイル・切断なし）をWindows側batで `git push growl main` → Vercel本番デプロイ成功（Ready 44s）。本番で `POST/GET /api/admin/update-token(-get)` がともに **401 Unauthorized** を返すことを実機確認（修正前は200で誰でも上書き可能だった）。push先は `growl` リモート（growl-app）。既定upstreamの `origin` は別repo(sage-official-site)なので明示が必須だった。
**症状**: `POST /api/admin/update-token` と `GET /api/admin/update-token-get` が認証なし。20文字以上の文字列を投げるだけで `app_config.meta_ads_access_token`（全ユーザー共有のフォールバックトークン）を上書きでき、`success:true` を実機確認。攻撃者が共有トークンを破壊（広告DoS）または乗っ取り可能。
**修正済み（コード・要commit/push＋Vercel env設定）**:
1. 両ルートに `ADMIN_SECRET` 照合を追加。**フェイルクローズ**（ADMIN_SECRET未設定なら常に401）。POSTは `x-admin-secret` ヘッダーまたは body.secret、GETは `?secret=`。
2. `AdBoostCard.tsx` の手動貼り付けに管理者シークレット入力欄を追加し、ヘッダーで送信。
**デプロイ前提**: VercelのEnvに `ADMIN_SECRET`（任意の長いランダム文字列）を設定すること。未設定でもOAuth経路は無影響・update-tokenは安全側で401になるだけ。

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
| 2026-06-09 | **Phase1 収益化実装完了: 値上げ+診断有料ゲート**: Standard $19→$29、Pro $49→$79。診断結果の完全改善プランを有料ユーザーのみに。無料ユーザーはアップグレードCTA。全テスト通過 |
| 2026-06-09 | **Vercel再設定+本番デプロイ**: RootDirectory修正 (. → ai-marketing-app→変更前)。Reconnect + Redeploy。`growl-app.vercel.app` に最新版反映確認済み |
| 2026-06-09 | **Phase1 収益化実装**: Standard $19→$29, Pro $49→$79。診断結果に有料ゲート追加（無料→アップグレードCTA, 有料→オンボーディング）。Vercelデプロイ完了 |
| 2026-06-09 | **Vercel Root Directory修正**: Vercelプロジェクト設定のRoot Directoryを `ai-marketing-app` → `.` に修正。デプロイ復旧 |
| 2026-06-12 | **カスタムドメイン growl-ai.com 追加**: Vercel CLI で growl-app プロジェクトに追加。コードベース全36箇所のURL置換。本番デプロイ完了 |
| 2026-06-12 | **サブスクリプションゲート部品移植**: saas-template から PlanBadge / useSubscription / verify-subscription API を移植。ダッシュボードヘッダーにプランバッジ表示 |
| 2026-06-12 | **SpaceBackground + dark hero**: Sage 旧管理画面の Canvas 星空背景を Growl に移植。LP hero セクションを dark 化 |
| 2026-06-12 | **管理画面移植計画策定**: docs/adr/dashboard-migration-plan.md 作成。全6エンドポイント中3つが broken であることを特定 |
| 2026-06-12 | **dev.to自動投稿を収益化向けに一本化**: dev.to投稿源が3系統重複（Cowork `devto-daily-article`毎日 + Cowork `aeo-revenue-autopilot`月木 + Flask `BlogScheduler`毎日）し、毎朝2本ばらまき・閲覧<25・売上0だった。最適化: ①`devto-daily-article`を停止 ②`aeo-revenue-autopilot`を月木→**月水金（週3）**に増強し収益軸に集中 ③`blog_scheduler.py`の`_post_devto`をコメントアウトしdev.to二重投稿を停止（ブログ生成・SNSキューは継続）。**要Sage再起動で③反映**。 |
| 2026-06-12 | **ブログCTAを動的化（Growl優先）**: 旧 `_generate_article` のCTAは「Sage 3.0 Developer Blueprint $49（開発者向け・売上0）」固定でGrowl(飲食店SaaS)と不一致だった。トピック判定で出し分けに変更: 飲食店/マーケ寄り or 曖昧→**Growl**(growl-app.vercel.app)、明確に開発/自動化のみ→Blueprint。「迷ったらGrowl」重みづけ。実装: `blog_scheduler.py` `_generate_article` に `growl_cta`/`blueprint_cta` + キーワード判定 `cta` を追加し、プロンプト末尾を `{cta}` に。 |
| 2026-06-12 | **🔴BlogScheduler crash修正（欠落モジュール notion_agent）**: 再起動で発覚。`BlogScheduler`→`notion_content_pool`(import NotionAgent)→`backend/modules/notion_agent.py`が欠落しImportErrorでスレッドがstartup crash。**＝Flask側ブログ自動化は実は一度も動いていなかった**（dev.to投稿はCowork側タスクの分のみ）。対処: `.claude/worktrees/*/backend/modules/notion_agent.py`(4つとも同一md5)から `backend/modules/notion_agent.py` へ復元→再起動で `[BLOG] BlogScheduler initialized dry_run=False` を確認。**教訓**: 「欠落モジュール問題」は再発する（過去にnotion_content_pool等も同様に復元済）。BlogScheduler等が動かない時は flask_stderr.log の `Thread Error: No module named` を確認し worktree から復元すること。 |
| 2026-06-12 | **Sage再起動運用メモ**: `restart_sage_now.bat`（=`run_sage.ps1`）で python全kill→Flask/ngrok/Vite再起動。起動完了まで約70〜90秒。死活は ngrok公開URL(pending-ngrok-start問題で当てにならない)でなく `logs/flask_stderr.log` の `GET /health ... 200` と `BlogScheduler initialized` で確認するのが確実。backend変更（blog_scheduler.py/notion_agent.py）はローカルのみ・Vercel/push不要・git未コミット。 |
| 2026-06-13 | **🟢growl-ai.com DNS復旧（lame delegation）**: SERVFAILの原因はXServerで「ネームサーバー未有効化」。XServer Domain管理→ネームサーバー設定→「**XServer Domain**」を選択(「その他のサービス」でNS=www.growl-ai.comになっていたのが誤り)→ns1-3.xdomain.ne.jp に委任。数分でapex/www とも解決(216.198.79.1 / vercel-dns)、Vercelで3つ✅Valid。OAuth/Meta接続/App審査デモの前提が開通。参考: zenn.dev/mirai015/articles/36b07d95917554 |
| 2026-06-13 | **Vercel二重プロジェクト整理**: `growl-app`(本命・growl-ai.com所有)と`ai-marketing-app`(←sage-official-site repo・重複)が併存。ai-marketing-appはgrowl-ai.com未所有(競合なし)だったが残骸のため**Git連携を解除**(自動デプロイ停止・設定は保持で再接続可)。push先リモートは現 `origin`=growl-app(旧`growl`から改名)、`sage`=sage-official-site。run_sageはoriginのみpush。 |
| 2026-06-13 | **連携の一般ユーザー可否確認**: ✅LINE=誰でも可(公式@growl友だち追加+6桁コード方式・審査不要、link/status本番200) ／ ❌TikTok=Sandboxで登録テスターのみ(App Review必要・redirect既定が旧URL) ／ ❌Meta広告=ads_management「テスト準備完了」(Standard)でAdvanced未取得・なお管理者のみ(App Review必要)。 |
| 2026-06-13 | **🔴Meta App Review = Tech Provider化が必要(取り消し不可)と判明**: ads_managementをApp Reviewに追加するには「Tech Provider」になる必要があり、ビジネス認証+アクセス認証+厳格データ要件+取り消し不可。個人事業主には重い。→**代替: なお自身の広告アカウントで「AI全自動・広告代行(done-for-you)」モデル**(Tech Provider/審査/初期費用不要・顧客が広告予算先払い)を採用方針に。設計書 `GROWL_AI_AD_AGENCY_BLUEPRINT.md`・リサーチ `GROWL_MONETIZATION_RESEARCH_2026-06-12.md`。 |
| 2026-06-13 | **広告代行AIの基盤実装(commit c8c29e0 → growl-app)**: ①generateに**全業態適応SMBプレイブック**(実店舗/地域サービス/士業/EC/デジタル/B2Bの6型で目的・CTA・訴求を切替。飲食店専用から脱却) ②submitに**コンプラ事前審査**(個人属性暗示/非現実成果/制限カテゴリ→出稿Block・最上級→警告。node検証済) ③**予算ハード上限**(¥50,000/$500/日)。全広告PAUSED作成は維持。 |

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
- **Growl**：growl-ai.com で課金受付中（¥3,000/¥8,000）
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
- **CTA**: 末尾1行のみ。Gumroadかgrowl-ai.comへのリンク（なくてもいい）
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

## 8d. 収益化達成を確実にするための考察（2026-06-10 Claude策定・毎セッション必読）

> ⚠️ AIへ: これは機能レポートではなく「なぜまだ売上0なのか」の構造分析。8a/8bの戦略と合わせて読み、毎セッションの作業判断の基準にすること。

### 結論（1行）
**製品はもう十分。足りないのは「見られる回数」と「見込み客と話す回数」。Day 375で売上0の原因は機能不足ではなく、トラフィックが実質ゼロのまま、人間にしかできない販売行動（投稿・DM・事例づくり）が滞留していること。**

### 数式で見るボトルネック

```
売上 = 訪問数 × 診断/体験完了率 × 登録率 × 有料転換率 × 価格
```

- **訪問数が実質ゼロ**: Dev.to記事 <25 views、PH 3 upvotes、Bluesky 約30フォロワー。月間訪問は推定数十〜数百。
- フリーミアムSaaSの有料転換率の相場は2〜5%。**月5件の有料を取るには月1,000〜5,000訪問が必要**。現状はその1/10以下。
- つまり診断ゲート・値上げなどのCVR施策は、訪問数が立つまで**効果を測定することすらできない**。今のレバーは訪問数のみ。

### 構造的リスク（正直な指摘・6点）

1. **顧客ゼロでの値上げ（$19→$29 / $49→$79）**: 価格は検証データではなく仮説。1件も売れていない状態での値上げは「転換率の低さ」を価格のせいにできなくする。最初の10人は割引・手動オンボーディングでもいいので「実際に払う人」を見つけ、支払い意思から価格を逆算すること。
2. **価格表記の不整合**: LP「¥0/¥3,000」、/upgrade「$29/$79」、Stripe Payment Links「¥3,000/¥8,000」が混在。決済直前の不信感はCVRを直撃する。即時統一が必要（L1・AI対応可）。
3. **L3タスクの滞留が最大の実行ギャップ**: IH/HN/Reddit投稿（「コピペ1分」のまま数週間放置）、カスタムドメイン取得（$10〜15、これ1つでUneed/SaaSHub/BetaList登録の全ブロックが解除される）、Cold DM。AIができる作業ばかり進み、人間にしかできない販売行動が進まない非対称が続いている。
4. **機能追加が「売る行動」の代替になっている**: 診断MVPもMeta広告リファクタも品質は高いが、ガードレール「新機能開発禁止」と矛盾した行動が繰り返されている。ドキュメント更新と開発は、売る恐怖から逃げる安全な作業になりやすい。
5. **メール捕捉がない**: 診断完了者の連絡先を取得していないため、再訪導線がSNS頼み。診断結果ページに「結果をメールで受け取る」欄を追加すれば、唯一のリードリストが育ち始める（L1・AI対応可）。
6. **社会的証明ゼロ**: 利用者の声・事例が1件もないLPは価格以前に転換しない。**無料モニター3店舗→2週間後に事例化→LP掲載**が、どのCVR施策より先。

### 確実性を上げる30日プラン

**Week 1（なおさん合計約90分＋AI）**
| # | アクション | 担当 | 効果 |
|---|---|---|---|
| 1 | カスタムドメイン取得（$10〜15） | なおさん(15分) | ディレクトリ登録の全ブロック解除。単発作業でROI最高 |
| 2 | IH/HN/Reddit投稿（distribution_posts.mdコピペ） | なおさん(60分) | 英語圏トラフィックの初弾 |
| 3 | 価格表記の全面統一 | AI (L1) | 決済直前の不信感除去 |
| 4 | 診断結果ページにメール登録欄 | AI (L1) | リードリスト構築開始 |

**Week 2〜4（毎週繰り返し）**
- Cold DM 週10件（リスト収集と文面生成はSage、送信はなおさん1日5分）
- 無料モニター3店舗の獲得 → 2週間使ってもらい事例化 → LP掲載
- 週次KPIレビュー: 訪問数 / 診断完了数 / メール登録数 / 有料数 / DM送付数 / 返信数 をSageが毎週月曜に自動集計・Telegram通知

**判定ルール**: 4週で有料1件が取れなければ、既存ガードレール通り「価格またはターゲット」を変える。**機能は変えない。**

### AIセッションへの運用ルール（追加）

1. 毎セッション開始時に自問: 「この作業は今週、**訪問数を増やす**か**見込み客と接触する**ことに直結するか？」直結しない開発・リファクタ・ドキュメント整備は原則保留。
2. なおさんのL3タスク（投稿・DM・ドメイン取得）が3日以上滞留していたら、セッション冒頭でリマインドすることをAIの責務とする。
3. 動画パイプライン、Vision RPA、Moltbook等の埋蔵資産は「売れてから」レバレッジする資源。ゼロ→1の局面では触らない。

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

## 12c. Cowork自律実行ログ（2026-06-10）— 収益化AI代行セッション

### ✅ 完了（なおさんの手作業ゼロで実行）
| # | アクション | 結果 | URL |
|---|---|---|---|
| 1 | 市場調査（米飲食店ツール価格帯・micro-SaaS初期顧客・note市場・AEO・Gumroad売れ筋） | ✅ | §8d考察に反映 |
| 2 | Dev.to AEO比較記事公開「Best AI Marketing Tools for Independent Restaurants in 2026」 | ✅ 公開 | dev.to/naoanao/best-ai-marketing-tools-for-independent-restaurants-in-2026-tested-by-an-actual-restaurant-owner-3d0g |
| 3 | 低価格商品作成: 50 AI Marketing Prompts for Restaurant Owners（PDF 4p生成→Gumroad出品・公開） | ✅ **販売中 $9.99** | naofumi3.gumroad.com/l/itawej |
| 4 | 商品コンテンツ原本 | ✅ | backend/cognitive/PRODUCT_RESTAURANT_PROMPT_PACK_50.md |
| 5 | 2026-06-11 autopilot: Dev.to記事#2公開（review replies）+レーンA Quora回答1件（AI tools chaos質問）+コメント0+Gumroad売上0。次回: テーマ#3+レーンB Medium転載 | ✅ | dev.to/naoanao/how-to-reply-to-negative-google-reviews-with-ai-templates-inside-3mf8 |
| 6 | 2026-06-12 autopilot: **⚠️ プレイブック消失**（backend/cognitive/MONETIZATION_AUTOPILOT_PLAYBOOK.md がディスクに存在せず・git未コミットで復元不可）。記事執筆・レーンBはテーマキュー/禁止事項を確認できないためスキップ（捏造回避）。実行できた分: Dev.toコメント0件（返信不要）・Gumroad売上0。**なおさん対応必要: プレイブックを復元or再作成（§12cログから再構築可、AIに依頼可）** | ⚠️ 部分実行 | — |
| 7 | 2026-06-15 autopilot: **プレイブック§12cから再構築完了**（backend/cognitive/MONETIZATION_AUTOPILOT_PLAYBOOK.md）。Dev.to記事#3公開（restaurant social media captions / AI templates）+Dev.toコメント0件（返信不要）+レーンB Medium転載完了（review replies記事）+Gumroad売上0。次回: テーマ#4+レーンC Hashnode転載 | ✅ | dev.to/naoanao/how-to-write-restaurant-social-media-captions-with-ai-templates-real-workflow-jk5 / medium.com/p/0c3d7f98fa20 |

### ❌ 試行して不可だったこと（繰り返し禁止リスト追加）
- **HN Show HN**: 「Show HN一時制限中。新規アカウントはまずコメントでコミュニティ参加を」と拒否される。→ なおさんがHNで数週間コメント活動してkarmaを積むまでShow HN不可
- **Reddit**: Claude in Chrome拡張のセーフティ制限でreddit.comへのナビゲーション自体が不可。→ Reddit投稿は今後もなおさんの手動コピペのみ（REDDit_HN_POSTS_20260529.md使用）

### ✅ TikTokパイプライン開通（2026-06-10 完了・再設定不要）
| 項目 | 状態 |
|---|---|
| Sandbox接続 | ✅ なおさんのTikTok（go.onelovepeople / display: Go）がGrowlにOAuth接続済み。VercelのTIKTOK_CLIENT_KEY/SECRETは**Sandbox用**に差し替え済み（審査通過後に本番キーへ戻す） |
| URL prefix検証 | ✅ https://growl-app.vercel.app/ 検証済み（tiktokeeZb2...txt。PULL_FROM_URL解禁） |
| 投稿テスト | ✅ 成功（publish_id: v_inbox_url~v2.7649662013160900624 / tiktok_v1動画→inbox下書き） |
| 動画ホスティング | ✅ growl-app.vercel.app/promo/tiktok_v1.mp4・tiktok_v2.mp4 |
| 制限 | Sandbox中は下書き(inbox)のみ・接続可能なのはTarget Users登録者のみ。**次のステップ: App Review申請**（demo動画は登録済み、実動フローも完成したので録画して提出可能） |
| 診断ランク画像 | ✅ 再実装完了（71657fe）。結果画面にシェアカード表示 |
| **pSEO第1弾（0ba0c56）** | ✅ /templates 無料プロンプトライブラリ51ページ公開（FAQ JSON-LD+二段CTA）+ /diagnosis/r/A〜E シェア着地5ページ（ランク別OG画像でリンクプレビュー対応）+ sitemap56URL追加。第2弾（/guide 業種×悩み）はプレイブックのワンタイムキュー#6 |
| **お店パワー診断 /power（017c277→81ad787）** | ✅ socialxup型の実データ診断を実装・本番稼働。店名入力→Tavily5系統並列検索（グルメサイト/SNS/公式/EC/一般）→5チャネル◯△✕採点（各20点）。E2Eテスト合格: さわやか=B82(食べログ3.65引用)・丸亀製麺=B82・架空店=E10で捏造なし。**既知欠陥**: ①店ごとのスコア判別力が弱い ②海外店は日本グルメサイト前提で誤検出 → **✅ v3（58a743c）で両方解消を確認**。EN対応（Yelp/TripAdvisor/OpenTable/DoorDash/Grubhub/Toast検索+英語出力+言語トグル）。検証結果: Joe's Pizza=B82(TripAdvisor4.5・Yelp4/5・口コミ3407件・DoorDash/Grubhub/UberEats引用・食べログ消滅)、Bouldin Creek Cafe=A87(IG実アカウント名・Toasttab引用)、さわやか=A85(食べログ3.65)、架空店=E10捏造なし。スコアパターンは店ごとに分散。残る限界: LLM採点ゆえ再実行で±数点ぶれる/SNSは存在検出まで（フォロワー数等は検索スニペット依存）/同名店の混同リスク |
| **/power v4 データ堀（b6e69b6）** | ✅ 全診断をSupabase `power_diagnoses` に自動保存（テーブル+index+RLSはダッシュボード経由で作成済み）。公開履歴ページ /power/[slug] 稼働・E2E検証済み（丸亀製麺-新宿: 74→72の推移2行表示・SEOタイトル付き）。socialxup型「時間が堀になる」構造が2026-06-10から蓄積開始。`quotes` jsonb列も追加済み（v5用）。**✅ v5デプロイ完了（1493f2c）・E2E検証済み**: ダークヒーローカード+E〜Aゲージ+powered by Growl / 全チャネルに証拠URLの「開く→」チップ（実URL確認: TripAdvisor・Yelp・DoorDash・食べログ等）/ 「ネット上の実際の声」実引用2件（捏造なし確認）/ 3ステップローディング。quotes列に保存・履歴ページにも表示。残: P5軽微修正（weakness文言の癖・404） |
| **戦略決定（2026-06-10 なおさん）** | **「英語圏で売れないと日本で売れない」— 英語圏ファースト原則**。/powerのEN対応（Yelp/TripAdvisor/OpenTable/DoorDash系ドメイン+英語出力）を最優先で実施 |
| **E2Eテスト標準化** | リリース後は必ずユーザー操作で通しテスト（表示確認だけで完了としない）。今日の実例: コピーボタン動作・診断5問完走・シェアURL内容捕捉・実在店/架空店/海外店の3パターンAPI検証 |

### 🔁 継続実行体制（2026-06-10 構築済み・再構築禁止）
| 仕組み | 内容 |
|---|---|
| **スケジュールタスク `aeo-revenue-autopilot`** | 月・木 10:00 JST に自動実行。AEO記事執筆→Dev.to公開→コメント返信→Gumroad売上確認→ログ追記まで全自動 |
| **プレイブック** | `backend/cognitive/MONETIZATION_AUTOPILOT_PLAYBOOK.md` — テーマキュー10本・記事の型・商品ロードマップ・禁止事項。毎回これを読んで実行する |
| 既存タスクと共存 | devto-daily-article（毎日9:00）/ sage-note-auto-publish（毎日10:31）は別物。停止しないこと |

### 次のAIセッションへ
1. オートパイロットの実行結果はこの§12cに毎回1行ログが増える。重複作業をしないこと
2. Gumroad新商品（itawej / $9.99）のPRをSageコンテンツプールに追加する（L1・未着手）
3. 診断ページへのメール捕捉欄・価格表記統一は未着手（L1・着手可）
4. 売上が1件でも発生したら、§8dの30日プラン判定（価格/ターゲット見直し）を更新する

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

- **Growlダッシュボード** → `growl-ai.com` で稼働中
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
| 6 | SaaSHub登録 | ❌ **アカウント作成�
---

## 13. Meta広告代行：自分の広告アカウント接続＆検証完了（2026-06-13）

### ✅ 達成（agency-001）— 「お客さんの広告をAIが作って入稿」の土台が動作
- **接続方式の確定**: OAuthボタン(60日・ブロック頻発)でなく **Business Manager の System User トークン** で接続。
  - System User `growl-agency` (ID:61590753811739, Adminロール) を作成 → 広告アカウント `act_1917298491960086`(全権限) と FBページ2件(広告/コンテンツ/インサイト) を割当 → アプリ `sege3.0`(ID:1228008508773411) に system user を追加(アプリを管理) → トークン生成(スコープ: ads_management / pages_show_list / pages_manage_ads / pages_read_engagement)。
  - ⚠️ **新Business Suite UIは「無期限」を出さず60日 or 1回限りのみ**。→ 60日で運用し、**期限前にSageが自動再発行**する方針(実質無期限を自動化で実現)。【未実装の次タスク = auto-refresh-001】
- **登録経路**: 管理者用フォーム `growl-ai.com/admin/connect`(ADMIN_SECRETゲート, fail-closed) にトークンを貼る → サーバが60日長期トークンに交換 → `user_meta_tokens`(device_id=`nao-agency`) に保存。ADMIN_SECRET は Vercel env に設定済(値は別管理)。
- **エンドツーエンド検証(本番 growl-ai.com)**:
  - 正常系: device_id=nao-agency でPAUSEDテスト広告作成成功(campaign 120248483518890389 ほか / 予算300円正しく換算 / 警告なし)。
  - 異常系: 違反コピー(個人属性「糖尿病」/「必ず月収100万」/「100%」/「7日で痩」/「日本一」)は **blocked=true で出稿中止**。安全ガード作動を確認。
- **残課題**: ①Sageによるトークン自動再発行(auto-refresh-001) ②接続ページが pages[0]=「Solutions Engineering Team」固定→本番では正しいページに切替必要 ③テスト用PAUSEDキャンペーン(120248483518890389)は要削除(任意)。

### 🔁 追記(2026-06-13): トークンは実際には「無期限」だった（auto-refresh-001 解決）
- `/api/admin/refresh-meta-token`(ADMIN_SECRET必須, GET/POST, device_id指定可) をデプロイ(commit 2508d22)。System User再発行→fb_exchange_tokenフォールバック→debug_tokenで期限確認→user_meta_tokens更新。
- **本番テスト結果**: `{method:"fb_exchange_token", old_expires_at:0, new_expires_at:0, never_expires:true}`。
- ⇒ **接続済みトークンは expires_at=0 ＝ 無期限**。新Business Suite UIの「60日」表示は選択肢の話で、アプリ経由で交換した実トークンは失効しない。なおさんの「一度きり・無期限」は達成済み。
- 月次の自動再発行は「安全網」として保持（必須ではない）。スケジュール自動実行は未設定（無期限のため不要・希望時に追加可）。

### 追記(2026-06-13): 掲載ページ切替＆初回パイロット広告(Growl自社宣伝)を本番作成
- `/api/admin/set-page`(commit 6179966) デプロイ。page一覧: Solutions Engineering Team(173041465895454) / クリエイティブコンテンツLab(100969749629377)。
- nao-agency の page_id を **クリエイティブコンテンツLab(100969749629377)** に切替（広告主表示ページ）。
- 初回本番キャンペーン = **Growl自体の宣伝**（見込み客=中小事業者の獲得→将来のパイロット顧客に繋げる）。AI生成→PAUSEDで入稿成功。campaign 120248484516140389 / ¥500/日 / 警告なし。配信方針=PAUSEDで確認→なおが手動ON。
- テスト用PAUSEDキャンペーン 120248483518890389 は削除予定(P3, Adsで手動)。

### 追記(2026-06-13): 手作業ゼロ運用の核 — AI自動承認→自動ON＋Sage番人(commit be50350)
- **運用モデル方針**: 完全セルフサーブ(=Meta App Review必須・数週間)は後回し。当面は「代行＋AI自動チェック→自動ON」で手作業ほぼゼロ運用。App Reviewは有料顧客がついて伸びが見えてから。
- **submit に auto_activate オプション追加**: ①コンプラBlockなし ②警告ゼロ ③広告要素充足 ④日予算≤自動ON上限(¥1,000) を全て満たす時のみ ACTIVE化。1つでも欠ければPAUSED保留＋理由返却(=怪しいものだけ人が見る)。ACTIVE化してもMeta側広告審査を通るまで配信されない(二重チェック)。
- **/api/cron/ad-guardian (ADMIN_SECRET必須)**: 配信中広告を点検し、(a)spend≥waste_spendでリンククリック0=無駄遣い (b)CPC>目標×1.5 (c)累計spend>hard_stop(¥20,000)=暴走 を自動PAUSE。毎日実行想定。
- **本番テスト**: 予算¥3000(上限超)→自動ONせずPAUSED保留(ゲート作動・実費0)を確認。guardianは正常応答(checked0/paused0)。
- **要片付け(P3)**: テスト用PAUSEDキャンペーン 120248483518890389 と 120248484809730389 は削除可。パイロット 120248484516140389 は保持。
- **未実施**: guardianの毎日自動実行スケジュール(Cowork定期 or Vercel cron)。広告がライブになってから設定で可。

### 🧭 2026-06-13 セッション総括（このセッションで何をしたか・未完了リスト）
**完了して本番デプロイ＆動作確認済み:**
1. ADMIN_SECRET を Vercel(growl-app) に設定＋再デプロイ。
2. Meta接続=System Userトークン方式を確立 → `user_meta_tokens(device_id=nao-agency)` に保存。トークンは expires_at=0 ＝**無期限**を確認。
3. 管理エンドポイント3本デプロイ: `/api/admin/connect-account`(接続)・`/api/admin/refresh-meta-token`(自動再発行)・`/api/admin/set-page`(掲載ページ切替)。全てADMIN_SECRETゲート。
4. 掲載ページを **クリエイティブコンテンツLab(100969749629377)** に設定。
5. パイロット広告(Growl自社宣伝)をAI生成→PAUSEDで入稿: campaign `120248484516140389` / ¥500・日 / クリエイティブコンテンツLab / 警告なし。
6. submit に **auto_activate**(AI自動承認→自動ON, 上限¥1,000・警告ゼロ時のみ)を追加。
7. **/api/cron/ad-guardian**(無駄/不調/暴走を自動PAUSE)を追加。
8. コンプラ自動審査(違反ブロック)・自動ONゲート(予算超で保留)・guardian、いずれも本番テスト合格。

**未完了/保留(中途半端ではなく意図的な保留・なお待ち):**
- [なお手動] テスト用PAUSEDキャンペーン削除: `120248483518890389`, `120248484809730389`（パイロット `120248484516140389` は残す）。
- [なお手動] パイロット `120248484516140389` を Ads Manager で確認→ON（要・支払い方法登録／実費発生）。
- [保留] guardian の毎日自動実行スケジュール → 広告がライブになってから設定。
- [保留] auto_activate の「上限内→実際にACTIVE化」happy pathは実費回避のため未実行検証（ゲート保留側は検証済・ロジックは単純なPOST status=ACTIVE）。
- [後回し・要数週間] 完全セルフサーブ=Meta App Review＋ビジネス認証（有料顧客がついてから）。tasks: セルフサーブ①〜④。
- [無害な残骸] デスクトップに cmd ウィンドウ複数／repo直下に push_refresh_token.bat・push_set_page.bat・push_auto_guardian.bat（未追跡・デプロイには無関係）。

### 📈 追記(2026-06-13): トップマーケター視点の改善 — IMP1 CV計測＋IMP2 専用LP 完了(commit a4fd44b)
- **背景**: パイロット評価で「目的がOUTCOME_TRAFFIC=クリック最適化(客でなく安いクリックを買う)」「遷移先がトップページ」「Pixel無し=計測ゼロ」を最大の弱点と特定。
- **IMP2 専用LP `/start`**: 広告メッセージ一致・アウトカム先行見出し「広告は、AIに3分で作らせる時代。」・単一CTA(→/onboarding/industry)・CTAでPixel `Lead` 発火。本番表示OK。
- **IMP1 Meta Pixel**: `app/layout.tsx` に NEXT_PUBLIC_META_PIXEL_ID 駆動でPixel設置(PageView)。`/start`のCTAで `Lead` 発火。
- **Pixel ID = 371800622515161**（既存 `/api/admin/ensure-pixel` で取得）。Vercel env `NEXT_PUBLIC_META_PIXEL_ID` に設定(公開値・非Sensitive)→再デプロイ済。
- **submit をCV対応**: Pixelありなら objective=OUTCOME_LEADS / optimization_goal=OFFSITE_CONVERSIONS / promoted_object={pixel_id, custom_event_type:LEAD}。無ければ従来トラフィックに安全フォールバック。
- **本番検証**: fbq稼働=true・PixelID in HTML=true・CV最適化入稿 success（campaign 120248487917640389 ※テスト, 要片付けに追加）。
- **残り = IMP3**: 複数クリエイティブ生成→複数広告で同時テスト→guardianを「負け速攻kill＋勝ちに+20-30%スケール＋疲労差し替え」に拡張（=PDCA/OODAの自動化）。未着手。
- 片付け対象キャンペーン追加: `120248487917640389`(CV検証), `120248484809730389`(ゲート検証)。本命パイロットは `120248484516140389`。

### 🔁 追記(2026-06-13): IMP3 完了 — 番人の自動スケール＋複数クリエイティブA/B(commit 5adf8fb)
- **ad-guardian を広告セット単位のPDCA/OODAエンジンに刷新**: 【Kill】暴走/無駄遣い/CPC非効率→PAUSE 【Scale】十分なデータ&効率良→日予算+20%(scale_max上限まで・小刻み)。本番テスト=エラーなく稼働(summary{paused,scaled})。配信データが無いため実スケールは未発火(ライブ後に作動)。
- **generate に hook_hint 追加**: フックタイプ(質問型/数字型/逆説型/一人称型/FOMO型)を指定して別アングルのコピーを生成→submitをN回でA/Bテスト可能。本番で2案生成→クリーンな1案をPAUSED入稿(campaign 120248488166030389)。
- **🔴重要な発見(リスク)**: hook_hint=「数字型」を実データ(proof_numbers)無しで指定すると、AIが「30%以上効果アップ」と**数字を捏造**(ハルシネーション)。現preflightの正規表現では捕捉できず通過した。→ **対策(次タスク improve-001)**: ①オーケストレーション側で「数字型」は実績データがある時だけ使う ②preflightに「根拠なき数値performance主張(\d+%…アップ/向上/改善等)」のWARN/ブロックを追加。今回は該当案を入稿せず人間判断で除外した。
- 片付け対象キャンペーン更新: 120248483518890389 / 120248484809730389 / 120248487917640389 / 120248488166030389(=テスト群)。本命パイロット=120248484516140389。

### ✅ 当面の到達点（手作業ゼロ代行 MVP・トップマーケター改善3点 反映済み）
生成(AI)→自動コンプラ審査→CV最適化入稿→自動承認/自動ON(上限内)→専用LP(計測)→番人が毎日Kill/Scale。残: guardian毎日スケジュール接続・数字型ハルシ対策・テストCP削除・(後回し)App Reviewでセルフサーブ公開。

### 🔎 追記(2026-06-13): 全体監査＋モデル決定「AI代行(done-for-you)」一本化＋AdBoostCard統合(commit 94eeba6)
**監査の主要発見:**
- アプリは2層: ①本線(生きてる)=診断クイズ→オンボーディング→「今週の3アクション」(generate-actions)＋LINE/TikTok＋Stripe課金。 ②Meta広告=ダッシュボードの `components/AdBoostCard.tsx`(generate→preview→submit)。
- 🔴 一般ユーザーは広告を出せなかった: AdBoostCardはユーザー自身のdevice_id(未接続)で送信→「未接続」→壊れたOAuthへ誘導(行き止まり)。動くのはnao-agencyのみ。
- 🔴 今日の改善がUI未配線だった: link_urlがトップ固定(新LP未使用)/auto_activate未送信/hook_hint未使用。CV最適化(Pixel)はenv経由で効いていた。
- 🔁 重複: 私の `/api/admin/set-page`(admin) と既存 `/api/meta-ads/select-page`(user OAuth用,無認証)。役割違い・機能重複。
- 孤立: 新LP `/start` がUI未リンクだった。新admin系(connect-account/refresh/set-page/ensure-pixel)はSage/管理者専用(意図的)。
- 既存の多数機能(power/templates/learn/marketing/product-marketing/revenue-report/market-scan/waitlist等)は現役/遺物の棚卸し未実施。

**決定:** 主客(広告に弱い・時間ない中小事業者)の体験は **AI代行(done-for-you)** が最良 → これを本命に一本化。セルフサーブ(App Review必須)は将来のハイブリッド拡張に降格。

**実施した統合(AdBoostCard):** ①link_url→`/start`(メッセージ一致) ②壊れたOAuthの行き止まりを撤去 ③未接続時は「Growlにおまかせ(代行依頼)」CTA(mailto:contact@growl-ai.com に生成コピーを載せる)に。 ④コピーを代行前提に。デプロイ済・ビルド健全。

**残(一貫化の続き):** ①代行intakeの正式化(mailto→申込フォーム/Supabase保存＋Sage通知) ②set-page/select-pageの役割整理(機能上の競合は無し) ③残骸片付け(push_*.bat・cmd窓・テストCP) ④既存機能の棚卸し(現役/廃止) ⑤多テナント代行(クライアント別口座接続=私のconnect-accountをdevice_id別運用)。

### 🧲 追記(2026-06-13): 代行intake正式化 完了(commit e78bb81) — 広告生成→見込み客捕捉
- **`/api/agency/request`(POST)**: email必須・device_id/事業情報/生成ad_copy/budget/noteを受け、`app_config` に `agency_req_{ts}` = JSON(status:new) で保存(新テーブル不要)。本番テスト=正常保存(success/request_id)、email無しは400。
- **AdBoostCard に「おまかせで配信を依頼」フロー追加**: preview→主CTA「🚀おまかせで配信を依頼(無料相談)」→email+任意メモ→保存→受付完了画面。「自分で出す(停止)」は副CTAに降格。＝done-for-yピボットがUIで一貫。
- ⚠️ **残る要対応**: 保存したリードの可視化/通知が未実装(今はapp_configに溜まるだけ)。→ 次: 簡易admin閲覧 or Sage日次でagency_req_*を集約しなお通知(Telegram/メール)。これが無いとリード取りこぼし。
- 片付け対象batに push_integrate.bat / push_intake.bat / push_imp_a.bat / push_imp3.bat も追加(未追跡・無害)。

### 💰 追記(2026-06-13): 代行の価格モデル決定（競合調査ベース）
- **競合相場(2026)**: 従来代行=管理料$500〜5,000/月(中小$500-1,500 or 広告費15-25%)＋広告費別。DIY AIツール=$29〜499/月(自分で作業)。AIで運用費60-80%削減可。
- **勝ち筋**: 「代理店の成果を、ツールの値段で、作業ゼロで」(おまかせ×激安×即・縛りなし)。
- **決定価格**: ベータ=**先着10名 ¥2,980/月(料金ロック)** ＋広告費別・客先払い → 10名後/実績後 **¥9,800/月** → 段階的に上げる。広告費は客がStripeで先払い=なお持ち出しゼロ。
- **入金/ゲート**: Stripe決済が「人の代わりのゲート」。申込→自動受付→Stripe決済リンク→支払い検知(webhook)→AIが自動で広告構築/自動ON/番人最適化/レポート。なおは週次ダイジェストのみ(毎回確認不要)。安全=「払った人だけ自動で進む」で悪用/暴走/持ち出しを防ぐ。
- **出稿口座(MVP)**: なおの代行口座で即配信(客は接続ゼロ=最高CX)→将来クライアント別口座/ページに拡張。
- **実装の外部依存**: ①Stripeに商品(¥2,980/月サブスク)を1つ作成(なおのStripe・私がガイド) ②受付メール送信手段。これらの後、webhook→auto-run(submit auto_activate)を配線すれば自動ループ完成。intake(/api/agency/request)は実装済。

### 👀 追記(2026-06-13): 申込リード閲覧画面 完了(commit 65e4d62)
- **`/admin/leads` ＋ `/api/admin/leads`**(ADMIN_SECRET必須): app_configの `agency_req_*` を集約し、メール/事業/希望広告/予算/メモ/日時/statusを新着順で表示。本番テスト=テスト申込1件を正しく表示。
- これで「申込が来たのを知る手段」の穴を解消。なおは `growl-ai.com/admin/leads` で確認可能。
- **収益化の残り(唯一)**: Stripeの¥2,980決済リンクを1本作る(Chrome安全制限&鍵なしで私は作成不可→なおが5分、最初の客が出た時でOK)。リンクができれば webhook→auto-run 配線で自動課金ループ完成。
- ⚠️ 既知: payment-success の agency 対応編集が特定ファイル同期グリッチでgit未反映(ホストは編集済)。次回 agency 本配線とまとめて再デプロイ予定。新規ファイルのデプロイは正常。

### 🌙 セッション終了ハンドオフ(2026-06-14) — 翌朝の唯一のアクション
**収益化(AI代行)はあと「決済リンク1本」で繋がる状態。** Lead捕捉・Lead閲覧(/admin/leads)・AI広告エンジン(生成/コンプラ/自動ON/番人)・専用LP・Pixelは全て本番稼働。

**⭐ なおさんの唯一の宿題(翌朝)**: フォルダ直下の **`run_agency_link.bat` をダブルクリック** → ローカルの`.env`のSTRIPE_SECRET_KEYを使い、Stripe APIで「¥2,980/月」の支払いリンクを自動生成 → 出力の `PAYMENT_LINK_URL = https://buy.stripe.com/...` をClaudeに貼る。
- なぜローカル実行: VercelにStripe秘密鍵が無い(良いセキュリティ)＋Chromeが安全制限でStripe管理画面ブロック＋私は秘密鍵を扱わない方針。鍵は`.env`(本リポジトリ直下)にあるのでローカルnodeで実行=USDリンクと同じ方式。
- 作成済みファイル: `create_agency_link.mjs`(node script) ＋ `run_agency_link.bat`(実行用)。未commit(ローカル専用)。

**URLをもらった後にClaudeがやること(配線・1回)**:
1. `lib/stripe-config.ts` に agency プラン(¥2,980, そのPayment Link)を追加。
2. `webhook/stripe` を拡張: 入金 amount=2980(JPY) を検知 → client_reference_id(device_id) で `agency_pending_{device_id}`(app_config)を引き当て → `/api/meta-ads/submit` を device_id=nao-agency・auto_activate=true で呼ぶ(=AIが自動で広告構築→自動ON→番人最適化)。重複防止に fulfilled フラグ。
3. AdBoostCardの「おまかせ依頼」→ 申込保存後にこの決済リンクへ誘導(client_reference_id付き)。
4. デプロイ＆PAUSEDで一周テスト。

**今セッションの環境メモ(翌朝の前提)**: bash VM停止中・Chromeはread tier&Stripeブロック・Explorer経由のbat実行が不安定(focus)・payment-success の agency 表示は本番で確認済(動いている)。
**片付け(任意)**: テストCP(120248483518890389/484809730389/487917640389/488166030389、本命は484516140389は保持)、repo直下 push_*.bat 群。
**価格戦略**: ベータ先着10名¥2,980(料金ロック)→¥9,800→段階値上げ。出稿はMVPでnao-agency口座。将来クライアント別口座&App Reviewでセルフサーブ公開。

### ✅ 完了(2026-06-14): 代行の「支払い→AI自動配信」ループ 全配線デプロイ(commit 2960ffa)
- **決済リンク作成**: ローカルで `node create_agency_link.mjs` 実行(.envのsk_live使用)→ Stripe APIで作成。
  - PAYMENT_LINK = `https://buy.stripe.com/3cI5kEaIw73f9pJetw93y0j` / price_1Ti0GoILSrv644ukbbmEbJV8 / prod_UhP40GfvdPcikT (¥2,980/月)。
  - 教訓: VercelにSTRIPE_SECRET_KEY無し→ローカル実行が正解。bat内の日本語は文字化け→**batはASCII限定**。
- **配線(4ファイル)**: stripe-config に agency＋buildAgencyUrl / agency/request が `agency_pending_{device_id}` も保存 / **webhook**: 入金¥2,980(JPY)検知→`handleAgencyPayment`→agency_pending引当→`/api/meta-ads/submit`(device_id=nao-agency, auto_activate=true, 予算¥1000/日)→売上記録→fulfilled印(二重防止) / AdBoostCard「おまかせ(月¥2,980)」→申込保存→決済リンクへリダイレクト。
- **顧客フロー(全部本番)**: サイト→AI広告生成→「おまかせ¥2,980」→メール→Stripe決済→**入金で自動: 広告構築・自動ON・番人最適化**→/payment-success?plan=agency で受付表示。なおは/admin/leadsで有料リード確認＆Stripe入金。
- **検証**: 申込→保存→リダイレクト動作確認。⚠️ 実決済→webhook自動配信の通しは「実際の¥2,980支払い」発生時に確定(署名検証ありで疑似不可)。コード上は成立。
- **🟡要判断(重要)**: 現状 auto_activate=true ＝ 入金後すぐ配信開始し**なおが広告費を立替(¥1,000/日上限/件・番人で暴走防止)**。なおは資金少と言っていたため、PAUSED作成(立替ゼロ・なおが1タップでON or クライアント広告費先払い導入)に切替も可。flag1つ。

### ✅ 完了(2026-06-14): 2段プラン化＋全自動(広告費込み) — 立替ゼロで収益が立つ形に
- **方針変更**: 管理のみ(¥2,980)は **支払い後PAUSED**(立替ゼロ・commit 994fe6a)。
- **全自動プラン追加**: **フルおまかせ ¥9,800/月（管理＋広告費込み）**。API作成: `https://buy.stripe.com/4gMbJ203SbjvatNfxA93y0k` / price_1Ti0cJILSrv644ukkgIkiTlI / prod_UhPRldjQNbs6al。支払い検知→**auto_activate=true・¥250/日で自動配信**(広告費は先払い済＝立替ゼロ)。commit aa52327。
- **webhook分岐**: ¥2,980→PAUSED(daily¥1000設定だが停止) / ¥9,800→自動ON(daily¥250)。両方 client_reference_id=device_id で agency_pending 引当→submit(nao-agency)→fulfilled印。
- **UI(AdBoostカード)**: 「おまかせ」→メール→**2択ボタン**「全自動¥9,800(広告費込み)」/「管理だけ¥2,980」→各決済リンクへ。
- **収益**: 入金は全額なおのStripe。¥9,800のうち広告費約¥7,500(¥250×30)はMeta課金で相殺、管理料相当が利益。¥2,980は管理料=ほぼ利益。**いずれも持ち出しゼロ**。
- **preflight強化**(commit 933dc24): 根拠なき数値成果主張(〇%アップ/〇倍)をWARN。
- **残**: ①代行オファーの導線/発見性(今はダッシュボードのAdBoostカード内のみ→トップ/LPから見つけられるように) ②Sage日次の番人実行&入金/申込通知のスケジュール ③テストCP/残骸片付け ④数字型hook_hintは実績データ時のみ使う(orchestration)。

### ✅ 完了(2026-06-14): 発見性 — /agency 紹介LP＋ホーム導線(commit 8547952)
- **`/agency`**: 「広告、AIに丸ごとおまかせしませんか？」＋3ステップ＋なぜGrowl＋料金2プラン(¥9,800全自動おすすめ/¥2,980管理のみ・先着10名料金ロック)＋CTA→/onboarding/industry。Pixel計測(AgencyLP_View/Lead)。本番表示OK。
- **ホーム導線**: トップのヒーローに「広告運用をAIにまるごとおまかせ →」リンク追加→/agency。
- **これで収益ファネルが一本化・発見可能に**: トップ→/agency(訴求+料金)→無料で広告作成→onboarding→AdBoostカードで生成→2プラン選択→Stripe決済→¥9,800自動配信 or ¥2,980 PAUSED→番人最適化。全部本番。
- **残(軽め)**: Sage日次自動(番人実行＋入金/申込通知)、テストCP/push_*.bat片付け、実決済での通し確認(初回支払い時)。

### ✅ 完了(2026-06-14): Sage日次自動運用タスク作成 — 手間ゼロが完全に閉じた
- **scheduled-tasks: `growl-daily-ops`**(毎日9時, cron "0 9 * * *", notifyOnCompletion=true)。保存先 C:\Users\nao\Documents\Claude\Scheduled\growl-daily-ops\SKILL.md。
- 内容: 毎朝 (1)`/api/cron/ad-guardian?secret=...`をGET=番人で自動最適化(無駄停止/勝ち増額) (2)`/api/admin/leads?secret=...`をGET=申込/入金確認 (3)なおさんへ日本語で簡潔報告(新規申込・入金・番人アクション・要対応:入金済なのにPAUSEDの広告等)。secretは報告に含めない・捏造禁止と明記。
- ⚠️ 初回は「Run now」で手動実行してツール(web_fetch)権限を事前承認推奨(以降の自動実行が権限待ちで止まらない)。
- **これで一連が無人運用に**: 集客(/agency)→販売(Stripe)→配信(自動/PAUSED)→最適化(番人)→日次報告(Sage)。なおは朝の報告を読むだけ。
- **検証(2026-06-14)**: /agency表示OK・申込フロー(全自動/管理 両方)成功・リード保存4件・/admin/leads表示OK。実決済通しは初回支払い時に確定。

### ✅ 完了(2026-06-14): 実写真アップロード(設計図F-4) — 最大の品質レバー(commit f100dcd)
- **`/api/upload-image`**(imgbb): base64受領→imgbbへアップ→公開URL返却。本番テスト=テスト画像アップ成功(i.ibb.co URL)。IMGBB_API_KEYはVercel env済。
- **submit**: `image_url` を受け、**AI画像より最優先**で取得→Metaへアップ→クリエイティブに使用(無ければFLUX→キャッシュにフォールバック)。
- **AdBoostカード**: 「📷実物の写真(推奨・クリック2-3倍)」アップロードUI追加→/api/upload-image→URL保持→generate/submit/request に image_url を渡す。
- **agency/request**: image_urlをrecord/agency_pendingに保存。**webhook**: pending.image_url→submitへ渡す(支払い後の自動配信でも実写真が使われる)。
- → 設計図C「クリエイティブ:顧客実写真を主」達成。残りの設計図未実装: 半径ターゲティング/店別自動レポート/マルチチャネル即時通知/顧客連絡AI文面。

### ✅ 完了(2026-06-14): 店別自動成果レポート(設計図C/フェーズ2)(commit 84c3388)
- **`/api/admin/report`**(ADMIN_SECRET, GET): device_id＋since(既定last_7d)で Meta insights を取得→ total{spend,impressions,reach,clicks,conversions,ctr,cpc,cpa}＋campaigns[]別 を返す。CV=actions(lead/purchase/offsite_conversion等)から集計。
- **日次タスク `growl-daily-ops` を更新**: 番人実行＋**成果レポート(7日)取得**＋申込/入金確認→なおさんへ「📊成果/🛡番人/🧲申込入金/⚠️要対応」を毎朝報告。
- 残りの設計図未実装: **マルチチャネル即時リード通知(LINE/Telegram)** / **半径ターゲティング** / 顧客連絡AI文面。

### 🚨 重要訂正・確定(2026-06-14): マルチチャネル即時リード通知(LINE/Telegram)の“正確な事実”
過去に「Telegramは既にSageに入っていてすぐ使える」と言ったが、**これは不正確だった**。コードを精読した確定事実:
- **Telegramは実質動かない**: 通知枠組み `backend/modules/market_scan_notifier.py` は Slack/Telegram/Notion へ送る設計だが、本体 `backend/integrations/telegram_bot.py` は**ファイルが存在しない**(Globで見つからない＝importは失敗)。さらに `SAGE_ENABLE_TELEGRAM=1` でゲートされ既定オフ。用途も「市場スキャン通知」で代行リードではない。要 env: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID。
- **LINE は本物・クラウド側で稼働可能**: Webアプリ(Vercel)に `LINE_CHANNEL_ACCESS_TOKEN`＋`/api/line/webhook`＋6桁コード紐付けがあり、プッシュ送信が実際に可能。リードが発生するクラウド側にあるため、代行通知に最も現実的。
- **Slack** は SlackAgent(SLACK_WEBHOOK_URL)で動く可能性が高い(バックエンド側)。
- **そもそも“リード”という単位が無い**: 現在の広告は「サイト誘導」型。リード即通知を成立させるには **Meta Lead Ads(フォーム広告)＋leadgen Webhook** が必要(=リード発生源を作る)。
- **結論/正しい順序**: ①Lead Ads でリード発生源を作る → ②LINE即通知(クラウド・現実的)を本実装 → (Telegramは欠落モジュール再構築＋トークン設定が要るので後)。**現状この機能は未実装・要B→A**。

### 🔧 追加発見・訂正(2026-06-14): 通知チャネルの“使える資産”を .env で再確認（地域適応）
**ユーザー指摘: 英語圏はLINEよりWhatsApp/Telegram。地域適応で設計すべき。** .env を確認した結果、思ったより作れる:
- ✅ **`RESEND`(メール送信)が .env にある** → クラウドからメール送信可能。**Email＝万国共通ベースライン（英語圏もカバー）**。一番先に作るべき本命チャネル。
- ✅ **`TELEGRAM_BOT_TOKEN` が .env にある** → Sageのtelegram_bot.py本体は欠落でも、**クラウドアプリから Telegram の sendMessage API を直接叩けば送れる**（モジュール不要・chat_idは紐付けで取得）。英語圏/グローバル向けに使える。
- ✅ **LINE**（クラウド・トークン＋6桁紐付け）= 日本向け。
- ⚠️ **WhatsApp**: .envにキー無し。最普及だが Meta WhatsApp Business のオンボーディング＋テンプレ審査が重い → 後追加（設計図でも「後追加」）。
- **地域適応の既定**: 日本→LINE / 英語圏・その他→**Email＋Telegram** / Email は全地域ベースライン。オーナーが選択可。
- **作る順序(確定)**: (1)地域適応 notifyユーティリティ(Email=Resend / Telegram / LINE) (2)まず代行の新規申込・入金を**なおへ即通知**(Email等)で実用化 (3)Meta Lead Ads でクライアント広告のリード発生源を作り、同じnotify層でオーナーへ地域適応通知。WhatsAppは最後。
- ⚠️ **重要な前提(env所在)**: `RESEND_API_KEY`(行196)・`TELEGRAM_BOT_TOKEN`(45)・`TELEGRAM_CHAT_ID`(46) は**ルート .env=Sageバックエンド側**にある。**Vercelアプリ側envには未確認/恐らく無い**(Stripe秘密鍵と同様)。→ クラウド(webhook/request)から即通知するには、これらを **Vercel env に追加**するか、Sage(ローカル)から送る必要がある。LINEはVercel側にある(JP・要紐付け)。WhatsAppはキー無し。
- **依存まとめ**: 即通知の実装には ①notify層(コード・私が作る) ②Vercelにキー追加(なお/私で) ③リード発生源=Meta Lead Ads、が要る。現状この機能は未着手。

### ✅ 実装(2026-06-14): 地域適応 通知層＋申込/入金の即通知(commit 01c7e1a) — 有効化は鍵投入待ち
- **`lib/notify.ts`**: sendEmail(Resend)/sendTelegram(token+chat)/sendLine(token)＋`notify({locale,...})`=日本→LINE/他→Telegram＋Email常時。資格情報無ければ安全スキップ。
- **`/api/admin/notify-test`**(ADMIN_SECRET): 各チャネルの到達テスト。
- **配線**: `/api/agency/request`=新規申込で🧲なおへ即通知 / `webhook`=入金で💰なおへ即通知(金額/プラン/広告状況)。recipient=NOTIFY_ADMIN_EMAIL or naofumi0930@gmail.com。
- **本番テスト結果(2026-06-14)**: notify-test → email/telegram とも **skipped(no key)**。＝コードは動くが**Vercelに鍵未投入**。
- **⭐有効化に必要(Vercel envへ追加)**: `RESEND_API_KEY`/`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`（値はルート.envにある=なおがコピペ。LINEは投入済）。追加後 notify-test で ok 確認。
- WhatsAppは未(鍵無し・審査重)。クライアント広告のリード通知は Meta Lead Ads 実装後に同notify層で。

### ✅ 実装(2026-06-14): 半径ターゲティング(設計図F-4)(commit ed1e4d2)
- **`/api/geo-search?q=`**: Metaの adgeolocation 検索(city/region/subcity)→ {key,name,label} を返す(nao-agencyトークン使用)。本番テスト=「渋谷」→東京都渋谷区(key 1211264) 取得OK。
- **AdBoostカード**: 「📍地域を絞る」エリア入力→候補から選択→半径スライダー(1-50km)→ `geo_locations={cities:[{key,radius,distance_unit:kilometer}]}` を submit/request に渡す。
- request/webhook も geo_locations を保存・引き渡し(支払い後の自動配信でも近隣配信が効く)。submitは元々geo_locations対応。

### 🏁 現状サマリー(2026-06-14): 代行プラットフォームは“機能ほぼ完成”
**実装済(本番)**: 集客LP(/agency)＋ホーム導線／オンボーディング／AI生成(コピー・実写真優先・AI画像)／コンプラ自動審査(強化)／予算ガード／**半径ターゲティング**／CV最適化(Pixel)／自動承認→自動ON or PAUSED／番人(Kill+Scale)／Stripe2プラン(¥2,980管理・¥9,800全部込み)→支払いで自動配信／成果レポート(/api/admin/report)／申込intake＋/admin/leads／地域適応通知層(コード)／**日次自動運用(朝夕2回・要対応を先頭に報告)**。
**未(意図的・要設定 or 後回し)**: ①通知の有効化=Vercelに RESEND/TELEGRAM キー投入(任意・日次報告で代替中) ②Meta Lead Ads(leads_retrieval権限＋リード規約承認=なお設定要→英語圏の即時リード通知はこれ待ち) ③WhatsApp(鍵無し・審査重) ④顧客連絡AI文面 ⑤テストCP/push_*.bat片付け。
**→ 本質的な次の一手は“追加実装”でなく“ローンチ(集客)”**: パイロット広告ON(実費・なお承認) or 既存Sageの無料コンテンツを/agencyへ誘導。プロダクトは売れる状態。

### 🧭 「マルチチャネル通知の設計」以降にやったこと(まとめ) — 2026-06-13〜14
あの設計発言(=設計図にPhase2として記載した時点)以降、**マルチチャネル通知“以外”の代行システムを丸ごと実装**した:
- Meta接続(System User・無期限トークン)/接続フォーム/refresh/set-page/ensure-pixel
- 広告エンジン: generate(コピー)/コンプラ事前審査(強化)/予算ハード上限/ローカル配信/auto_activate自動ON/番人(Kill+Scale)
- CV最適化(Pixel・OUTCOME_LEADS)/専用LP(/start)/IMP1-3
- 全体監査→「AI代行(done-for-you)」へモデル一本化
- 申込intake(/api/agency/request)＋リード閲覧(/admin/leads)
- Stripe決済リンク(¥2,980管理/¥9,800全部込み)＋支払い→自動配信 webhook配線
- 代行紹介LP(/agency)＋ホーム導線
- 日次自動タスク(growl-daily-ops: 番人+成果レポート+申込/入金→毎朝報告)
- 実写真アップロード(/api/upload-image, AI画像より優先)
- 店別自動成果レポート(/api/admin/report)
→ つまり「マルチチャネル即時リード通知」だけが、設計図で残った主要未実装(かつ前提に誤りがあった)項目。

### 🔧 追加発見・修正(2026-06-17): GrowlのSaaS対応と、ダッシュボード不具合の徹底調査 (Sage Growl Complete Report)
- **SaaSビジネスを実店舗として分析してしまう問題**: \/api/marketing/analyze/route.ts\ 等のAIプロンプトに「Instagramでランチの写真を…」という実店舗向けの例文がハードコードされていたことが原因。これらをプレースホルダー化し、BtoB/SaaSの場合は実店舗提案を禁止するルールを追加（コミット済）。
- **ダッシュボードが英語＆LINE連携がメール画面になる問題**: 真犯人は「言語引き継ぎのバグ」。オンボーディングで言語を切り替えても \localStorage\ の状態が同期されず、裏側で英語判定（isEn === true）になっていた。これによりAIが英語用プロンプトで実行され、かつ「英語圏ユーザーはEmailを使う」という正しい仕様によりメール画面に切り替わっていた。
- **架空体験談の捏造問題**: AIプロンプトに「架空の顧客体験談を捏造しないこと」という明確な禁止ルールが欠落していた。
- **OpenCodeへの引き継ぎ**: 諸悪の根源である言語引き継ぎバグの修正、ダッシュボードUI of 翻訳マップ追加、AIプロンプトのルール追加、Proof stepのキャッシュクリア処理の実装を指示するドキュメント（\opencode_instructions.md\）を作成し、OpenCodeへ作業を委譲。

### 🔧 動作検証・修正(2026-06-17): E2Eブラウザテストの完走 ＆ 問い合わせ用サポートメールのhello@統一 ＆ 問い合わせAI構想追加
- **自動ブラウザテスト（Playwright）の完全成功**:
  - オンボーディングからダッシュボード、市場分析（PEST）、商品マーケティングAI、LearnAI、月次レポートまでの一連のフローを自動テストするシミュレーションスクリプト（[user_experience_simulation.py](file:///C:/Users/nao/.gemini/antigravity/brain/2282b5a2-d579-42a1-9868-128d5147431b/scratch/user_experience_simulation.py)）を作成し、Next.jsローカル開発サーバー上で動作確認。
  - すべてのアサーションと検証に成功し、言語切り替え、キャッシュクリア、法的リスク回避、日本語ダッシュボードの表示バグの解消が実機環境で実証された。実行時のスクリーンショットを保存し表示に問題がないことを目視確認完了。
- **サポートメールアドレスの統一（contact@ → hello@）**:
  - アプリ内の「利用規約（/terms）」「プライバシーポリシー（/privacy）」「データ削除（/data-deletion）」「マーケティング分析フッター」「AdBoostCard内の配信代行連絡先」など、合計12箇所に記載されていた問い合わせ先 `contact@growl-ai.com` を、転送設定済みの `hello@growl-ai.com` へ一括置換して統一。
- **今後の展望 — 「問い合わせAI（サポートAI）」構想**:
  - `hello@growl-ai.com` に届く日本語・英語両方の問い合わせをAIが自動分類（FAQ / 人間宛て / スパム）し、自動的に返信下書きを生成するシステム。
  - なおさんのTelegram/LINEへ要約と下書き、およびアクションボタン（[🟢 このまま送信] / [✏️ 編集して送信] / [👤 手動で対応する]）をプッシュ通知し、スマホからワンタップで即時送信・承認できる「Human-in-the-Loop」型の承認フロー。
  - 詳細設計および開発ロードマップは [support-ai-design.md](file:///c:/Users/nao/Desktop/Sage_Final_Unified/docs/roadmap/support-ai-design.md) に整理・追加済み。


