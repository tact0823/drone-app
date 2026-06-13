# Railway 環境変数 — 一括設定

> ローカル `.env` と **同じ値** を Railway API サービスに設定してください。  
> シークレット（`JWT_SECRET` / `GOOGLE_CLIENT_SECRET` / `LLM_API_KEY`）は Git にコミットしません。

---

## 設定場所

Railway Dashboard → **API サービス** → **Variables**

Postgres サービスとは別です。**Express API が動くサービス** に設定します。

---

## 必須 Variables（コピー用）

| 変数 | 値 |
|------|-----|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | ローカル `.env` と同じ |
| `JWT_EXPIRES_IN` | `24h` |
| `FRONTEND_URL` | `https://drone-app-gamma.vercel.app` |
| `GOOGLE_CLIENT_ID` | `890322517305-aou15age95rsgs4jeil7k194gmd7ee99.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ローカル `.env` と同じ（再発行した場合は最新値） |
| `GOOGLE_CALLBACK_URL` | `https://drone-app-production-54a7.up.railway.app/api/v1/auth/google/callback` |
| `COOKIE_SAME_SITE` | `none` |
| `LLM_API_KEY` | ローカル `.env` と同じ |
| `LLM_API_URL` | `https://api.openai.com/v1` |
| `LLM_MODEL` | `gpt-5.5` |
| `UPLOADS_DIR` | `/data/uploads` |
| `REPORTS_DIR` | `/data/reports` |

---

## Google Console との同期

Client Secret を再発行した場合、**3 か所を同時に更新**してください。

| 場所 | 項目 |
|------|------|
| ローカル | `.env` → `GOOGLE_CLIENT_SECRET` |
| Railway | API サービス Variables → `GOOGLE_CLIENT_SECRET` |
| Google Cloud | 認証情報 → OAuth クライアント → 新しいシークレットを確認 |

**Redirect URI（Google Console に登録済みであること）**

```
https://drone-app-production-54a7.up.railway.app/api/v1/auth/google/callback
```

**JavaScript 生成元**

```
https://drone-app-gamma.vercel.app
http://localhost:5173
```

---

## 設定後

1. Railway API サービスを **Redeploy**
2. ログに `Database migrations applied` / `Server running` があること
3. `https://drone-app-gamma.vercel.app/login` で Google ログインを確認

---

## 関連

- OAuth 手順: [`google-oauth-setup.md`](google-oauth-setup.md)
- 全 env 一覧: [`production-env.md`](production-env.md)
- デプロイ: [`deploy-guide.md`](deploy-guide.md)
