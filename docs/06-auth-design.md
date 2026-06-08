# 6. 認証設計

## 認証方式

**Google OAuth 2.0 + JWT（HttpOnly Cookie）** を採用する。

| 項目 | 方針 |
|------|------|
| IdP | Google OAuth 2.0 |
| トークン形式 | JWT（HS256）— 自前セッション管理 |
| 保存場所 | HttpOnly Cookie（JS からアクセス不可） |
| 有効期限 | 24 時間 |
| リフレッシュ | MVP では未実装（Post-MVP） |
| ユーザー作成 | 初回 Google ログイン時に自動作成 |
| パスワード | **不使用**（Google OAuth に統一） |

## なぜ Google OAuth + JWT Cookie か

- **パスワード管理不要** — 漏洩リスク・リセットフローが不要
- **LocalStorage 保存を避ける** — XSS によるトークン窃取リスクを排除
- **CSRF 対策** — SameSite 設定 + CSRF トークン（環境別 Cookie 戦略は後述）
- **role ベース認可** — JWT ペイロードに role を含め RBAC を実現
- **Safari 対応必須** — iOS Safari / Safari 最新版での OAuth・Cookie 動作を保証

---

## 認証フロー

### Google OAuth ログイン

```
Browser                Backend                  Google              DB
  │                       │                       │                 │
  │ GET /auth/google      │                       │                 │
  │──────────────────────>│                       │                 │
  │ 302 Redirect          │                       │                 │
  │<──────────────────────│                       │                 │
  │                       │                       │                 │
  │ Google ログイン画面     │                       │                 │
  │──────────────────────────────────────────────>│                 │
  │                       │                       │                 │
  │ 302 callback?code=... │                       │                 │
  │<──────────────────────────────────────────────│                 │
  │                       │                       │                 │
  │ GET /auth/google/callback?code=...            │                 │
  │──────────────────────>│                       │                 │
  │                       │ POST token endpoint   │                 │
  │                       │──────────────────────>│                 │
  │                       │ id_token + profile    │                 │
  │                       │<──────────────────────│                 │
  │                       │                       │                 │
  │                       │ UPSERT users (google_id)                │
  │                       │────────────────────────────────────────>│
  │                       │ user (role: operator)                   │
  │                       │<────────────────────────────────────────│
  │                       │ jwt.sign({ sub, role })                 │
  │ 302 → /auth/callback  │                       │                 │
  │ Set-Cookie: token=JWT │                       │                 │
  │<──────────────────────│                       │                 │
```

### 認証済みリクエスト

```
Client                          Server
  │                               │
  │ GET /api/v1/projects          │
  │ Cookie: token=JWT             │
  │──────────────────────────────>│
  │                               │ jwt.verify(token)
  │                               │ req.user = { id, role }
  │                               │ 認可チェック
  │  200 { projects }             │
  │<──────────────────────────────│
```

---

## JWT ペイロード

```json
{
  "sub": "user-uuid",
  "role": "operator",
  "iat": 1717747200,
  "exp": 1717833600
}
```

- `sub`: ユーザー ID（users.id）
- `role`: `operator` | `admin`
- `iat` / `exp`: 発行時刻 / 有効期限

---

## Cookie 設定（環境別）

フロントエンドと API が**別オリジン**のため、Safari（ITP）対応として環境ごとに Cookie 戦略を分ける。

### 本番環境（推奨構成）

**同一サイト構成（推奨）:** リバースプロキシでフロント/API を同一ドメイン配下に統一する。

```
https://app.example.com/          → フロントエンド
https://app.example.com/api/v1/   → バックエンド API
```

```
Set-Cookie: token=<JWT>;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Path=/;
  Max-Age=86400
```

| 属性 | 本番値 | 理由 |
|------|--------|------|
| HttpOnly | true | XSS 防止 |
| Secure | true | HTTPS 必須（Safari 要件） |
| SameSite | Lax | 同一サイト構成で CSRF 防御 + Safari 互換 |
| Path | / | 全 API で有効 |

### 本番環境（別ドメイン構成の場合）

フロントと API が別ドメインの場合のみ以下を使用：

```
Set-Cookie: token=<JWT>;
  HttpOnly;
  Secure;
  SameSite=None;
  Path=/;
  Max-Age=86400
```

> `SameSite=None` は **Secure 必須**。Safari 14+ で動作。ITP により 7 日間で Cookie が削除される可能性あり → Post-MVP で Refresh Token 検討。

### ローカル開発環境

Vite 開発サーバーと本番 URL で OAuth 設定を分離する（詳細は「Google OAuth 設定」参照）。

```
# 開発: Vite プロキシ経由で同一オリジンに見せる（推奨）
# frontend/vite.config.ts
server: {
  proxy: { '/api': 'http://localhost:3000' }
}
→ Cookie: SameSite=Lax; Secure=false（localhost 例外）

# 開発: 別ポート直結の場合
→ Cookie: SameSite=None; Secure（HTTPS ローカル or Safari 非対応リスクあり）
```

| 環境 | FRONTEND_URL | GOOGLE_CALLBACK_URL |
|------|--------------|---------------------|
| 開発 | `http://localhost:5173` | `http://localhost:5173/api/v1/auth/google/callback`（プロキシ経由） |
| 本番 | `https://app.example.com` | `https://app.example.com/api/v1/auth/google/callback` |

---

## Safari / ITP 対策（HttpOnly Cookie 認証）

Safari の Intelligent Tracking Prevention（ITP）により、クロスサイト Cookie は制限される。

| リスク | 対策 |
|--------|------|
| クロスサイト Cookie ブロック | 本番は同一ドメイン構成（リバースプロキシ）を優先 |
| ITP による Cookie 7 日削除 | MVP では JWT 24h 有効期限で影響最小化。Post-MVP で Refresh Token |
| OAuth リダイレクト後 Cookie 未設定 | コールバック URL をフロントと同一オリジンに統一 |
| iOS Safari プライベートブラウズ | ログイン失敗時に専用エラーメッセージ表示（画面設計 S-01/S-02 参照） |
| サードパーティ Cookie 禁止 | Google OAuth はトップレベルリダイレクト方式（iframe 不使用） |

### フォールバック方針

Safari で Cookie が機能しない場合の検知と対応：

1. OAuth コールバック後、`/auth/me` でセッション確認
2. 失敗時 → `/login?error=safari_cookie_blocked` へリダイレクト
3. ユーザー向けエラーメッセージ表示（後述）

---

## ロールと権限

### ロール定義（users.role）

| ロール | 説明 | 付与方法 |
|--------|------|----------|
| `operator` | 点検オペレーター。自分のプロジェクトのみ操作可能 | 初回 Google ログイン時に自動付与（デフォルト） |
| `admin` | 管理者。全ユーザー閲覧 + 自分のプロジェクト操作 | DB で手動設定（MVP） |

### 権限マトリクス

| 操作 | operator | admin |
|------|----------|-------|
| Google OAuth ログイン | ✅ | ✅ |
| 自分のプロジェクト CRUD | ✅ | ✅ |
| 他人のプロジェクト閲覧 | ❌ | ❌ |
| 画像アップロード | ✅ | ✅ |
| 異常記録 CRUD | ✅ | ✅ |
| AI 診断コメント生成 | ✅ | ✅ |
| 報告書生成・DL | ✅ | ✅ |
| ユーザー一覧（admin） | ❌ | ✅ |

> MVP では admin の「他人のプロジェクト閲覧」は不可。Post-MVP で組織管理と合わせて追加。

---

## ミドルウェア構成

```
Request
  ↓
helmet()           — セキュリティヘッダー
  ↓
cors()             — オリジン制限
  ↓
rateLimiter()      — レートリミット
  ↓
cookieParser()     — Cookie 解析
  ↓
authenticate()     — JWT 検証 → req.user = { id, role }
  ↓
authorize('admin') — ロールチェック（admin ルートのみ）
  ↓
Route Handler
```

### authenticate ミドルウェア

```typescript
function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: { code: 'TOKEN_EXPIRED' } });
  }
}
```

### authorize ミドルウェア

```typescript
function authorize(...allowedRoles: UserRole[]) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } });
    }
    next();
  };
}

// 使用例
router.get('/admin/users', authenticate, authorize('admin'), listUsers);
```

---

## Google OAuth 設定

### 対応ブラウザ（必須）

| ブラウザ | バージョン |
|----------|-----------|
| Safari（macOS） | 最新版 |
| Safari（iOS） | 最新版 |
| Chrome | 最新版 |
| Edge | 最新版 |

### Google Cloud Console — リダイレクト URI（環境別に明確に分離）

**開発環境（Vite プロキシ経由・推奨）:**

```
承認済み JavaScript 生成元:
  http://localhost:5173

承認済みリダイレクト URI:
  http://localhost:5173/api/v1/auth/google/callback
```

**本番環境:**

```
承認済み JavaScript 生成元:
  https://app.example.com

承認済みリダイレクト URI:
  https://app.example.com/api/v1/auth/google/callback
```

> **禁止:** 開発 URI を本番に、本番 URI を開発に混在させない。  
> Google Cloud Console 上で開発用 / 本番用の OAuth クライアント ID を**別々に作成**することを推奨。

### Vite 開発サーバーと本番 URL の OAuth 設定分離

| 設定ファイル | 用途 |
|-------------|------|
| `.env.development` | 開発用 `GOOGLE_CLIENT_ID`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL` |
| `.env.production` | 本番用 `GOOGLE_CLIENT_ID`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL` |
| `vite.config.ts` | 開発時 `/api` プロキシ → `localhost:3000` |

```typescript
// vite.config.ts（開発環境）
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### 環境変数

| 変数 | 説明 | 開発例 | 本番例 |
|------|------|--------|--------|
| `GOOGLE_CLIENT_ID` | OAuth クライアント ID | 開発用 ID | 本番用 ID |
| `GOOGLE_CLIENT_SECRET` | OAuth シークレット | 開発用 | 本番用 |
| `GOOGLE_CALLBACK_URL` | コールバック URL | `http://localhost:5173/api/v1/auth/google/callback` | `https://app.example.com/api/v1/auth/google/callback` |
| `JWT_SECRET` | JWT 署名キー | ローカル生成 | 本番生成 |
| `JWT_EXPIRES_IN` | 有効期限 | `24h` | `24h` |
| `FRONTEND_URL` | フロント URL | `http://localhost:5173` | `https://app.example.com` |
| `COOKIE_SAME_SITE` | Cookie SameSite | `lax` | `lax`（同一サイト）/ `none`（別ドメイン） |
| `NODE_ENV` | 環境識別 | `development` | `production` |

### スコープ

`openid`, `email`, `profile`

---

## Safari ログイン失敗時のエラーハンドリング

OAuth コールバック失敗時、クエリパラメータ `?error=<code>` でフロントに通知する。

| error コード | 原因 | ユーザー向けメッセージ |
|-------------|------|----------------------|
| `oauth_denied` | Google 認証キャンセル | 「Google ログインがキャンセルされました。もう一度お試しください。」 |
| `oauth_failed` | Google API エラー | 「ログインに失敗しました。しばらく待ってから再度お試しください。」 |
| `cookie_blocked` | Safari Cookie 拒否（ITP） | 「Safari のプライバシー設定によりログインできませんでした。Safari の設定 > プライバシー > 「サイト越えトラッキングを防ぐ」をオフにするか、Chrome をお試しください。」 |
| `session_expired` | JWT 期限切れ | 「セッションの有効期限が切れました。再度ログインしてください。」 |
| `state_mismatch` | CSRF state 不一致 | 「セキュリティエラーが発生しました。もう一度ログインしてください。」 |

```typescript
// コールバック失敗時のリダイレクト例
res.redirect(`${FRONTEND_URL}/login?error=cookie_blocked`);
```

---

## CSRF 対策

- Cookie の SameSite 設定で大部分を防御（本番: Lax、別ドメイン: None + Secure）
- 状態変更 API（POST / PATCH / DELETE）には CSRF トークンを追加
  - サーバーが `GET /auth/me` レスポンスに CSRF トークンを含める
  - クライアントが `X-CSRF-Token` ヘッダーで送信
  - サーバーがミドルウェアで検証
- OAuth フローでは `state` パラメータで CSRF 防止

---

## MVP 対象外

| 機能 | 理由 |
|------|------|
| メール + パスワード認証 | Google OAuth に統一 |
| Stripe 決済連携 | Post-MVP |
| リフレッシュトークン | Post-MVP |
| 多要素認証（MFA） | Post-MVP |
