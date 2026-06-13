-- Email/password login for admin users (Phase 1)

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;
