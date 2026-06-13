-- AI prompt templates (versioned per category)

CREATE TYPE ai_prompt_target_type AS ENUM ('SOLAR', 'ROOF', 'WALL', 'GENERAL');

CREATE TABLE ai_prompts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  target_type   ai_prompt_target_type NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt   TEXT NOT NULL,
  model         VARCHAR(100),
  is_active     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_prompts_target_type ON ai_prompts(target_type);
CREATE INDEX idx_ai_prompts_updated_at ON ai_prompts(updated_at DESC);

-- Only one active prompt per category
CREATE UNIQUE INDEX idx_ai_prompts_one_active_per_type
  ON ai_prompts (target_type)
  WHERE (is_active = true);
