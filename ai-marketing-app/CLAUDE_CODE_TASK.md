# Claude Code 作業指示 — Growl Sprint 1 仕上げ

## やること（上から順に実行）

### 1. ダッシュボードのDB書き込みバグ修正

`app/dashboard/page.tsx` の `handleComplete` を以下に書き換える。
localStorageしか更新していないので、DBにも書き込むようにする。

```typescript
async function handleComplete(index: number) {
  const sessionId = session?.id;
  if (!sessionId) return;

  updateActionComplete(index);
  const updated = loadSession();
  setSession(updated ? { ...updated } : null);

  try {
    await fetch("/api/complete-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, actionIndex: index, resultMemo: null }),
    });
  } catch (err) {
    console.error("complete-action failed:", err);
  }

  router.push(`/complete/${sessionId}?action=${index}`);
}
```

`handleComplete` を `async function` に変えたことで ActionCard の `onComplete` の型定義にエラーが出る場合は `(index: number) => void | Promise<void>` に修正する。

---

### 2. .env.local に CRON_SECRET を追加

`.env.local` に以下を追記する（既に他の環境変数は設定済み）：

```
CRON_SECRET=growl_cron_2026
NEXT_PUBLIC_LINE_BOT_URL=https://line.me/R/ti/p/@growl
```

---

### 3. Vercel 環境変数を設定

`vercel env add` コマンドで以下を本番環境に設定する。
値は `.env.local` から読み取ること。

```bash
cd ai-marketing-app

# 設定する環境変数一覧（.env.local の値をそのまま使う）
# LINE_CHANNEL_ACCESS_TOKEN
# LINE_CHANNEL_SECRET
# CRON_SECRET
# NEXT_PUBLIC_LINE_BOT_URL

# 一括で設定するコマンド（対話なしで実行）
vercel env add LINE_CHANNEL_ACCESS_TOKEN production <<< "+dryqG4FOQyhf0lmff1NoAOYgAG9EKgkaCCoDphOQQqfidiQPfgfyof4ZXYydGcjtpbYfXWF8Ko2yR7oqqwHjSmzU9/16qawA65PWkC1Ww21GTLQugdwYI+j01XG80XpNu0IB3IkH39doIHFa2FaEgdB04t89/1O/w1cDnyilFU="
vercel env add LINE_CHANNEL_SECRET production <<< "f55c93fee7d66533e1fe2f4c347b4a7e"
vercel env add CRON_SECRET production <<< "growl_cron_2026"
vercel env add NEXT_PUBLIC_LINE_BOT_URL production <<< "https://line.me/R/ti/p/@growl"
```

`vercel env add` が対話形式になる場合は `vercel env pull` で現在の状態を確認しながら進める。

---

### 4. TypeScript エラーチェック

```bash
cd ai-marketing-app
npx tsc --noEmit 2>&1
```

エラーがあれば修正する。

---

### 5. git commit & push

```bash
cd ai-marketing-app
git add -A
git commit -m "feat: dashboard DB write + LINE credentials + CRON_SECRET"
git push origin main
```

push後、Vercel のデプロイログを確認してエラーがないことを確認する：
```bash
vercel logs --follow
```

---

### 6. 動作確認（デプロイ完了後）

```bash
# cronエンドポイントのヘルスチェック
curl -s https://growl-ai.com/api/ping
```

200が返れば成功。

---

## 補足：既に完了している作業（触らなくてよい）

- `lib/db.ts` — 全関数実装済み
- `app/api/complete-action/route.ts` — DB書き込み実装済み
- `app/api/line/webhook/route.ts` — 完了キーワード検知・フィードバックループ実装済み
- `app/api/cron/notify/route.ts` — 月曜CRON実装済み
- `app/api/cron/feedback/route.ts` — 土曜CRON実装済み
- `lib/gemini.ts` — learning_history注入済み
- `vercel.json` — CRONスケジュール設定済み
- Supabaseマイグレーション — 完了済み
