# 本番デプロイ手順書 — ThermoInspect Report MVP

> 環境変数一覧: [`production-env.md`](production-env.md) / [`vercel-env.md`](vercel-env.md)  
> 公開前チェック: [`pre-launch-checklist.md`](pre-launch-checklist.md)

---

## 推奨アーキテクチャ

```
[ユーザー]
    ↓ HTTPS
[Vercel]  Frontend SPA + /api/* → プロキシ
    ↓
[Railway / Render]  Express API + Puppeteer PDF
    ↓
[Supabase]  PostgreSQL
```

Puppeteer による PDF 生成のため、API は Vercel Functions ではなく **常時起動の Node サーバー** にデプロイしてください。

---

## Step 0: 事前準備

| サービス | 用途 |
|----------|------|
| Supabase | PostgreSQL |
| Google Cloud Console | OAuth 2.0 |
| OpenAI | GPT-5.5（`LLM_MODEL=gpt-5.5`） |
| Railway / Render | バックエンド API |
| Vercel | フロントエンド |

テンプレート:

- ローカル: `.env.example` → `.env`
- 本番バックエンド: `.env.production.example` → ホストの環境変数

---

## Step 1: Supabase（PostgreSQL）

### 1-1. プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) → New Project
2. **Settings → Database → Connection string → URI**
3. **Direct connection**（ポート `5432`）を使用

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

> Pooler（6543）より Direct（5432）を推奨。SSL はアプリ側で `rejectUnauthorized: false` を設定済み。

### 1-2. マイグレーション

バックエンドの `DATABASE_URL` を Supabase URI に設定後:

```powershell
cd backend
npm.cmd run migrate
```

ステージング / デモ用にシード（本番は任意）:

```powershell
npm.cmd run seed
```

---

## Step 2: バックエンド（Railway / Render / Docker）

### 2-1. 必須環境変数

| 変数 | 本番値（プレースホルダー） |
|------|---------------------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase Direct URI |
| `JWT_SECRET` | 32 文字以上（ローカルと別値） |
| `FRONTEND_URL` | `https://YOUR_VERCEL_APP.vercel.app` |
| `GOOGLE_CALLBACK_URL` | `https://YOUR_VERCEL_APP.vercel.app/api/v1/auth/google/callback` |
| `GOOGLE_CLIENT_ID` | 本番 OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | 本番 OAuth Secret |
| `COOKIE_SAME_SITE` | `lax` |
| `LLM_API_KEY` | OpenAI API Key |
| `LLM_MODEL` | `gpt-5.5` |
| `LLM_API_URL` | `https://api.openai.com/v1` |

### 2-2. 永続ストレージ

Volume をマウントし以下を設定:

```
UPLOADS_DIR=/data/uploads
REPORTS_DIR=/data/reports
```

Volume 未設定の場合、再デプロイでアップロード画像・PDF が消失します。

### 2-3. Puppeteer（Linux ホスト）

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

Docker イメージには Chromium 同梱済み（`backend/Dockerfile` 参照）。

### 2-4. Docker デプロイ例

```powershell
cd backend
docker build -t thermo-inspect-api .
docker run -p 3000:3000 --env-file .env.production -v thermo-data:/data thermo-inspect-api
```

### 2-5. デプロイ後の検証

```powershell
cd backend
npm.cmd run verify:llm
npm.cmd run prod:verify
npm.cmd run security:audit
```

---

## Step 3: フロントエンド（Vercel）

### 3-1. プロジェクト設定

| 項目 | 値 |
|------|-----|
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build`（デフォルト） |

### 3-2. 環境変数

| 変数 | 値 |
|------|-----|
| `BACKEND_URL` | `https://YOUR_BACKEND.railway.app`（末尾スラッシュなし） |

Production / Preview 両方に設定。

詳細: [`vercel-env.md`](vercel-env.md)

### 3-3. ビルド時の動作

`frontend/scripts/prepare-vercel.mjs` が `vercel.json` を生成し、`/api/*` を `BACKEND_URL` へ rewrite します。  
これによりブラウザからは **同一オリジン** で API にアクセスでき、Cookie 認証が機能します。

### 3-4. Deploy

初回 Deploy 後、Production URL を控える（例: `https://thermo-inspect.vercel.app`）。

---

## Step 4: URL 確定後の差し替え

Vercel の Production URL が確定したら **必ず** 以下を更新:

| 設定場所 | 変数 / 項目 | 値 |
|----------|-------------|-----|
| バックエンド | `FRONTEND_URL` | `https://<vercel-domain>` |
| バックエンド | `GOOGLE_CALLBACK_URL` | `https://<vercel-domain>/api/v1/auth/google/callback` |
| Google Cloud Console | 承認済みリダイレクト URI | 同上 |
| Google Cloud Console | 承認済み JavaScript 生成元 | `https://<vercel-domain>` |
| Vercel | `BACKEND_URL` | バックエンド URL |

> 本番 URL 未確定の間は `YOUR_VERCEL_APP.vercel.app` プレースホルダーを使用可。Deploy 後に差し替え。

---

## Step 5: Google OAuth 本番設定

手順詳細: [`google-oauth-setup.md`](google-oauth-setup.md)

### 本番 Redirect URI

```
https://<vercel-domain>/api/v1/auth/google/callback
```

### 本番 JavaScript 生成元

```
https://<vercel-domain>
```

### 開発用（併記推奨）

```
http://localhost:5173/api/v1/auth/google/callback
http://localhost:5173
```

---

## Step 6: 動作確認

### 6-1. 認証

1. Vercel Production URL を開く
2. Google ログイン → ダッシュボード表示
3. DevTools → Application → Cookies → `token` が設定されていること

### 6-2. コアフロー

1. 案件作成
2. 画像アップロード（OVERVIEW / VISIBLE / INFRARED）
3. 異常記録 → AI 分析（GPT-5.5）
4. 報告書タブ → PDF 3 種生成

### 6-3. Safari 確認手順

iOS Safari（実機推奨）:

1. Vercel 本番 URL にアクセス
2. Google ログイン（Cookie 保持を確認 — ページ再読み込み後もログイン状態）
3. サンプル案件 → 報告書 → PDF 生成
4. PDF ダウンロード（Safari のダウンロードマネージャーで開けること）
5. 別タブで PDF を再ダウンロード（認証 Cookie が有効なこと）

> Safari ITP 対策: Vercel プロキシ同一オリジン + `COOKIE_SAME_SITE=lax` + `Secure`（本番）。

### 6-4. PDF 確認手順

**ローカル / ステージング:**

```powershell
cd backend
npm.cmd run verify:pdf
```

**本番（手動）:**

1. ログイン → 案件詳細 → 報告書タブ
2. 3 種類（SURVEY / CUSTOMER / SALES）をそれぞれ生成
3. 各 PDF をダウンロードし以下を目視確認:
   - 表紙（会社名・案件名・日付）
   - 異常一覧（画像・コメント）
   - ページ番号・フッター
4. Safari + Chrome 両方でダウンロード確認

---

## Step 7: Admin ユーザー

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@gmail.com';
```

---

## トラブルシューティング

| 症状 | 確認 |
|------|------|
| OAuth redirect_uri_mismatch | Google Console の URI と `GOOGLE_CALLBACK_URL` が完全一致 |
| ログイン後すぐログアウト | `FRONTEND_URL` が Vercel URL と一致 / Cookie `Secure` |
| CORS エラー | `FRONTEND_URL` 設定 / Vercel プロキシ経由で API 呼び出し |
| PDF 生成失敗 | Puppeteer / Chromium パス / メモリ制限 |
| AI 分析がテンプレートのみ | `LLM_API_KEY` + `LLM_MODEL=gpt-5.5` 設定 |
| DB 接続失敗 | Supabase Direct URI / IP 制限なし |

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [`production-env.md`](production-env.md) | 全環境変数一覧 |
| [`vercel-env.md`](vercel-env.md) | Vercel 専用 |
| [`google-oauth-setup.md`](google-oauth-setup.md) | OAuth 設定 |
| [`pre-launch-checklist.md`](pre-launch-checklist.md) | 公開前後チェック |
