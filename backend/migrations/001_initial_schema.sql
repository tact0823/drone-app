-- ThermoInspect Report: initial schema (users + future tables)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('operator', 'admin');
CREATE TYPE inspection_type AS ENUM ('SOLAR_PANEL', 'EXTERIOR_WALL', 'ROOF');
CREATE TYPE project_status AS ENUM ('draft', 'completed');
CREATE TYPE overall_score AS ENUM ('A', 'B', 'C', 'D', 'E');
CREATE TYPE solar_risk AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE image_type AS ENUM ('OVERVIEW', 'VISIBLE', 'INFRARED');
CREATE TYPE recommended_timing AS ENUM (
  'IMMEDIATE', 'WITHIN_6_MONTHS', 'WITHIN_1_YEAR', 'WITHIN_3_YEARS', 'MONITORING'
);
CREATE TYPE judgment_rank AS ENUM ('GOOD', 'CAUTION', 'BAD');
CREATE TYPE report_type AS ENUM ('SURVEY', 'CUSTOMER', 'SALES');
CREATE TYPE anomaly_type AS ENUM (
  'HOT_SPOT', 'COLD_SPOT', 'DELAMINATION', 'CRACK',
  'MOISTURE', 'INSULATION_DEFECT', 'DETERIORATION', 'OTHER'
);
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high');

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id  VARCHAR(255) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  role       user_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               VARCHAR(200) NOT NULL,
  inspection_type     inspection_type NOT NULL,
  site_name           VARCHAR(200) NOT NULL,
  inspection_date     DATE NOT NULL,
  location            VARCHAR(300),
  equipment           VARCHAR(200),
  weather             VARCHAR(100),
  notes               TEXT,
  client_name         VARCHAR(200),
  structure           VARCHAR(100),
  floors              VARCHAR(20),
  building_age        VARCHAR(50),
  roof_material       VARCHAR(100),
  overall_score       overall_score,
  auto_overall_score  overall_score,
  roof_life_min       INTEGER,
  roof_life_max       INTEGER,
  solar_risk          solar_risk,
  recommended_plans   JSONB,
  status              project_status NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_inspection_type ON projects(inspection_type);

CREATE TABLE images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename     VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type    VARCHAR(50) NOT NULL,
  file_size    INTEGER NOT NULL,
  width        INTEGER,
  height       INTEGER,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  image_type   image_type NOT NULL DEFAULT 'INFRARED',
  pair_id      UUID,
  direction    VARCHAR(10),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_project_id ON images(project_id);
CREATE INDEX idx_images_pair_id ON images(pair_id);

CREATE TABLE anomalies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_id             UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  type                 anomaly_type NOT NULL,
  comment              TEXT,
  ai_comment           TEXT,
  marker_x             FLOAT NOT NULL CHECK (marker_x >= 0 AND marker_x <= 1),
  marker_y             FLOAT NOT NULL CHECK (marker_y >= 0 AND marker_y <= 1),
  marker_w             FLOAT NOT NULL CHECK (marker_w > 0 AND marker_w <= 1),
  marker_h             FLOAT NOT NULL CHECK (marker_h > 0 AND marker_h <= 1),
  severity             severity_level NOT NULL DEFAULT 'medium',
  finding_number       INTEGER,
  overall_grade        overall_score,
  auto_overall_grade   overall_score,
  urgency_stars        INTEGER CHECK (urgency_stars >= 1 AND urgency_stars <= 5),
  recommended_timing   recommended_timing,
  judgment_rank        judgment_rank,
  direction            VARCHAR(10),
  check_content        VARCHAR(300),
  part_name            VARCHAR(100),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anomalies_project_id ON anomalies(project_id);
CREATE INDEX idx_anomalies_image_id ON anomalies(image_id);

CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  report_type  report_type NOT NULL,
  filename     VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  file_size    INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_project_id ON reports(project_id);
