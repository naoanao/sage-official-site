-- Waitlist signups for paid plan early access
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  plan_name   TEXT NOT NULL DEFAULT 'standard',
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by signup date
CREATE INDEX IF NOT EXISTS waitlist_signups_signed_up_at_idx
  ON waitlist_signups (signed_up_at DESC);

-- Enable RLS (only service role can read)
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Service role bypass (API routes use service role key)
-- No public SELECT/INSERT policies needed
