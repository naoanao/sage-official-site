-- ============================================================
-- Growl Sprint 1 Schema Migration
-- 実行場所: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. action_completions テーブル（完了ログ）
-- weekly_sessions.actions JSONBの更新だけでなく、
-- いつ・誰が・どのアクションを完了したかを別テーブルにも残す
CREATE TABLE IF NOT EXISTS public.action_completions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      uuid NOT NULL REFERENCES public.weekly_sessions(id) ON DELETE CASCADE,
  action_index    integer NOT NULL CHECK (action_index >= 0 AND action_index <= 2),
  completed_at    timestamptz NOT NULL DEFAULT now(),
  result_memo     text,        -- 「反応どうでしたか？」の返答内容
  result_rating   smallint     -- 1〜5の効果評価（将来用）
);

CREATE INDEX IF NOT EXISTS idx_action_completions_session
  ON public.action_completions(session_id);

-- 2. users テーブルに learning_history カラムを追加
-- 過去に効いたアクションのサマリーをJSON配列で蓄積する
-- 例: [{"week":"2026-04-28","action":"リピーター限定LINEを送る","result":"反応良かった、クーポン使用3件"}]
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS learning_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. users テーブルに feedback_state カラムを追加
-- LINEフィードバック収集の状態管理用
-- null = 通常状態
-- "waiting_feedback:{sessionId}:{actionIndex}" = フィードバック待ち
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS feedback_state text;

-- 4. weekly_sessions に完了数サマリーカラム（optional, for dashboard）
ALTER TABLE public.weekly_sessions
  ADD COLUMN IF NOT EXISTS completed_count integer NOT NULL DEFAULT 0;

-- 5. RLS（Row Level Security）設定
-- action_completions は service role からのみ書き込み可
ALTER TABLE public.action_completions ENABLE ROW LEVEL SECURITY;

-- service role は全操作OK（既存のbypassでカバーされるが明示）
CREATE POLICY IF NOT EXISTS "service_role_all" ON public.action_completions
  FOR ALL TO service_role USING (true);

-- anon/authenticated はSELECTのみ自分のセッション分
-- （今はfrontendから直接叩かないので最小権限でOK）
