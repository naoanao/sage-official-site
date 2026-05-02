-- ============================================================
-- Growl Sprint 1 Final Migration
-- 何度実行しても安全（冪等）
-- ============================================================

-- 1. action_completions に不足カラムを追加
--    (テーブル自体は schema.sql で作成済みのため ALTER で追加)
ALTER TABLE public.action_completions
  ADD COLUMN IF NOT EXISTS result_memo   text,
  ADD COLUMN IF NOT EXISTS result_rating smallint;

-- action_index に CHECK 制約がなければ追加
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.action_completions'::regclass
      AND contype = 'c'
      AND conname = 'action_completions_action_index_check'
  ) THEN
    ALTER TABLE public.action_completions
      ADD CONSTRAINT action_completions_action_index_check
      CHECK (action_index >= 0 AND action_index <= 2);
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_action_completions_session
  ON public.action_completions(session_id);

-- 2. users に learning_history カラムを追加
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS learning_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. users に feedback_state カラムを追加
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS feedback_state text;

-- 4. users に line_link_code カラムを追加
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS line_link_code text;

-- 5. weekly_sessions に completed_count カラムを追加
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS completed_count integer NOT NULL DEFAULT 0;

-- 6. RLS 設定
ALTER TABLE public.action_completions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'action_completions'
      AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON public.action_completions
      FOR ALL TO service_role USING (true);
  END IF;
END $$;
