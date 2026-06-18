-- Support AI: support_tickets テーブルの作成
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_email text NOT NULL,
  sender_name text,
  subject text,
  body_text text NOT NULL,
  category text, -- 'FAQ', 'HUMAN', 'SPAM'
  ai_draft text,
  status text DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REPLIED', 'SPAM'
  message_id text, -- 元メールのMessage-ID（返信スレッド用）
  received_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (Row Level Security) の設定
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- サービスロールからのアクセスを許可するポリシー（Webhookなどバックエンドからの操作用）
CREATE POLICY "Allow service role access to support_tickets"
  ON public.support_tickets
  USING (true)
  WITH CHECK (true);

-- インデックスの作成（ステータス検索などを高速化）
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_received_at ON public.support_tickets(received_at DESC);
