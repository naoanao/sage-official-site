# AIマーケティングアプリ Phase 1 MVP — 実装仕様書

## プロジェクト概要

**一行定義：** マーケを知らない人が、マーケを意識しないまま、ビジネスが成長し続けるアプリ

**North Star Metric：** 週次施策実行率（Weekly Action Execution Rate）
- 「今週やること3つ」を少なくとも1つ実行したユーザーの割合（週次）
- Phase 1 目標：30%以上

---

## テックスタック

```
フロントエンド : Next.js 14 (App Router) + Tailwind CSS
ホスティング  : Cloudflare Pages（または Vercel Hobby）
AIエンジン    : Gemini 2.5 Flash API（Google AI Studio・無料・CC不要）
データベース   : Supabase（PostgreSQL + Auth + Storage・無料枠）
LINE通知      : LINE Messaging API（コミュニケーションプラン・無料・200通/月）
認証          : Supabase Auth（メール）または LINE Login
```

---

## データベーススキーマ（Supabase）

```sql
-- ユーザー
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id    TEXT UNIQUE,
  email           TEXT UNIQUE,
  industry        TEXT NOT NULL,        -- 飲食/サロン/EC/士業/工務店/その他
  business_desc   TEXT,                 -- 「あなたの仕事を一言で」
  customer_desc   TEXT,                 -- 「お客さんはどんな人？」
  main_problem    TEXT,                 -- 「今一番困っていること」
  final_goal      TEXT,                 -- 「アプリが完璧に機能したとき、1日はどう変わる？」★重要
  plan            TEXT DEFAULT 'free',  -- free / standard / pro
  line_notify     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 週次セッション（毎週生成）
CREATE TABLE weekly_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  week_start      DATE NOT NULL,         -- その週の月曜日
  actions         JSONB NOT NULL,        -- [{title, detail, completed}] × 3
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 施策完了ログ（North Star Metric の計算に使用）
CREATE TABLE action_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  session_id      UUID REFERENCES weekly_sessions(id),
  action_index    INT NOT NULL,          -- 0/1/2
  completed_at    TIMESTAMPTZ DEFAULT now()
);

-- 月次レポート（月次バッチで生成）
CREATE TABLE monthly_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  month           DATE NOT NULL,
  execution_rate  FLOAT,                 -- その月の週次実行率平均
  actions_done    INT,
  summary         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 画面一覧（Page Router）

```
/                     → ランディングページ（業種選択 CTA）
/onboarding/industry  → Step 1: 業種選択（カード選択）
/onboarding/business  → Step 2: 仕事を一言で
/onboarding/customer  → Step 3: お客さんはどんな人？
/onboarding/problem   → Step 4: 今一番困っていること
/onboarding/goal      → Step 5: ★最後の1問（アプリが完璧に機能したとき）
/onboarding/line      → LINE通知設定（スキップ可）
/dashboard            → 今週やること3つ（メイン画面）
/complete/[id]        → 完了後の演出画面
/report               → 月次レポート（Freeはブラー + アップグレード誘導）
/upgrade              → 有料プラン案内
```

---

## オンボーディング仕様

### 業種テンプレート（industry別に質問と出力を最適化）

| industry値 | 表示名 | 特化する出力施策 |
|---|---|---|
| restaurant | 飲食店 | Googleマップ口コミ・Instagramリール |
| salon | 美容サロン | LINE公式・予約導線・リピート設計 |
| ec | EC・通販 | メールマーケ・同梱物・レビュー獲得 |
| professional | 士業・コンサル | ブログSEO・紹介設計・セミナー |
| construction | 工務店・建設 | 信頼醸成コンテンツ・事例発信 |
| other | その他 | 汎用マーケ施策 |

### 画面設計原則
- 1画面1問（Duolingo方式）
- プログレスバー表示（5問中◯問目）
- 「次へ」ボタンのみ（戻るは非推奨・UX複雑化を避ける）
- フレームワーク名（3C・STP・4P）は一切表示しない

---

## Gemini API 統合仕様

### エンドポイント
```
POST /api/generate-actions
```

### システムプロンプトテンプレート

```
あなたはマーケティングの専門家です。以下のユーザー情報をもとに、
「今週やること3つ」を生成してください。

【ルール】
- フレームワーク名（3C、STP、4P など）は絶対に使わない
- 専門用語を使わない
- 具体的な行動だけを書く（「分析する」ではなく「〇〇のレビューに返信する」）
- 1つのアクションは2行以内
- ユーザーの最終目標に近づく施策を最優先にする

【ユーザー情報】
業種: {industry}
仕事の内容: {business_desc}
お客さんの特徴: {customer_desc}
今一番困っていること: {main_problem}
このアプリが完璧に機能したとき、どう変わりたいか: {final_goal}

【出力形式（JSON）】
{
  "actions": [
    {"title": "短いタイトル（10文字以内）", "detail": "具体的な行動（50文字以内）"},
    {"title": "...", "detail": "..."},
    {"title": "...", "detail": "..."}
  ]
}
```

### API実装

```javascript
// lib/gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateWeeklyActions(user) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = buildSystemPrompt(user);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // JSONパース
  const json = JSON.parse(text.replace(/```json|```/g, "").trim());
  return json.actions;
}
```

---

## LINE通知仕様

### Webhook エンドポイント
```
POST /api/line/webhook
```

### 週次通知（毎週月曜 08:00 JST）

```javascript
// Cron: Cloudflare Workers または Vercel Cron
// スケジュール: 0 23 * * 0（UTC日曜23時 = JST月曜8時）

// メッセージテンプレート
const message = `今週も3つだけ。終わったら、あとは好きなことしてください 🙌

今週のあなたのマーケ：
1️⃣ {action1}
2️⃣ {action2}
3️⃣ {action3}

アプリで確認 → {app_url}/dashboard`;
```

### LINE Login フロー
1. `/api/line/auth` → LINE認証URL生成
2. LINE側でログイン → `/api/line/callback` にリダイレクト
3. access_token取得 → profile取得 → users テーブルに保存

---

## 無料→有料 転換導線

### Free制限
- 週次アクション生成：月3回まで
- 月次レポート：ブラー表示（アップグレード誘導）
- LINE通知：設定可能だが月3回のみ

### 転換UI仕様

```jsx
// components/FreeProgressBar.jsx
// ダッシュボード上部に常時表示
<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
  <p className="text-sm text-amber-800">
    今月あと <strong>{remaining}回</strong> で今月の上限です
  </p>
  <div className="mt-2 bg-amber-200 rounded-full h-2">
    <div
      className="bg-amber-500 h-2 rounded-full"
      style={{ width: `${(used / 3) * 100}%` }}
    />
  </div>
</div>

// 4週目のLINE通知に追記
const upgradeMessage = used >= 3
  ? `\n\n🎁 今だけ：1週間だけ全機能を無料開放中です\n→ {upgrade_url}`
  : "";
```

---

## 完了演出仕様

```jsx
// /complete/[session_id] 画面
// アクションを1つ完了した直後に表示

<div className="text-center py-12">
  <div className="text-5xl mb-4">✅</div>
  <h1 className="text-2xl font-bold text-gray-800">
    今週のマーケ、終わりました。
  </h1>
  <p className="text-gray-500 mt-2">
    次はAIに任せてください。
  </p>
</div>
```

---

## North Star Metric 計算

```sql
-- 週次施策実行率の計算（毎週月曜バッチ）
SELECT
  u.id,
  u.industry,
  COUNT(DISTINCT ac.session_id)::float /
  COUNT(DISTINCT ws.id)::float AS execution_rate
FROM users u
LEFT JOIN weekly_sessions ws ON ws.user_id = u.id
  AND ws.week_start >= now() - interval '4 weeks'
LEFT JOIN action_completions ac ON ac.session_id = ws.id
GROUP BY u.id, u.industry;
```

---

## 環境変数

```env
# .env.local
GEMINI_API_KEY=          # Google AI Studio で取得（CC不要）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
NEXT_PUBLIC_APP_URL=     # https://your-app.vercel.app
```

---

## ファイル構成（推奨）

```
/
├── app/
│   ├── page.tsx                    # ランディング
│   ├── onboarding/
│   │   ├── industry/page.tsx       # Step 1
│   │   ├── business/page.tsx       # Step 2
│   │   ├── customer/page.tsx       # Step 3
│   │   ├── problem/page.tsx        # Step 4
│   │   ├── goal/page.tsx           # Step 5 ★最重要
│   │   └── line/page.tsx           # LINE設定
│   ├── dashboard/page.tsx          # メイン画面
│   ├── complete/[id]/page.tsx      # 完了演出
│   └── report/page.tsx             # 月次レポート
├── api/
│   ├── generate-actions/route.ts   # Gemini呼び出し
│   ├── complete-action/route.ts    # 完了記録
│   ├── line/
│   │   ├── webhook/route.ts        # LINE Webhook
│   │   ├── auth/route.ts           # LINE Login
│   │   └── callback/route.ts      # LINE Login callback
│   └── cron/notify/route.ts        # 週次通知バッチ
├── lib/
│   ├── gemini.ts                   # Gemini API
│   ├── supabase.ts                 # Supabase client
│   └── line.ts                     # LINE API
└── components/
    ├── FreeProgressBar.tsx          # 転換導線
    ├── ActionCard.tsx               # アクションカード
    └── BlurredReport.tsx            # Freeのブラーレポート
```

---

## MVP 完成の定義（2週間以内）

- [ ] オンボーディング5問が動作する
- [ ] Gemini APIから「今週やること3つ」が生成される
- [ ] 完了ボタンが押せて完了演出が出る
- [ ] LINE通知が届く（テスト送信）
- [ ] Supabaseにデータが保存される
- [ ] 5人のターゲットユーザーに触らせて施策実行率を計測する

---

## 最初の一手

1. `npx create-next-app@latest ai-marketing-app --typescript --tailwind --app`
2. Google AI Studio で Gemini API キー取得（CC不要）
3. Supabase プロジェクト作成 → スキーマ実行
4. `.env.local` に API キーを設定
5. オンボーディング画面から実装開始
