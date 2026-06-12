# Growl Sprint 1 — Claude Code 作業指示書

## 前提・完了済みの作業
- DBマイグレーション済み（`action_completions`, `users.learning_history`, `users.feedback_state`, `users.line_link_code`, `weekly_sessions.completed_count`）
- `lib/db.ts` : `markActionComplete`, `appendLearningHistory`, `setFeedbackState`, `getUserByLineId`, `getWeeklySessionForUser` 実装済み
- `app/api/complete-action/route.ts` : DBへの書き込み実装済み
- `app/api/line/webhook/route.ts` : 完了キーワード検知・フィードバックループ実装済み
- `app/api/cron/feedback/route.ts` : 土曜フィードバックCRON実装済み
- `lib/gemini.ts` : `learning_history` をプロンプトに注入済み
- `vercel.json` : 月曜CRON + 土曜CRONのスケジュール設定済み

---

## 残り作業（優先度順）

### 🔴 最優先: ダッシュボードのDB書き込みバグ修正

**ファイル**: `app/dashboard/page.tsx`

**問題**: `handleComplete` がlocalStorageを更新するだけでDBに書き込んでいない。

**修正内容**: `handleComplete` を以下に差し替える。

```typescript
async function handleComplete(index: number) {
  const sessionId = session?.id;
  if (!sessionId) return;

  // localStorageを更新
  updateActionComplete(index);
  const updated = loadSession();
  setSession(updated ? { ...updated } : null);

  // DBにも書き込む（バックグラウンド）
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

`handleComplete` の定義を `async function` に変更し、`onComplete={handleComplete}` を渡しているActionCardのpropsも確認して型エラーが出ないようにすること。

---

### 🔴 最優先: Vercel環境変数の確認・追加

以下の環境変数がVercelプロジェクトに設定されているか確認し、不足があれば追加すること。
現在 `.env.local` に存在しない変数は別途ユーザーへ確認する。

| 変数名 | 説明 | 現状 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini API | ✅ .env.localにあり |
| `GROQ_API_KEY` | Groq API | ✅ .env.localにあり |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | ✅ あり |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名Key | ✅ あり |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role | ✅ あり |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot トークン | ❌ **空** — ユーザーへ確認 |
| `LINE_CHANNEL_SECRET` | LINE Bot シークレット | ❌ **空** — ユーザーへ確認 |
| `CRON_SECRET` | Vercel CRON認証 | ❌ **未設定** — 任意の文字列でOK |
| `NEXT_PUBLIC_LINE_BOT_URL` | LINE友達追加URL | ❌ **未設定** — LINE公式アカウントのURL |
| `NEXT_PUBLIC_APP_URL` | アプリURL | ✅ あり (https://growl-ai.com) |

`LINE_CHANNEL_ACCESS_TOKEN` と `LINE_CHANNEL_SECRET` はLINE Developersコンソールから取得する必要がある。  
ユーザーに確認するまでLINE関連機能はスキップしてよい。

`CRON_SECRET` は自動生成して `.env.local` に追加し、Vercelにも同じ値を設定すること：
```
CRON_SECRET=growl_cron_2026
```

---

### 🟡 重要: TypeScriptエラーがないか確認

```bash
cd ai-marketing-app
npx tsc --noEmit
```

エラーがあれば修正すること。特に以下を確認：
- `dashboard/page.tsx` の `handleComplete` が `async` になったことによる型変更
- `ActionCard` の `onComplete` プロップが `(index: number) => void` か `(index: number) => Promise<void>` か

---

### 🟡 重要: `/api/admin` エンドポイントのセキュリティ確認

```bash
cat app/api/admin/route.ts
```

`CRON_SECRET` または管理者チェックが実装されているか確認。なければ追加。

---

### 🟢 あれば: LINE連携後のダッシュボード表示

`app/dashboard/page.tsx` にLINE連携状態の表示を追加する。

- localStorageに `growl_device_id` がある場合、`/api/line/status?device_id=xxx` を叩く
- LINE未連携なら「LINEと連携して毎週自動で受け取る」バナーを表示（`/onboarding/line` へのリンク）
- LINE連携済みなら「✅ LINE連携済み」を表示

---

### 🟢 最後: git commit & push

```bash
cd ai-marketing-app
git add -A
git commit -m "fix: dashboard calls complete-action API + CRON_SECRET"
git push origin main
```

Vercelへの自動デプロイを確認すること。

---

## 動作確認チェックリスト

デプロイ完了後に以下を手動で確認する：

- [ ] オンボーディング → 業種選択 → 5問回答 → アクション生成 → ダッシュボード表示
- [ ] ダッシュボードで「完了」ボタンタップ → Supabase `action_completions` にレコードが追加される
- [ ] Supabase `weekly_sessions.completed_count` が増える
- [ ] `/api/ping` が200を返す
- [ ] LINE_CHANNEL_ACCESS_TOKEN設定後: LINE友達追加 → 6桁コード送信 → 連携完了メッセージ

---

## ファイル構成（参考）

```
ai-marketing-app/
├── app/
│   ├── api/
│   │   ├── complete-action/route.ts   ✅ 修正済み
│   │   ├── cron/
│   │   │   ├── notify/route.ts        ✅ 実装済み
│   │   │   └── feedback/route.ts      ✅ 実装済み
│   │   ├── generate-actions/route.ts  ✅ 既存
│   │   ├── line/
│   │   │   ├── webhook/route.ts       ✅ 修正済み
│   │   │   ├── link/route.ts          ✅ 既存
│   │   │   └── status/route.ts        ✅ 既存
│   ├── dashboard/page.tsx             🔴 handleCompleteのDB書き込みが未実装
│   └── onboarding/line/page.tsx       ✅ 既存
├── lib/
│   ├── db.ts                          ✅ 全関数実装済み
│   ├── gemini.ts                      ✅ learning_history注入済み
│   └── line.ts                        ✅ 既存
└── vercel.json                        ✅ CRONスケジュール設定済み
```
