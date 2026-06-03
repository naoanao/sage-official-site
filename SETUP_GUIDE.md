# Sage AI — セットアップガイド（購入者向け）

> **このツールはあなた専用です。**
> あなた自身のBluesky・Instagram・ブログに毎日自動投稿する、あなただけのAIパイプラインです。

---

## 必要なもの（最小構成）

| 項目 | 内容 | 費用 |
|------|------|------|
| Python 3.9+ | [python.org](https://www.python.org/downloads/) | 無料 |
| Node.js 18+ | [nodejs.org](https://nodejs.org/) | 無料 |
| Groq APIキー | [console.groq.com](https://console.groq.com/) | 無料 |
| Bluesky アカウント | [bsky.app](https://bsky.app) | 無料 |
| Cloudflare アカウント | [cloudflare.com](https://cloudflare.com) | 無料 |

---

## ステップ1 — セットアップスクリプトを実行する

```bash
# このフォルダに移動して実行
python setup.py
```

対話形式で必要なAPIキーを聞かれます。あとで変更したい場合は `.env` ファイルを直接編集してください。

---

## ステップ2 — APIキーの取得場所

### Groq（AI生成エンジン・必須）
1. [console.groq.com](https://console.groq.com/) にアクセス
2. API Keys → Create API Key
3. `GROQ_API_KEY` に貼り付け

### Bluesky（SNS自動投稿）
1. Blueskyアプリ → Settings → Privacy and Security → App Passwords
2. **Add App Password**（メインパスワードではない！）
3. `BLUESKY_HANDLE` = `yourname.bsky.social`、`BLUESKY_APP_PASSWORD` = アプリパスワード

### Notion（コンテンツプール管理）
1. [notion.so/my-integrations](https://www.notion.so/my-integrations) → New integration
2. 名前をつけて → Submit → Internal Integration Token をコピー
3. コンテンツプール用のデータベースを作成し、インテグレーションをシェア
4. データベースURL末尾の32文字が `NOTION_CONTENT_POOL_DB_ID`

### Telegram（完了通知・推奨）
1. Telegramで `@BotFather` を開く → `/newbot` → Bot名・ユーザー名を入力
2. 表示された Token を `TELEGRAM_BOT_TOKEN` に設定
3. `@userinfobot` にメッセージを送ると Chat ID が表示される → `TELEGRAM_CHAT_ID`

### Cloudflare（クラウドデプロイ）
1. [dash.cloudflare.com](https://dash.cloudflare.com) → Profile → API Tokens
2. **Create Token** → **Edit Cloudflare Workers** テンプレートを選択
3. `CF_API_TOKEN` に設定
4. Account ID は URL `dash.cloudflare.com/[ここ]` から取得

---

## ステップ3 — ローカルで起動する

**Windows:**
```powershell
.\run_sage.ps1
```

**Mac / Linux:**
```bash
python backend/flask_server.py &
open http://localhost:8080
```

ブラウザで `http://localhost:8080` にアクセスするとダッシュボードが表示されます。

---

## ステップ4 — SNS自動投稿Workerをデプロイする

毎朝9時（JST）に自動でBluesky・Instagramに投稿するWorkerをCloudflareにデプロイします。

```bash
cd workers/sage-sns-worker
npx wrangler login    # 初回のみ
.\deploy.ps1          # Windows
# または
npm run deploy        # Mac/Linux
```

デプロイ後、Cloudflare Dashboardで以下のSecretを設定:

| Secret名 | 値 |
|---------|-----|
| `NOTION_API_KEY` | あなたのNotionトークン |
| `NOTION_CONTENT_POOL_DB_ID` | コンテンツプールのDB ID |
| `GROQ_API_KEY` | あなたのGroqキー |
| `BLUESKY_HANDLE` | あなたのBlueskyハンドル |
| `BLUESKY_APP_PASSWORD` | アプリパスワード |
| `TELEGRAM_BOT_TOKEN` | 通知用（任意） |
| `TELEGRAM_CHAT_ID` | 通知先（任意） |

---

## ステップ5 — Cloudflare Pagesにデプロイする（任意）

PCが落ちていてもダッシュボードにアクセスできるようにします。

```bash
npm run build
npx wrangler pages deploy dist --project-name sage-ai
```

---

## ステップ6 — コンテンツプールを準備する

Notionのコンテンツプールデータベースに投稿したいトピックを追加します。

各ページに以下のプロパティを設定:
- **Name**: トピックタイトル（例: "ChatGPTで副業する3つの方法"）
- **Status**: `予約済み`（Workerがここから取得します）
- **Category**: ジャンル（例: "AI", "Side Income"）

14件以上あれば2週間分のストックになります。コンテンツリプレニッシャーWorkerが毎週日曜日に自動補充します。

---

## ステップ7 — 購入者へのウェルカムメール自動化（Make.com）

Sage には Make.com の Blueprint（自動化シナリオ設定ファイル）が同梱されています。
これを使うと、**Stripeで決済が完了した瞬間に購入者へGmailでウェルカムメールが自動送信**されます。

### インポート手順

1. [make.com](https://make.com) にアカウント登録（無料プランでOK）
2. 左メニュー **Scenarios** → 右上 **Import Blueprint**
3. 同梱の `make_blueprint_welcome_email.json` をアップロード
4. シナリオが開いたら **Gmail モジュール**（Send an Email）をクリック

### ⚠️ Gmail接続が必要です（必須）

Blueprint にはGmail接続設定が含まれていますが、**あなた自身のGmailアカウントに差し替える必要があります。**

1. Gmail モジュール右上の **接続名** をクリック → **Add**
2. Googleアカウントでログイン → Make.comへのアクセスを許可
3. 接続が追加されたら選択して **OK**
4. 右上 **Save** → **Activate** でシナリオを有効化

> **注意**: Blueprint内のOAuth接続情報は開発者アカウントのものです。そのままでは動きません。必ずステップ4で自分のGmailに接続してください。

### Webhook URLの設定

シナリオ内の **Webhookモジュール**（Custom Webhook）をクリックし、表示されたURLをコピーして：

- Sage の `.env` ファイルの `MAKE_WEBHOOK_URL=` に貼り付け
- Flaskを再起動

---

## よくある質問

**Q: Flaskサーバーを常に起動しておく必要がありますか？**
A: SNS自動投稿にはFlaskは不要です（Cloudflare Workerが動くので）。コンテンツ生成ダッシュボードを使うときだけ起動すれば大丈夫です。

**Q: ダッシュボードが英語で表示されます**
A: `backend/config/identity.json` の `language` を `ja` に変更して再起動してください。

**Q: Instagramは対応していますか？**
A: Businessアカウント + Facebookページ連携が必要です。個人アカウントは非対応です。

**Q: APIキーを変えたいときは？**
A: `.env` ファイルを直接編集してFlaskを再起動してください。Workerのキーは `wrangler secret put KEY_NAME` で更新します。

---

## トラブルシューティング

**Flaskが起動しない場合:**
```bash
pip install -r backend/requirements.txt --break-system-packages
python backend/flask_server.py
```

**Bluesky投稿が失敗する場合:**
- App Password が正しいか確認（メインパスワードではなくApp Password）
- `SAGE_ENABLE_BLUESKY=1` になっているか確認

**NotionのDB IDが分からない場合:**
- NotionのデータベースページURLの末尾: `notion.so/[workspace]/[ここ32文字]?v=...`

---

## サポート

問題が解決しない場合は、購入したプラットフォーム経由でお問い合わせください。

---

*Sage AI — あなた専用のAI自動化パイプライン*
