# 3. DB 設計

## ER 図（概要）

```
users ──────────────< projects ──────────────< images
  │                      │                       │
  │ role                 │ inspection_type       │
  │ google_id            │                       │
  │                      └───────< reports       │
  │                      │                       │
  │                      └───────< anomalies >───┘
  │                                              │
  │                                              └── ai_comment
  │
  └── role: operator | admin
```

---

## テーブル定義

### users

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| id | UUID | PK | ユーザー ID |
| google_id | VARCHAR(255) | UNIQUE, NOT NULL | Google OAuth sub（一意識別子） |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Google アカウントのメール |
| name | VARCHAR(100) | NOT NULL | Google プロフィール名 |
| avatar_url | VARCHAR(500) | | Google プロフィール画像 URL |
| role | user_role | NOT NULL, DEFAULT 'operator' | ユーザーロール |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

#### role（ユーザーロール）

| 値 | 説明 |
|----|------|
| `operator` | 点検オペレーター。自分のプロジェクトのみ操作可能（デフォルト） |
| `admin` | 管理者。全ユーザー閲覧 + 自分のプロジェクト操作 |

> 初回 Google OAuth ログイン時は `operator` で自動作成。  
> `admin` への昇格は DB 直接または Admin 機能（Post-MVP）で行う。

```sql
CREATE TYPE user_role AS ENUM ('operator', 'admin');

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
```

---

### projects

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| id | UUID | PK | プロジェクト ID |
| user_id | UUID | FK → users.id, NOT NULL | 作成者 |
| title | VARCHAR(200) | NOT NULL | プロジェクト名 |
| inspection_type | inspection_type | NOT NULL | 点検種別 |
| site_name | VARCHAR(200) | NOT NULL | 点検現場名 |
| inspection_date | DATE | NOT NULL | 点検日 |
| location | VARCHAR(300) | | 場所（住所等） |
| equipment | VARCHAR(200) | | 使用機材 |
| weather | VARCHAR(100) | | 天候 |
| notes | TEXT | | 所見・メモ |
| client_name | VARCHAR(200) | | 依頼者名（○○様） |
| structure | VARCHAR(100) | | 構造（木造等） |
| floors | VARCHAR(20) | | 階数 |
| building_age | VARCHAR(50) | | 築年数 |
| roof_material | VARCHAR(100) | | 屋根材質（残寿命推定用） |
| overall_score | overall_score | | 総合評価 A〜E（確定値） |
| auto_overall_score | overall_score | | 総合評価 A〜E（自動算出値） |
| roof_life_min | INTEGER | | 推定残寿命 下限（年） |
| roof_life_max | INTEGER | | 推定残寿命 上限（年） |
| solar_risk | solar_risk | | 発電リスク 低/中/高 |
| recommended_plans | JSONB | | 推奨工事プラン（3 段階） |
| status | project_status | NOT NULL, DEFAULT 'draft' | ステータス |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### inspection_type（点検種別）

| 値 | 名称 |
|----|------|
| `SOLAR_PANEL` | 太陽光パネル |
| `EXTERIOR_WALL` | 外壁 |
| `ROOF` | 屋根 |

```sql
CREATE TYPE inspection_type AS ENUM ('SOLAR_PANEL', 'EXTERIOR_WALL', 'ROOF');
CREATE TYPE project_status AS ENUM ('draft', 'completed');
CREATE TYPE overall_score AS ENUM ('A', 'B', 'C', 'D', 'E');
CREATE TYPE solar_risk AS ENUM ('LOW', 'MEDIUM', 'HIGH');

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
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_inspection_type ON projects(inspection_type);
```

---

### images

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| id | UUID | PK | 画像 ID |
| project_id | UUID | FK → projects.id, NOT NULL | 所属プロジェクト |
| filename | VARCHAR(255) | NOT NULL | 元ファイル名 |
| storage_path | VARCHAR(500) | NOT NULL | 保存パス |
| mime_type | VARCHAR(50) | NOT NULL | `image/jpeg` / `image/png` |
| file_size | INTEGER | NOT NULL | バイト数 |
| width | INTEGER | | ピクセル幅 |
| height | INTEGER | | ピクセル高 |
| sort_order | INTEGER | NOT NULL, DEFAULT 0 | 表示順 |
| image_type | image_type | NOT NULL, DEFAULT 'INFRARED' | 画像種別 |
| pair_id | UUID | | 可視↔赤外線ペア ID |
| direction | VARCHAR(10) | | 撮影方位（N/E/S/W 等） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

#### image_type（画像種別）

| 値 | 用途 |
|----|------|
| `OVERVIEW` | 表紙・全景マップ |
| `VISIBLE` | 可視画像（詳細ページ） |
| `INFRARED` | 赤外線画像（詳細ページ） |

```sql
CREATE TYPE image_type AS ENUM ('OVERVIEW', 'VISIBLE', 'INFRARED');

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
```

---

### anomalies

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| id | UUID | PK | 異常 ID |
| project_id | UUID | FK → projects.id, NOT NULL | 所属プロジェクト |
| image_id | UUID | FK → images.id, NOT NULL | 対象画像 |
| type | anomaly_type | NOT NULL | 異常種別コード |
| comment | TEXT | | 確定コメント（手動編集後） |
| ai_comment | TEXT | | AI 生成コメント（参考用に保持） |
| marker_x | FLOAT | NOT NULL | マーカー X 座標（0.0〜1.0 正規化） |
| marker_y | FLOAT | NOT NULL | マーカー Y 座標 |
| marker_w | FLOAT | NOT NULL | マーカー幅 |
| marker_h | FLOAT | NOT NULL | マーカー高さ |
| severity | severity_level | NOT NULL, DEFAULT 'medium' | 重要度 |
| finding_number | INTEGER | | 報告書内連番 |
| overall_grade | overall_score | | 異常ごとの A〜E |
| auto_overall_grade | overall_score | | 自動算出 A〜E |
| urgency_stars | INTEGER | CHECK 1-5 | 緊急度 ★1〜5 |
| recommended_timing | recommended_timing | | 推奨対応時期 |
| judgment_rank | judgment_rank | | 判定ランク（太陽光別紙用） |
| direction | VARCHAR(10) | | 撮影方位 |
| check_content | VARCHAR(300) | | チェック内容 |
| part_name | VARCHAR(100) | | 部位名（例: 屋根北面） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

```sql
CREATE TYPE overall_score AS ENUM ('A', 'B', 'C', 'D', 'E');
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

CREATE TABLE anomalies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_id   UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  type       anomaly_type NOT NULL,
  comment    TEXT,
  ai_comment TEXT,
  marker_x   FLOAT NOT NULL CHECK (marker_x >= 0 AND marker_x <= 1),
  marker_y   FLOAT NOT NULL CHECK (marker_y >= 0 AND marker_y <= 1),
  marker_w   FLOAT NOT NULL CHECK (marker_w > 0 AND marker_w <= 1),
  marker_h   FLOAT NOT NULL CHECK (marker_h > 0 AND marker_h <= 1),
  severity   severity_level NOT NULL DEFAULT 'medium',
  finding_number INTEGER,
  overall_grade overall_score,
  auto_overall_grade overall_score,
  urgency_stars INTEGER CHECK (urgency_stars >= 1 AND urgency_stars <= 5),
  recommended_timing recommended_timing,
  judgment_rank judgment_rank,
  direction  VARCHAR(10),
  check_content VARCHAR(300),
  part_name  VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anomalies_project_id ON anomalies(project_id);
CREATE INDEX idx_anomalies_image_id ON anomalies(image_id);
```

---

### reports

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| id | UUID | PK | 報告書 ID |
| project_id | UUID | FK → projects.id, NOT NULL | 所属プロジェクト |
| user_id | UUID | FK → users.id, NOT NULL | 生成者 |
| report_type | report_type | NOT NULL | 報告書種別 |
| filename | VARCHAR(255) | NOT NULL | PDF ファイル名 |
| storage_path | VARCHAR(500) | NOT NULL | 保存パス |
| file_size | INTEGER | | バイト数 |
| generated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 生成日時 |

```sql
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
```

---

## インデックス方針

- 外部キー列には必ずインデックスを付与
- `users.google_id` / `users.email` は UNIQUE 制約で自動インデックス
- `users.role` — Admin 一覧クエリ用
- `projects.inspection_type` — 種別フィルタ用
- 全文検索は MVP では不要

## マイグレーション方針

- `node-pg-migrate` または Prisma Migrate を使用（Phase 0 で選定）
- マイグレーションファイルは `backend/migrations/` に配置
- 破壊的変更は Phase 完了後のみ許可
