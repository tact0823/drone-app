# Google OAuth セットアップ手順 — ThermoInspect Report

本アプリは **Google OAuth 2.0 + JWT（HttpOnly Cookie）** で認証します。  
フロントは `/api/v1/auth/google` へ遷移し、Vite（開発）または Vercel プロキシ（本番）経由でバックエンドのコールバックを受けます。

---

## 1. Google Cloud Console 設定手順

### 1-1. プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. 上部のプロジェクト選択 → **新しいプロジェクト**
3. プロジェクト名（例: `ThermoInspect Report`）を入力 → **作成**

### 1-2. OAuth 同意画面

1. **API とサービス** → **OAuth 同意画面**
2. User Type: **外部**（社内 Google Workspace のみなら「内部」も可）
3. **アプリ名**: `ThermoInspect Report`
4. **ユーザーサポートメール**: 自分のメール
5. **デベロッパーの連絡先情報**: 自分のメール
6. **保存して続行**
7. **スコープ**: デフォルトのまま（`openid`, `email`, `profile` は Client 側で要求）
8. **テストユーザー**（外部 + テスト公開前）: ログインさせたい Gmail を追加
9. **保存して続行** → **ダッシュボードに戻る**

> 本番公開前は「テスト」状態のため、**テストユーザーに登録した Google アカウントのみ**ログインできます。

---

## 2. OAuth Client 作成

1. **API とサービス** → **認証情報**
2. **+ 認証情報を作成** → **OAuth クライアント ID**
3. アプリケーションの種類: **ウェブアプリケーション**
4. 名前: `ThermoInspect Web`（任意）
5. **承認済みの JavaScript 生成元** と **承認済みのリダイレクト URI** を下記セクション 3 のとおり登録
6. **作成**
7. 表示された **クライアント ID** と **クライアント シークレット** を控える

---

## 3. Redirect URI 一覧（Google Console に登録）

### 承認済み JavaScript 生成元

| 環境 | URI |
|------|-----|
| ローカル開発 | `http://localhost:5173` |
| 本番（Vercel） | `https://<your-vercel-domain>` |

例: `https://thermo-inspect.vercel.app`

### 承認済みリダイレクト URI

| 環境 | URI |
|------|-----|
| ローカル開発（Vite プロキシ経由・**推奨**） | `http://localhost:5173/api/v1/auth/google/callback` |
| 本番（Vercel `/api` プロキシ経由・**推奨**） | `https://<your-vercel-domain>/api/v1/auth/google/callback` |
| ローカル（バックエンド直叩き・任意） | `http://localhost:3000/api/v1/auth/google/callback` |

> **重要:** Google に登録する URI と、`.env` の `GOOGLE_CALLBACK_URL`（または `FRONTEND_URL` から自動生成される値）が **完全一致** している必要があります。

---

## 4. `.env` に設定する値

リポジトリ直下 `.env`（`.env.example` をコピー）に設定します。

### 共通（必須）

| 変数 | 説明 | 例 |
|------|------|-----|
| `JWT_SECRET` | 32 文字以上のランダム文字列 | `your-long-random-secret...` |
| `GOOGLE_CLIENT_ID` | OAuth クライアント ID | `123456789-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth クライアント シークレット | `GOCSPX-xxxxxxxx` |

### ローカル開発

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# 省略可 — FRONTEND_URL から自動生成されます
GOOGLE_CALLBACK_URL=http://localhost:5173/api/v1/auth/google/callback

COOKIE_SAME_SITE=lax
JWT_SECRET=<32文字以上>
GOOGLE_CLIENT_ID=<Client ID>
GOOGLE_CLIENT_SECRET=<Client Secret>
DATABASE_URL=<PostgreSQL 接続文字列>
```

### 本番（バックエンド: Railway / Render 等）

```env
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
GOOGLE_CALLBACK_URL=https://your-app.vercel.app/api/v1/auth/google/callback
COOKIE_SAME_SITE=lax
JWT_SECRET=<本番用ランダム文字列>
GOOGLE_CLIENT_ID=<Client ID>
GOOGLE_CLIENT_SECRET=<Client Secret>
DATABASE_URL=<本番 PostgreSQL>
```

### Vercel（フロントのみ）

| 変数 | 値 |
|------|-----|
| `BACKEND_URL` | バックエンド URL（例 `https://thermo-api.railway.app`、末尾スラッシュなし） |

---

## 5. localhost と本番 URL の両対応

1. **Google Console** に上記 **両方の Redirect URI** を登録（ローカル + 本番）
2. **同じ OAuth Client**（Client ID / Secret）をローカル `.env` と本番バックエンドの環境変数で共用可能
3. 環境ごとに **`FRONTEND_URL` のみ切り替え** — `GOOGLE_CALLBACK_URL` は未設定なら `{FRONTEND_URL}/api/v1/auth/google/callback` として自動解決
4. 開発: フロント `npm run dev`（5173）+ バックエンド `npm run dev`（3000）。ログインボタンは Vite プロキシ経由
5. 本番: Vercel が `/api/*` をバックエンドへプロキシ → Cookie は同一オリジン（`SameSite=Lax`）

### 認証フロー（概要）

```
/login → GET /api/v1/auth/google → Google ログイン
       → GET /api/v1/auth/google/callback → JWT Cookie 設定
       → /auth/callback → /dashboard
```

---

## 6. 動作確認

```powershell
# バックエンド
cd backend
npm.cmd run typecheck
npm.cmd run test
npm.cmd run dev

# 別ターミナル: フロント
cd frontend
npm.cmd run dev
```

1. `http://localhost:5173/login` を開く
2. **Google でログイン** をクリック
3. Google アカウント選択 → ダッシュボードへ遷移すること

OAuth 設定確認 API:

```
GET /api/v1/auth/config
→ { "googleOAuthEnabled": true, "callbackUrl": "..." }
```

一括検証:

```powershell
cd backend
npm.cmd run prod:verify
```

Step 7（Google OAuth 設定 / ログイン）が ✅ になることを確認。

---

## 7. トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `redirect_uri_mismatch` | Google Console の URI と `.env` 不一致 | セクション 3 の URI を再確認 |
| `oauth_not_configured` | Client ID / Secret 未設定 | `.env` に `GOOGLE_CLIENT_ID` / `SECRET` を設定 |
| `state_mismatch` | Cookie ブロック / 別タブ | 同一ブラウザで再試行。Safari の Cookie 設定確認 |
| `access_denied` | テストユーザー未登録 | OAuth 同意画面でテストユーザー追加 |
| ログイン後 `/login?error=cookie_blocked` | サードパーティ Cookie 制限 | 同一オリジン構成（Vercel プロキシ）を使用 |

---

## 関連ドキュメント

- 認証設計: `docs/06-auth-design.md`
- 本番環境変数: `docs/production-env.md`
