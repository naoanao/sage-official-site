# Sage SaaS Template

Sage本体はデジタル商品（購入者が自分でデプロイするツール）として設計されています。
このディレクトリは、**将来の新しいSaaS商品を作るときに使い回せる**テンプレートとして保存されています。

---

## このテンプレートに含まれるもの

```
saas-template/
├── frontend/
│   └── SubscriberGate.jsx        ← React製のサブスク認証ゲート
├── functions/
│   └── api/
│       ├── verify-subscription.js ← Cloudflare Pages Function: メール認証
│       ├── customer-portal.js     ← Cloudflare Pages Function: 顧客ポータル
│       └── webhook/
│           └── stripe.js          ← Stripeのwebhookハンドラー
└── backend/
    └── stripe_saas_routes.py      ← FlaskのStripe/SaaS APIルート集
```

---

## 新しいSaaS商品に転用するときの手順

### 1. Cloudflare D1 にSubscribersテーブルを作成

```sql
CREATE TABLE IF NOT EXISTS subscribers (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT,
  email                 TEXT NOT NULL,
  plan                  TEXT DEFAULT 'pro',
  status                TEXT DEFAULT 'active',
  amount_usd            REAL DEFAULT 0,
  created_at            TEXT,
  updated_at            TEXT
);
CREATE INDEX IF NOT EXISTS idx_email ON subscribers(email);
```

Cloudflare Dashboardで実行:
```
D1 → <DB名> → Console → 上記SQLを貼り付けてExecute
```

### 2. 必要な環境変数（Cloudflare Pages / Worker Secrets）

| 変数名 | 説明 |
|--------|------|
| `STRIPE_SECRET_KEY` | Stripe秘密キー |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook署名シークレット |
| `MAKE_WEBHOOK_URL` | Make.comのウェルカムメールシナリオURL |
| `CLOUDFLARE_API_TOKEN` | D1に書き込むためのCFトークン |
| `TELEGRAM_BOT_TOKEN` | 通知用（任意） |
| `TELEGRAM_CHAT_ID` | 通知先（任意） |

### 3. App.jsxへのゲート組み込み

```jsx
import SubscriberGate from './saas-template/frontend/SubscriberGate'

// ダッシュボードをゲートで囲む
<Route path="/dashboard" element={<SubscriberGate />} />
```

### 4. Stripe Webhook の登録

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://<your-domain>/api/webhook/stripe`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

---

## 設計思想

- **CF Pages Functions** がStripe webhookを受け取り、D1に書き込む
- **verify-subscription.js** がメールアドレスでサブスク状態を確認
- **SubscriberGate.jsx** がフロントエンドでゲートを実装
- Flaskバックエンドは不要（エッジネイティブ設計）

---

## Sage本体との関係

Sage本体は**デジタル商品**（購入者が自分のアカウントでデプロイ）です。
このSaaSテンプレートは、**Sageが生成・管理する新しいSaaS商品**に使います。

例:
- Sage → コンテンツ生成・SNS自動投稿 → **デジタル商品として販売**
- 将来の新商品 → このテンプレートを使ってSaaSとして展開
