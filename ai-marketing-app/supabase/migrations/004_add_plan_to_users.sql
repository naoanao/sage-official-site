-- usersテーブルにプラン管理カラムを追加
-- Stripeサブスクリプション連携用

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- plan の値を制限
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users
  ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'standard', 'pro'));

-- stripe_customer_id でも引けるようにインデックス
CREATE INDEX IF NOT EXISTS users_stripe_customer_id_idx
  ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_email_idx
  ON users (email)
  WHERE email IS NOT NULL;
