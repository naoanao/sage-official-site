# Meta App Review 提出パッケージ — sege3.0 (Growl)

> 目的: `ads_management`（+ `pages_manage_ads` / `pages_read_engagement`）の **Advanced Access** を取得し、
> 一般ユーザー（飲食店オーナー等）が自分のFacebookを接続して自分の広告アカウントで広告を出せるようにする。
> アプリID: 1228008508773411 / 本番URL: https://growl-ai.com / モード: ライブ（公開済み）

---

## ⚠️ 提出前の前提チェック（なお対応）

1. **ビジネス認証（Business Verification）が完了しているか** — 未完だと ads_management の Advanced Access は申請できない。
   - 場所: developers.facebook.com → sege3.0 → 左メニュー「ビジネス向けFacebook…」or アプリ設定 → ビジネス認証。未完なら先に完了させる。
2. **プライバシーポリシーURL** が App設定→ベーシック に設定されているか: `https://growl-ai.com/privacy`
3. **利用規約URL**（任意だが推奨）: `https://growl-ai.com/terms`
4. **データ削除URL/手順** が設定されているか（Meta必須）。無ければ privacy ページにデータ削除方法を明記し、そのURLを登録。
5. **テストユーザー or レビュアー用の案内** を用意（下記「Reviewer Instructions」をそのまま貼る）。

---

## 1. App Verification details / How this app uses the permission（英語・用途説明欄に貼る）

**What the app does:**
Growl is a marketing assistant for small local business owners (especially restaurants and food & beverage shops). A business owner connects their own Facebook account, and Growl helps them generate ad copy and creative and publish a Meta ad campaign **into their own ad account**. Growl never runs ads on a shared account — each user advertises with their own Facebook Page and ad account.

**Why we need `ads_management`:**
We use `ads_management` solely to create advertising objects in the **user's own** ad account on their behalf: a campaign, an ad set, an ad creative, and an ad. All ads are created in **PAUSED** status so the user reviews and activates them manually in Ads Manager. We do not modify or read any account the user does not own.

**Why we need `pages_manage_ads` and `pages_read_engagement`:**
The ad creative is published from the user's own Facebook Page (page-backed creative). `pages_read_engagement` is used to list the Pages the user manages so they can pick which Page the ad runs from; `pages_manage_ads` is required to associate the ad creative with that Page.

**Data handling:**
We store only the user's access token, selected Page ID, and ad account ID (per device) to create ads on their behalf. Tokens are stored server-side (Supabase) and are never shared between users. Privacy policy: https://growl-ai.com/privacy

---

## 2. Reviewer Instructions / Step-by-step（英語・テスト手順欄に貼る）

> The app is live at https://growl-ai.com . A reviewer can reproduce the full flow using their own Facebook account and ad account.

1. Open **https://growl-ai.com** and start the onboarding (choose an industry such as "Restaurant", fill the short business description, problem, and goal). This creates a session.
2. Go to the **Dashboard**. In the **"Ad Boost"** card, click **"Connect your Facebook account"**.
   - This launches Facebook Login requesting `ads_management, pages_manage_ads, pages_read_engagement`.
3. Approve the permissions. You are redirected back to the dashboard. If you manage multiple Pages, a Page-selection modal appears — pick any Page.
4. Back in the **Ad Boost** card, click **"Generate Ad Copy"**. The app generates headline / primary text / creative prompt.
5. Click **"Submit / Create Ad"**. The app creates, in **your own ad account**, a campaign + ad set + creative + ad, all in **PAUSED** status.
6. A success message shows a link to **Ads Manager**. Open it to confirm the PAUSED campaign named `Growl_<date>` exists in your account. No spend occurs because it is paused.

**Test credentials:** If you prefer a provided test login instead of your own, we will add your reviewer account as a Tester in the app and supply a test user — please request and we will provide within 24h.

---

## 3. Screencast script（録画する内容・60〜120秒）

録画はOAuth接続から広告作成までを通しで。音声ナレーション不要、字幕でもOK。

1. growl-ai.com を開く（URLバーが見えるように）。
2. オンボーディングを数秒で通過（Restaurant等を選ぶ）。
3. ダッシュボードの Ad Boost カードで「Connect your Facebook account」をクリック。
4. Facebookのログイン/権限同意画面（ads_management等が表示される）を見せて承認。
5. ダッシュボードに戻る → 「Generate Ad Copy」→ 生成結果を見せる。
6. 「Submit / Create Ad」→ 成功メッセージ。
7. Ads Manager を開き、`Growl_<日付>` のキャンペーンが **PAUSED** で作成されているのを見せる。

---

## 4. 申請する権限リスト（審査リクエストに「追加」するもの）

| 権限 | 用途 | 申請 |
|---|---|---|
| `ads_management` | ユーザー自身の広告アカウントにキャンペーン/広告を作成（PAUSED） | **必須** |
| `pages_manage_ads` | ユーザーのページからの広告クリエイティブ作成 | **必須** |
| `pages_read_engagement` | ユーザーが管理するページ一覧の取得（ページ選択用） | **必須** |
| `ads_read` | （任意）広告の状態読み取り。当面はsubmitのみなら見送り可 | 任意 |
| `business_management` | （任意）現状フローでは未使用。申請しない | 不要 |

> Marketing API Access Tier（レート上限のFull Access）は、過去15日で500回以上のAPI呼び出し＋エラー率15%未満が条件。
> 現在47回程度なので当面はLimitedのままでOK。ユーザーが増えてから申請すればよい（広告作成自体はLimitedでも可能）。

---

## 5. よくある却下理由と対策

- **用途が曖昧/汎用的** → 上記「What the app does」のように「ユーザー自身のアカウントで出稿する」と明記。
- **レビュアーが再現できない** → 上記Reviewer Instructionsを正確に。テスター追加の申し出も書く。
- **プライバシー/データ削除URL未設定** → 提出前チェックの2〜4を済ませる。
- **動画が不十分** → OAuth同意画面と、実際に広告が作られた証拠（Ads Managerの画面）を必ず映す。
