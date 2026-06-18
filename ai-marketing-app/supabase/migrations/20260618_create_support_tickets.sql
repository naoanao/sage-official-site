-- Support Tickets table creation migration
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_email text NOT NULL,
  sender_name text,
  subject text,
  body_text text NOT NULL,
  language varchar(10) DEFAULT 'ja',
  category varchar(20), -- 'FAQ', 'HUMAN', 'SPAM'
  status varchar(20) DEFAULT 'pending_approval', -- 'pending_approval', 'sent', 'manual', 'ignored'
  ai_summary text,
  ai_draft text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying by sender email or status
CREATE INDEX IF NOT EXISTS idx_support_tickets_sender ON public.support_tickets(sender_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
