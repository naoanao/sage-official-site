-- TikTok OAuth tokens per device
CREATE TABLE IF NOT EXISTS user_tiktok_tokens (
  id              BIGSERIAL PRIMARY KEY,
  device_id       TEXT NOT NULL UNIQUE,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  open_id         TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  scope           TEXT,
  expires_at      TIMESTAMPTZ,
  refresh_expires_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_tiktok_tokens_device_id_idx ON user_tiktok_tokens(device_id);

-- TikTok video post log
CREATE TABLE IF NOT EXISTS tiktok_post_log (
  id          BIGSERIAL PRIMARY KEY,
  device_id   TEXT NOT NULL,
  publish_id  TEXT,
  video_url   TEXT,
  title       TEXT,
  direct_post BOOLEAN DEFAULT FALSE,
  status      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tiktok_post_log_device_id_idx ON tiktok_post_log(device_id);
