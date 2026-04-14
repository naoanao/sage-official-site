# Sage AI — テクニカルサポートFAQ
> 対象: AI・自動化に関心がある技術者・エンジニア向け購入者
> AIサポートボットとメール自動応答が参照する知識ベース

---

## セットアップ・環境

**Q: 必要な環境は？**
A: Python 3.9+、Node.js 18+、ngrok（無料アカウント）、Cloudflareアカウント（無料）。OSはWindows/Mac/Linux対応。Windowsで動作確認済み。`python setup_verify.py` を実行すると全環境を自動チェックできます。

**Q: setup.pyを実行したが途中でエラーが出た**
A: まず `python setup_verify.py` を実行してください。全テストを自動実行し、失敗した箇所に具体的な修正方法を表示します。それでも解決しない場合はエラーログ（`logs/flask_stderr.log`）をサポートメールに添付してください。

**Q: セットアップにどのくらいかかりますか？**
A: 環境が整っていれば半日（4〜6時間）を目安にしてください。最も時間がかかるのはInstagram Graph API のMeta Developer登録（審査なしで設定完了まで30〜60分）とCloudflare Workers 2本のデプロイです。Bluesky＋ブログのみの最小構成なら1〜2時間で動きます。

**Q: Mac/Linuxでも動きますか？**
A: 動きます。`run_sage.ps1`はWindows専用ですが、`python backend/flask_server.py` で起動できます。Cloudflare WorkersとD1は全OS共通です。

---

## APIキー・認証

**Q: Groq APIが `401 Unauthorized` になる**
A: https://console.groq.com → API Keys から新しいキーを作成してください。`.env`の`GROQ_API_KEY=`を更新後、Flaskを再起動。

**Q: Blueskyが `Invalid identifier or password` になる**
A: `BLUESKY_APP_PASSWORD`はアカウントのメインパスワードではなくアプリパスワードを使ってください。bsky.app → Settings → Privacy and Security → App Passwords → Add App Password。

**Q: Instagram tokenのエラーが出る**
A: Instagram long-lived tokenは60日で失効します。`python backend/modules/instagram_token_refresher.py` を実行するか、Meta Developer Dashboardで新しいトークンを発行し`.env`の`INSTAGRAM_ACCESS_TOKEN`を更新してください。

**Q: Notion APIが `object not found` になる**
A: DBをインテグレーションにShareし忘れているケースが最多です。Notionで対象DBを開く → 右上「…」→ Connections → 作成したインテグレーションを追加。

**Q: `TELEGRAM_BOT_TOKEN` は必須ですか？**
A: 任意です。設定しない場合は通知機能が無効になりますが、自動投稿・コンテンツ生成は問題なく動きます。後から設定可能。

---

## Cloudflare Workers

**Q: `wrangler deploy` で `Authentication error` が出る**
A: `npx wrangler login` でCloudflareに再ログインしてください。ブラウザが開いて認証できます。

**Q: Workerデプロイ後、Secretを設定したが反映されない**
A: `wrangler secret put KEY_NAME` 後は自動的に反映されます。反映まで30秒ほどかかります。`wrangler tail` でリアルタイムログを確認できます。

**Q: D1 databaseの `SUBSCRIBERS_DB` バインディングとは？**
A: Stripe購入者のメールアドレスを管理するデータベースです。Cloudflare Pages Dashboard → Settings → Functions → D1 database bindings から設定します。D1は `wrangler d1 create sage-subscribers` で作成してください。

**Q: WorkerのCronが動いていない**
A: Cloudflare Dashboard → Workers → sage-sns-worker → Triggers → Cron Triggers で `0 0 * * *`（UTC 0:00 = JST 9:00）が設定されているか確認。設定がなければ追加してください。

---

## ローカル起動・Flask

**Q: Flask起動時に `ModuleNotFoundError` が出る**
A: `pip install -r backend/requirements.txt --break-system-packages` を実行してください。`--break-system-packages`フラグが必要な場合があります（Ubuntu等）。

**Q: Port 8080がすでに使用中と言われる**
A: `run_sage.ps1` は自動でポートを解放しますが、手動で解放する場合: Windows: `netstat -ano | findstr :8080` → `taskkill /PID [PID番号] /F`。Mac/Linux: `lsof -i :8080 | kill -9 [PID]`。

**Q: ngrokのURLが毎回変わる**
A: ngrok無料プランでは静的ドメインが1つ無料で使えます。https://dashboard.ngrok.com/domains → New Domain → 取得したドメインを `.env` の `NGROK_STATIC_DOMAIN` に設定。

**Q: ダッシュボードの`SAGE_MOCK_MODE=true`は何ですか？**
A: `true`の場合、外部API呼び出しをシミュレートします（実際には投稿しません）。本番運用では`SAGE_MOCK_MODE=false`に変更してください。

---

## コンテンツ生成・SNS投稿

**Q: ブログ記事が生成されるが公開されない**
A: `BlogScheduler`は`SAGE_ENABLE_BLOG=1`が設定されている必要があります。また`git push`権限（GitHubトークン）とCloudflare Pages連携の設定が必要です。`logs/blog_scheduler.log`を確認してください。

**Q: Instagramへの投稿がpendingのまま**
A: `jobs.json`に積まれたジョブは`SageJobRunner`（1日最大3件）が処理します。`python -c "from backend.scripts.job_runner import SageJobRunner; r=SageJobRunner(); print(r.process_pending())"` で手動実行できます。

**Q: MarketScanでインドネシア語のキーワードが出る**
A: 最新版（2026-04-14以降）では言語フィルターで除外済みです。古いバージョンの場合は`market_scan_agent.py`を更新してください。

**Q: `SAGE_DRY_RUN=true`の状態で実際に投稿したい**
A: `.env`の`SAGE_DRY_RUN=false`に変更してFlaskを再起動してください。

---

## SOUL.md・カスタマイズ

**Q: コンテンツのトーンを自分のブランドに合わせたい**
A: `SOUL.md`の「人格・コミュニケーションスタイル」セクションを編集してください。変更後はFlaskを再起動しなくても次回のコンテンツ生成から反映されます（`soul_loader.py`が毎回読み込みます）。

**Q: 日本語と英語を切り替えたい**
A: `backend/config/identity.json`の`"language"`フィールドを`"ja"`または`"en"`に変更してください。`"auto"`にするとトピックの言語を自動検出します。

---

## サポート

**このFAQで解決しない場合:**
1. `python setup_verify.py` を実行してレポートを確認
2. `logs/` フォルダ内のエラーログを確認
3. エラーログを添付して **support@sage-ai.app** にメール
   → AIが24時間以内に技術的な回答を返します

**緊急停止（暴走した場合）:**
プロジェクトのルートに `SAGE_STOP` という空ファイルを作成すれば全自律機能が即座に停止します。
