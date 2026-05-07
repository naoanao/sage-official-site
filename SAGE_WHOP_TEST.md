# Sage → Whop エンドツーエンドテスト指示書

## 目的
Sageのチャット→商品生成→Whop販売 の流れを実際に動かし、
**購入可能なWhop商品URLを取得する**。

---

## ステップ 1: Flaskサーバーを起動する

```bash
cd /Users/nao/Desktop/Sage_Final_Unified   # Windowsの場合は cd C:\Users\nao\Desktop\Sage_Final_Unified
.venv\Scripts\python backend\flask_server.py
```

または：
```bash
cd C:\Users\nao\Desktop\Sage_Final_Unified
.venv\Scripts\activate
python backend\flask_server.py
```

**待機**: `Running on http://0.0.0.0:8080` が表示されるまで待つ。
起動に失敗した場合はエラーログを確認して修正する。

---

## ステップ 2: サーバー疎通確認

```bash
curl -s http://localhost:8080/api/ping
```

`{"ok": true}` または 200が返れば次へ。
エラーの場合はポートや起動ログを確認。

---

## ステップ 3: /api/productize でプロダクトプランを生成

```bash
curl -s -X POST http://localhost:8080/api/productize \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"プロンプトエンジニアリングチートシート\",\"market\":\"JP\",\"price\":\"980\"}"
```

レスポンスの `plan` テキストを確認・保存する。

---

## ステップ 4: /api/whop/publish でWhopに商品を公開

**ステップ3のplanテキストを使って**以下を実行：

```bash
curl -s -X POST http://localhost:8080/api/whop/publish \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"プロンプトエンジニアリング完全チートシート\",
    \"description\": \"AIを使いこなすための厳選プロンプトテクニック集。ChatGPT・Gemini・Claude対応。すぐに使えるテンプレート30個収録。\",
    \"price_usd\": 6.99,
    \"dry_run\": false
  }"
```

**重要**: `dry_run: false` で本番Whopに公開される（WHOP_DRY_RUN=0は設定済み）。

期待するレスポンス：
```json
{
  "status": "success",
  "product_url": "https://whop.com/...",
  "checkout_url": "https://whop.com/checkout/...",
  "plan_id": "...",
  "whop_captions": "..."
}
```

---

## ステップ 5: 結果を報告

以下を出力してください：
- `product_url` (WhopのストアURL)
- `checkout_url` (購入ページURL)
- `whop_captions` (SNS用キャプション)
- エラーが出た場合はエラー内容と原因

---

## トラブルシューティング

### Whop APIエラーの場合
`backend/integrations/whop_publisher.py` を確認してエラー箇所を特定・修正する。

### ImportError / ModuleNotFound の場合
```bash
cd C:\Users\nao\Desktop\Sage_Final_Unified
.venv\Scripts\pip install -r requirements.txt
```

### ポート8080が使用中の場合
```bash
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

---

## 補足情報

- `.env` は `C:\Users\nao\Desktop\Sage_Final_Unified\.env` に設定済み
- `WHOP_API_KEY`, `WHOP_COMPANY_ID`, `WHOP_DRY_RUN=0` はすべて設定済み
- `GROQ_API_KEY`, `GEMINI_API_KEY` も設定済み
- Flaskサーバーは `backend/flask_server.py` から起動し port 8080 を使用
