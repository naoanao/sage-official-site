-- Growl データベーススキーマ
-- Supabase Dashboard → SQL Editor で実行してください

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT UNIQUE NOT NULL,        -- ブラウザ固有ID（ログイン不要）
  industry        TEXT NOT NULL,
  business_desc   TEXT,
  customer_desc   TEXT,
  main_problem    TEXT,
  final_goal      TEXT,
  booking_url     TEXT,
  line_user_id    TEXT,                        -- LINE通知用（後で追加）
  plan            TEXT DEFAULT 'free',         -- free / standard / pro
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 週次セッションテーブル
CREATE TABLE IF NOT EXISTS weekly_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  actions         JSONB NOT NULL,              -- [{title, detail, content, content_type, completed}] × 3
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)                  -- 1ユーザー×1週に1セッション
);

-- アクション完了ログ
CREATE TABLE IF NOT EXISTS action_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES weekly_sessions(id) ON DELETE CASCADE,
  action_index    INT NOT NULL,
  completed_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS（Row Level Security）を無効化（MVP段階。本番前に有効化推奨）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE action_completions DISABLE ROW LEVEL SECURITY;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_user_id ON weekly_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_sessions_week_start ON weekly_sessions(week_start);
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);
