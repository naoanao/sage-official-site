# Stripe × Cloudflare Pages 決済フロー 設定チェックリスト

Sageの購読ゲートを本番で動かすための設定一覧。
コードは完成済み。以下のCF/Stripe Dashboard操作だけで全フローが動く。

---

## Step 1: Cloudflare Pages — Environment Variables

[dash.cloudflare.com](https://dash.cloudflare.com) → Pages → `sage-official-site` → Settings → Environment variables → Production

| 変数名 | 値 | 場所 |
|--------|-----|------|
| `STRIPE_WEBHOOK_SECRET` | `.envの STRIPE_WEBHOOK_SECRET の値` | whsec_ssv8... |
| `MAKE_WEBHOOK_URL` | `.envの MAKE_WEBHOOK_URL の値` | https://hook.eu1.make.com/... |
| `TELEGRAM_BOT_TOKEN` | （任意）購入通知用 | .envの値 |
| `TELEGRAM_CHAT_ID` | （任意）購入通知用 | .envの値 |

設定後 → **Save** → **Deploy** （CF Pagesが再デプロイされる）

---

## Step 2: Cloudflare Pages — D1 Database Binding

同じページ → Settings → Functions → **D1 database bindings** → Add binding

| Binding name | D1 database |
|---|---|
| `SUBSCRIBERS_DB` | `sage-subscribers` |

> ⚠️ `sage-subscribers` データベースが未作成の場合は先に作る:
> ```bash
> npx wrangler d1 create sage-subscribers
> ```
> 表示されたDatabase IDをDEPLOY.mdのStep 2に記録しておく。

---

## Step 3: Cloudflare D1 — テーブル作成

ターミナルで1回だけ実行:

```bash
npx wrangler d1 execute sage-subscribers --command "
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'pro',
  status TEXT DEFAULT 'active',
  amount_usd INTEGER DEFAULT 20,
  created_at TEXT,
  updated_at TEXT
);"
```

---

## Step 4: Stripe Dashboard — Webhook登録

[dashboard.stripe.com](https://dashboard.stripe.com) → Developers → Webhooks → **Add endpoint**

| 設定 | 値 |
|-----|-----|
| Endpoint URL | `https://sage-official-site.pages.dev/api/webhook/stripe` |
| Events | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_failed` |

> ※ ngrokのURLではなくCF PagesのURLを使う（PC不要・常時稼働）

Webhook作成後、**Signing secret** をコピーして:
→ CF Pages Environment Variables の `STRIPE_WEBHOOK_SECRET` に設定（Step 1と同じ値になる）

---

## Step 5: 動作確認

1. `https://sage-official-site.pages.dev/sales` を開く
2. "Start Pro — $20/mo" をクリック → Stripeテスト決済（テストカード: 4242 4242 4242 4242）
3. `/thank-you` にリダイレクトされる
4. メールアドレスを入力してダッシュボードを開く
5. Telegramに「💰 新規サブスク購入！」通知が届く ✅

---

## 現在の状態（2026-04-14時点）

| 項目 | 状態 | 備考 |
|-----|------|------|
| Stripe webhook code | ✅ 完成 | `functions/api/webhook/stripe.js` |
| D1書き込みロジック | ✅ 完成 | `ON CONFLICT` upsert対応 |
| SubscriberGate | ✅ 完成 | D1未接続時はfail-open（誰でも入れる） |
| CF Pages env vars | ⚠️ 要設定 | Step 1を実施 |
| D1 binding | ⚠️ 要設定 | Step 2-3を実施 |
| Stripe Webhook登録 | ⚠️ 要確認 | Step 4を実施 |
