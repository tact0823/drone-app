# Vercel 環境変数一覧 — ThermoInspect Report

> フロントエンド Root Directory: `frontend`  
> ビルド時に `scripts/prepare-vercel.mjs` が `vercel.json` を生成し `/api/*` をバックエンドへプロキシします。

---

## 必須（Production / Preview 両方）

| 変数 | 必須 | 説明 | 設定例 |
|------|------|------|--------|
| `BACKEND_URL` | ✅ | バックエンド API の URL（**末尾スラッシュなし**） | `https://thermo-api.railway.app` |

Vercel Dashboard → Project → Settings → Environment Variables

---

## 設定手順

1. バックエンドを Railway / Render 等にデプロイし URL を取得
2. Vercel に `BACKEND_URL` を設定（Production + Preview）
3. Deploy
4. バックエンド側 `FRONTEND_URL` を Vercel Production URL に合わせる

---

## URL プレースホルダー（未確定時）

| 項目 | プレースホルダー | 差し替えタイミング |
|------|------------------|-------------------|
| Vercel 本番 URL | `https://YOUR_VERCEL_APP.vercel.app` | Vercel 初回 Deploy 後 |
| バックエンド URL | `https://YOUR_BACKEND.railway.app` | Railway/Render Deploy 後 |

---

## ローカル開発との違い

| 環境 | 設定場所 | API 到達 |
|------|----------|----------|
| ローカル | `.env` + Vite proxy | `http://localhost:5173/api` → `localhost:3000` |
| Vercel 本番 | `BACKEND_URL` のみ | `https://app.vercel.app/api` → バックエンド |

ローカル `.env` の `DATABASE_URL` / OAuth / LLM 等は **Vercel には不要**（バックエンド側のみ）。

---

## 関連ドキュメント

- デプロイ手順: [`deploy-guide.md`](deploy-guide.md)
- バックエンド env: [`production-env.md`](production-env.md)
- OAuth: [`google-oauth-setup.md`](google-oauth-setup.md)
