# ThermoInspect Report



ドローン赤外線点検の **営業支援型報告書** Web アプリ（MVP）。



## 技術スタック



| レイヤー | 技術 |

|----------|------|

| フロントエンド | React + TypeScript + Vite + TailwindCSS |

| バックエンド | Node.js + Express + TypeScript + Puppeteer |

| データベース | PostgreSQL |



## 前提条件



- Node.js 20+

- PostgreSQL 14+

- npm（Windows PowerShell では `npm.cmd` を使用）



---



## ローカル開発



### 1. セットアップ



```powershell

copy .env.example .env

# .env を編集（DATABASE_URL, JWT_SECRET, Google OAuth 等）



cd frontend

npm.cmd install



cd ..\backend

npm.cmd install

npm.cmd run migrate

```



### 2. 開発サーバー起動



```powershell

# ターミナル 1 — バックエンド (port 3000)

cd backend

npm.cmd run dev



# ターミナル 2 — フロントエンド (port 5173)

cd frontend

npm.cmd run dev

```



ブラウザで http://localhost:5173 を開く。Vite プロキシが `/api` をバックエンドへ転送します。



### 3. テストデータ投入



Google OAuth で一度ログインした後、自分のメールに紐付けてシード:



```powershell

cd backend

# .env に SEED_USER_EMAIL=your@gmail.com を設定（任意）

npm.cmd run seed

```



投入内容:



| 項目 | 内容 |

|------|------|

| 案件 | 【サンプル】嶋口様邸 太陽光パネル点検 |

| 画像 | OVERVIEW / VISIBLE / INFRARED（プレースホルダ JPEG） |

| 異常 | HOT_SPOT（高）+ DELAMINATION（中） |



### 4. PDF 生成フロー自動検証



```powershell

cd backend

npm.cmd run verify:pdf

```



案件作成 → 画像 → 異常 → 評価 → PDF 3 種（SURVEY / CUSTOMER / SALES）を一括確認します。



### 5. 本番確認（`DATABASE_URL` 設定後）



```powershell

cd backend

npm.cmd run prod:verify

```



PostgreSQL 接続 → マイグレーション → Seed → サンプルデータ → OAuth → PDF 3 種を一括検証します。



---



## ビルド・テスト



```powershell

# フロントエンド

cd frontend

npm.cmd run build



# バックエンド

cd ..\backend

npm.cmd run typecheck

npm.cmd run build

npm.cmd run test

npm.cmd run security:audit



# E2E (Playwright)

cd ..\e2e

npm.cmd install

npm.cmd test

```



---



## 本番デプロイ



| ドキュメント | 内容 |
|-------------|------|
| [`docs/deploy-guide.md`](docs/deploy-guide.md) | デプロイ手順（Vercel / Backend / Supabase / OAuth / Safari / PDF） |
| [`docs/production-env.md`](docs/production-env.md) | バックエンド環境変数一覧 |
| [`docs/vercel-env.md`](docs/vercel-env.md) | Vercel 環境変数 |
| [`docs/pre-launch-checklist.md`](docs/pre-launch-checklist.md) | 公開前後チェック・残 Issue・次 Phase |

テンプレート: `.env.example`（ローカル） / `.env.production.example`（本番バックエンド）



### 推奨構成



```

[ユーザー] → Vercel (Frontend + /api プロキシ) → Railway/Render (Backend API)

                                              → Neon/Supabase (PostgreSQL)

```



Puppeteer PDF 生成のため **API は Vercel 以外**（Railway / Render / Docker）を推奨。



### Step 1: PostgreSQL



Neon / Supabase / Railway 等で DB を作成し `DATABASE_URL` を取得。



### Step 2: バックエンド（Railway / Render / Docker）



**Docker 例:**



```powershell

cd backend

docker build -t thermo-inspect-api .

docker run -p 3000:3000 --env-file .env.production thermo-inspect-api

```



**必須環境変数（抜粋）:**



| 変数 | 値 |

|------|-----|

| `NODE_ENV` | `production` |

| `DATABASE_URL` | PostgreSQL 接続文字列 |

| `JWT_SECRET` | 32 文字以上のランダム文字列 |

| `FRONTEND_URL` | `https://drone-app-gamma.vercel.app` |

| `GOOGLE_CALLBACK_URL` | `https://drone-app-production-54a7.up.railway.app/api/v1/auth/google/callback` |

| `LLM_MODEL` | `gpt-5.5` |

| `COOKIE_SAME_SITE` | `lax`（Vercel プロキシ構成） |



永続ストレージ: `UPLOADS_DIR` / `REPORTS_DIR` を Volume にマウント。



デプロイ後: `npm run migrate` を実行。



### Step 3: フロントエンド（Vercel）



1. Vercel で **Root Directory = `frontend`** のプロジェクトを作成

2. Environment Variables に設定:



| 変数 | 値 |

|------|-----|

| `BACKEND_URL` | バックエンド URL（例 `https://thermo-api.railway.app`、末尾スラッシュなし） |



3. Deploy — ビルド時に `scripts/prepare-vercel.mjs` が `vercel.json` を生成し `/api/*` をバックエンドへプロキシ



**Google OAuth:**



- 承認済みリダイレクト URI: `https://<vercel-domain>/api/v1/auth/google/callback`

- 承認済み JavaScript 生成元: `https://<vercel-domain>`



### Step 4: 動作確認



1. Vercel URL で Google ログイン

2. ダッシュボード → サンプル案件（`npm run seed` 済み）または新規作成

3. 報告書タブ → PDF 生成 → ダウンロード

4. iOS Safari で PDF ダウンロード確認



### Step 5: Admin ユーザー



```sql

UPDATE users SET role = 'admin' WHERE email = 'your@gmail.com';

```



### Vercel 公開後に差し替える箇所



| 設定 | 差し替え内容 |
|------|-------------|
| バックエンド `FRONTEND_URL` | Vercel Production URL |
| バックエンド `GOOGLE_CALLBACK_URL` | `https://<vercel-domain>/api/v1/auth/google/callback` |
| Google Cloud Console | 本番 Redirect URI / JS 生成元 |
| Vercel `BACKEND_URL` | バックエンド本番 URL |
| PDF `COMPANY_*` | 実会社情報 |

詳細: [`docs/pre-launch-checklist.md`](docs/pre-launch-checklist.md)



---



## プロジェクト構成



```

drone-app/

├── docs/              # 設計書・進捗・本番 env 一覧

├── frontend/          # React + Vite（Vercel デプロイ）

│   ├── vercel.template.json

│   └── scripts/prepare-vercel.mjs

├── backend/           # Express API（Railway / Docker）

│   ├── Dockerfile

│   └── scripts/       # seed, verify:pdf, security-audit

├── e2e/               # Playwright E2E

├── CLAUDE.md

└── .env.example

```



## 設計ドキュメント



`docs/` 配下にサービス概要・DB・API・認証・セキュリティ等。進捗は `docs/progress.md`。



## MVP ステータス



**Phase 0〜5 完了** — 本番デプロイ可能。インフラ設定・URL 差し替え後に公開。

