# Sage 3.0 — 完全デプロイ手順

> これを一度実行すれば、PCがオフでもSageは動き続けます。

---

## ステップ 1: ビルド + Git コミット + プッシュ

```powershell
# PC のターミナル (PowerShell) で実行
cd C:\Users\nao\Desktop\Sage_Final_Unified

# 念のためロックファイル削除
Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue

# フロントエンドをビルド
npm run build

# 変更ファイルをすべてステージング
git add `
  src/App.jsx `
  src/pages/ThankYou.jsx `
  src/pages/SageOS.jsx `
  src/pages/SubscriberGate.jsx `
  src/pages/Landing.jsx `
  functions/api/verify-subscription.js `
  functions/api/webhook/stripe.js `
  workers/ `
  dist/ `
  DEPLOY.md

git commit -m "feat: SaaS subscription gate + SNS workers + cloud webhook"
git push origin main
```

Cloudflare Pages は `git push` 後に **自動ビルド・デプロイ** されます（約2分）。

---

## ステップ 2: Cloudflare Pages — バインディング設定

[CF Pages Dashboard](https://dash.cloudflare.com) → `sage-ai` → Settings → Environment variables

### Environment Variables (Production)

| 変数名 | 値 |
|--------|-----|
| `STRIPE_WEBHOOK_SECRET` | `.env` の `STRIPE_WEBHOOK_SECRET` の値 |
| `MAKE_WEBHOOK_URL` | `.env` の `MAKE_WEBHOOK_URL` の値 |
| `TELEGRAM_BOT_TOKEN` | `.env` の `TELEGRAM_BOT_TOKEN` の値 |
| `TELEGRAM_CHAT_ID` | `778654915` |

### D1 Database Binding

Settings → Functions → D1 database bindings → Add binding

| Binding name | D1 database |
|---|---|
| `SUBSCRIBERS_DB` | `sage-subscribers` |

> ⚠️ バインディング追加後は必ず **Save** → **Deploy** を行う

---

## ステップ 3: SNS Worker デプロイ

```powershell
cd C:\Users\nao\Desktop\Sage_Final_Unified\workers\sage-sns-worker

# 初回のみ: Wranglerにログイン
wrangler login

# ワンショットデプロイ (デプロイ + シークレット設定)
.\deploy.ps1
```

**確認URL:**
- `https://sage-sns-worker.{あなたのサブドメイン}.workers.dev/` → ステータス確認
- `https://sage-sns-worker.{あなたのサブドメイン}.workers.dev/run` → 手動テスト実行

---

## ステップ 4: Content Replenisher Worker デプロイ

```powershell
cd C:\Users\nao\Desktop\Sage_Final_Unified\workers\sage-content-replenisher

.\deploy.ps1
```

**確認URL:**
- `https://sage-content-replenisher.{サブドメイン}.workers.dev/status` → プール残数確認
- `https://sage-content-replenisher.{サブドメイン}.workers.dev/run` → 今すぐ補充実行

---

## ステップ 5: Stripe Webhook 確認

[Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks

既存の Webhook エンドポイントが以下を指していること:
```
https://sage-official-site.pages.dev/api/webhook/stripe
```

> ✅ ローカルFlaskではなくCloudflare Pagesのエッジ関数が処理します。PCオフでも動作。

---

## ステップ 6: 動作テスト

### 購入フローテスト
1. ブラウザで `https://sage-official-site.pages.dev/sales` を開く
2. "Start Pro — $20/mo" をクリック → Stripeテスト決済
3. `/thank-you` にリダイレクトされること確認
4. "Sage AI を開く" → `/dashboard` に遷移すること確認
5. Telegram に購入通知が届くこと確認

### SNSワーカーテスト
```
GET https://sage-sns-worker.{subdomain}.workers.dev/run
```
→ `{"status":"success"}` または `{"status":"skipped","reason":"no_content"}` が返ること

### コンテンツ補充テスト
```
GET https://sage-content-replenisher.{subdomain}.workers.dev/status
```
→ `{"pending_items": N, "target": 14}` が返ること

---

## 自動実行スケジュール (PCオフでも動く)

| 処理 | スケジュール | 場所 |
|------|-------------|------|
| SNS自動投稿 | 毎日 09:00 JST | CF Worker (sage-sns-worker) |
| コンテンツ補充 | 毎週日曜 20:00 JST | CF Worker (sage-content-replenisher) |
| Stripe Webhook | リアルタイム | CF Pages Function |
| ウェルカムメール | 購入直後 | Make.com |

---

## トラブルシューティング

### Workers デプロイ後に "Script not found" エラー
```powershell
wrangler whoami   # ログイン状態確認
wrangler deploy   # 再デプロイ
```

### Stripe Webhook 署名エラー (401)
→ CF Pages の `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認

### Notionに投稿されない
→ `/run` でテスト → ログを確認 → `NOTION_API_KEY` と `NOTION_CONTENT_POOL_DB_ID` を確認

### ダッシュボードゲートが通らない
→ メールアドレスが D1 `subscribers` テーブルに存在しない場合
→ CF Pages の `SUBSCRIBERS_DB` D1 バインディングを確認

---

*最終更新: 2026-03-25*
