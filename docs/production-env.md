# 本番環境変数一覧 — ThermoInspect Report

> ローカル: `.env.example`  
> 本番バックエンド: `.env.production.example`  
> Vercel: [`vercel-env.md`](vercel-env.md)  
> デプロイ手順: [`deploy-guide.md`](deploy-guide.md)

---

## アーキテクチャ（推奨）

| コンポーネント | ホスティング | 理由 |
|---------------|-------------|------|
| フロントエンド | **Vercel** | Vite SPA + `/api` リバースプロキシ |
| バックエンド API | **Railway / Render / Fly.io** | Puppeteer + ファイルストレージ |
| PostgreSQL | **Railway PostgreSQL** | 同一プロジェクト内 Private 接続 |

Vercel の `/api/*` をバックエンドへプロキシすることで **Cookie 同一オリジン** を維持できます。

---

## Vercel（フロントエンド）

| 変数 | 必須 | 説明 | 例 |
|------|------|------|-----|
| `BACKEND_URL` | ✅ | API ベース URL（**末尾スラッシュなし**） | `https://YOUR_BACKEND.railway.app` |

詳細: [`vercel-env.md`](vercel-env.md)

---

## バックエンド（Railway / Render 等）

### サーバー

| 変数 | 必須 | 説明 | 本番例 |
|------|------|------|--------|
| `NODE_ENV` | ✅ | `production` | `production` |
| `PORT` | — | ホストが注入 | `3000` |
| `FRONTEND_URL` | ✅ | CORS / OAuth リダイレクト先 | `https://drone-app-gamma.vercel.app` |

### 認証

| 変数 | 必須 | 説明 |
|------|------|------|
| `JWT_SECRET` | ✅ | 32 文字以上のランダム文字列（ローカルと別値） |
| `JWT_EXPIRES_IN` | — | デフォルト `24h` |
| `GOOGLE_CLIENT_ID` | ✅ | `890322517305-aou15age95rsgs4jeil7k194gmd7ee99.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ✅ | ローカル `.env` と同じ（Railway Variables にも設定） |
| `GOOGLE_CALLBACK_URL` | ✅ | `https://drone-app-production-54a7.up.railway.app/api/v1/auth/google/callback` |
| `COOKIE_SAME_SITE` | ✅ | Vercel プロキシ構成: `lax` |

### Railway PostgreSQL `DATABASE_URL`

| 変数 | 必須 | 説明 |
|------|------|------|
| `DATABASE_URL` | ✅ | Railway Postgres 接続文字列 |

**Railway 上の API サービス（推奨）**

```
${{Postgres.DATABASE_URL}}
```

または Private URL:

```
postgresql://postgres:[PASSWORD]@postgres.railway.internal:5432/railway
```

> `postgres.railway.internal` は **Railway プロジェクト内からのみ** 接続可能。SSL 不要。

**ローカル開発 / migrate / prod:verify**

Postgres サービス → **Connect → Public Network** の URL を使用:

```
postgresql://postgres:[PASSWORD]@[HOST].rlwy.net:[PORT]/railway
```

> Public URL は SSL 自動有効（`*.rlwy.net`）。パスワードに `@ # % & / ? +` 等がある場合は **URL エンコード**必須。

### OpenAI GPT-5.5

| 変数 | 必須 | 説明 |
|------|------|------|
| `LLM_API_KEY` | 推奨 | 未設定時はテンプレート診断コメント |
| `LLM_API_URL` | — | デフォルト `https://api.openai.com/v1` |
| `LLM_MODEL` | 推奨 | **`gpt-5.5`**（異常分析・診断コメント） |

検証:

```powershell
cd backend
npm.cmd run verify:llm
```

### ストレージ

| 変数 | 必須 | 説明 |
|------|------|------|
| `UPLOADS_DIR` | 推奨 | 画像保存（Volume 推奨: `/data/uploads`） |
| `REPORTS_DIR` | 推奨 | PDF 保存（Volume 推奨: `/data/reports`） |
| `PUPPETEER_EXECUTABLE_PATH` | Linux | `/usr/bin/chromium` 等 |

### PDF 表紙

| 変数 | 説明 |
|------|------|
| `COMPANY_NAME` | 表紙・フッター |
| `COMPANY_ADDRESS` | |
| `COMPANY_PHONE` | |
| `COMPANY_WEBSITE` | |

---

## ローカル vs 本番

| 変数 | ローカル (`.env`) | 本番 (バックエンド) |
|------|-------------------|---------------------|
| `FRONTEND_URL` | `http://localhost:5173` | `https://drone-app-gamma.vercel.app` |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5173/api/v1/auth/google/callback` | `https://drone-app-production-54a7.up.railway.app/api/v1/auth/google/callback` |
| `NODE_ENV` | `development` | `production` |
| `DATABASE_URL` | ローカル PG または Railway Public URL | Railway Private / `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | 開発用 | **本番専用の別値** |

> Vercel Deploy 後の本番 URL: `https://drone-app-gamma.vercel.app`。詳細: [`pre-launch-checklist.md`](pre-launch-checklist.md)

---

## Google OAuth 本番設定

- [ ] 承認済みリダイレクト URI: `https://<vercel-domain>/api/v1/auth/google/callback`
- [ ] 承認済み JavaScript 生成元: `https://<vercel-domain>`
- [ ] 開発用 URI も併記（ローカル開発継続用）

手順: [`google-oauth-setup.md`](google-oauth-setup.md)

---

## セキュリティ設定確認

| 項目 | 設定 |
|------|------|
| `.env` / `.env.production` | `.gitignore` 対象 |
| CORS | `FRONTEND_URL` のみ許可（`cors.ts`） |
| Cookie | `httpOnly` + `secure`（本番）+ `sameSite: lax` |
| Rate Limit | API / OAuth / AI 各エンドポイント |
| ログ | API キー・Secret は出力しない |

```powershell
cd backend
npm.cmd run security:audit
```

---

## 検証コマンド

```powershell
cd backend
npm.cmd run typecheck
npm.cmd run build
npm.cmd run verify:llm
npm.cmd run verify:pdf
npm.cmd run prod:verify
npm.cmd run security:audit
```
