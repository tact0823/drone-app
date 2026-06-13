# 本番公開前チェックリスト — ThermoInspect Report MVP

---

## 人間がデプロイ前にやること

### インフラ

- [ ] Railway で **PostgreSQL** サービス作成 → API サービスに `${{Postgres.DATABASE_URL}}` を設定
- [ ] Railway / Render でバックエンドデプロイ → URL 取得
- [ ] Vercel でフロントデプロイ（Root: `frontend`）→ Production URL 確定
- [ ] バックエンド Volume 設定（`UPLOADS_DIR` / `REPORTS_DIR`）

### 環境変数

- [ ] バックエンド: `.env.production.example` を参照し全必須項目を設定
- [ ] Vercel: `BACKEND_URL` を設定
- [ ] `JWT_SECRET` を本番用に新規生成（ローカルと別）
- [ ] `LLM_API_KEY` + `LLM_MODEL=gpt-5.5` を本番バックエンドに設定

### Google OAuth

- [ ] 本番 Redirect URI: `https://<vercel-domain>/api/v1/auth/google/callback`
- [ ] 本番 JavaScript 生成元: `https://<vercel-domain>`
- [ ] ローカル URI も開発用に残す
- [ ] 手順: [`google-oauth-setup.md`](google-oauth-setup.md)

### DB

```powershell
cd backend
npm.cmd run migrate
npm.cmd run seed   # ステージング/デモ用（本番は任意）
```

---

## デプロイ後に確認すること

### 認証

- [ ] 本番 URL で Google ログイン → ダッシュボード遷移
- [ ] `GET /api/v1/auth/me` が 200
- [ ] iOS Safari でログイン + Cookie 保持

### コアフロー

- [ ] 案件作成 → 画像アップロード → 異常記録（AI 分析）
- [ ] PDF 3 種生成（SURVEY / CUSTOMER / SALES）
- [ ] PDF ダウンロード（Safari 含む）

### 検証コマンド（ステージング / ローカル本番 env）

```powershell
cd backend
npm.cmd run verify:llm
npm.cmd run prod:verify
npm.cmd run security:audit
```

---

## 残すべき Issue（公開後も管理）

| Issue | 優先度 | 内容 |
|-------|--------|------|
| 永続ストレージ | P0 | Railway/Render Volume 未設定時、再デプロイで PDF/画像消失 |
| iOS Safari 実機 | P1 | ログイン + PDF DL の実機確認（CEO 環境） |
| OAuth テストユーザー | P1 | Google 同意画面が「テスト」状態の場合、本番公開申請が必要 |
| Admin 初期設定 | P2 | `UPDATE users SET role='admin' WHERE email='...'` |
| LLM コスト | P2 | GPT-5.5 利用量モニタリング |

---

## 次 Phase で追加する機能（MVP スコープ外）

| 機能 | 理由 |
|------|------|
| **AI プロンプト管理画面** | 運用チューニング用 — MVP 後 |
| Stripe 課金 | CEO 承認済み Post-MVP |
| JWT リフレッシュ | セッション UX 改善 |
| Responses API 移行 | GPT-5.5 最適化 |
| 2 部 PDF 分割 | 異常 10 件超 |
| クライアント閲覧ロール | 発注者向け |

---

## Vercel 公開後に差し替える箇所

| ファイル / 設定 | 差し替え内容 |
|-----------------|-------------|
| バックエンド `FRONTEND_URL` | `https://drone-app-gamma.vercel.app` |
| バックエンド `GOOGLE_CALLBACK_URL` | `https://drone-app-production-54a7.up.railway.app/api/v1/auth/google/callback` |
| Google Cloud Console | 本番 Redirect URI / JS 生成元 |
| Vercel `BACKEND_URL` / `VITE_API_BASE_URL` | `https://drone-app-production-54a7.up.railway.app` |
| PDF `COMPANY_*` | 実会社情報 |
