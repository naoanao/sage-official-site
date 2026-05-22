-- Growl 売上イベント記録テーブル
-- Supabase SQL Editor で一度だけ実行してください
CREATE TABLE IF NOT EXISTS revenue_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id text,
  email text,
  stripe_session_id text UNIQUE,
  plan text NOT NULL,
  amount_jpy integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- インデックス（週次集計を速くするため）
CREATE INDEX IF NOT EXISTS idx_revenue_events_created_at ON revenue_events(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_events_plan ON revenue_events(plan);
