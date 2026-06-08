# 7. セキュリティ設計

## セキュリティ原則

1. **Defense in Depth** — 多層防御（ネットワーク → アプリ → データ）
2. **Least Privilege** — 最小権限の原則
3. **Secure by Default** — 安全な設定をデフォルトとする
4. **Fail Secure** — エラー時は安全側に倒す

---

## 脅威モデル（STRIDE）

| 脅威 | 対象 | 対策 |
|------|------|------|
| **Spoofing** | 認証 | Google OAuth 2.0 + JWT + HttpOnly Cookie |
| **Tampering** | データ改ざん | 入力バリデーション, パラメータ化クエリ |
| **Repudiation** | 操作否認 | 操作ログ（Phase 2）, created_at/updated_at |
| **Information Disclosure** | データ漏洩 | 認可チェック, HTTPS, ログマスキング |
| **Denial of Service** | サービス停止 | レートリミット, ファイルサイズ制限 |
| **Elevation of Privilege** | 権限昇格 | ロールベース認可, ミドルウェア |

---

## 1. 入力バリデーション

### サーバー側バリデーション（必須）

| 入力 | ルール |
|------|--------|
| email | RFC 5322 形式, 最大 255 文字（Google 提供） |
| name | 1〜100 文字, HTML タグ除去 |
| project.title | 1〜200 文字 |
| project.inspection_type | ENUM 値のみ（SOLAR_PANEL / EXTERIOR_WALL / ROOF） |
| anomaly.marker_* | 0.0〜1.0 の float |
| anomaly.type | ENUM 値のみ許可（点検種別に応じた値） |
| ai/memo | 最大 500 文字 |
| ファイル | MIME type 検証 + 拡張子チェック |

### 使用ライブラリ

- **zod** — スキーマバリデーション（リクエストボディ）
- **file-type** — MIME type の実ファイル検証（拡張子偽装防止）

```typescript
// 例: プロジェクト作成バリデーション
const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  inspectionType: z.enum(['SOLAR_PANEL', 'EXTERIOR_WALL', 'ROOF']),
  siteName: z.string().min(1).max(200),
  inspectionDate: z.string().date(),
  location: z.string().max(300).optional(),
  equipment: z.string().max(200).optional(),
  weather: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});
```

---

## 2. SQL インジェクション防止

- **パラメータ化クエリのみ使用**（pg の `$1, $2...` または Prisma）
- 生 SQL 文字列結合は **禁止**
- ORM/クエリビルダー使用時も raw query は原則禁止

```typescript
// ✅ 安全
const result = await pool.query(
  'SELECT * FROM projects WHERE user_id = $1',
  [userId]
);

// ❌ 禁止
const result = await pool.query(
  `SELECT * FROM projects WHERE user_id = '${userId}'`
);
```

---

## 3. XSS 防止

| 対策 | 詳細 |
|------|------|
| React 自動エスケープ | JSX 内のユーザー入力は自動エスケープ |
| dangerouslySetInnerHTML | **原則禁止** |
| Content-Security-Policy | Helmet.js で CSP ヘッダー設定 |
| 出力エンコーディング | PDF 生成時もユーザー入力をエスケープ |

### CSP ヘッダー（MVP）

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  connect-src 'self';
  frame-ancestors 'none';
```

---

## 4. CSRF 防止

| 対策 | 詳細 |
|------|------|
| SameSite Cookie | 本番同一サイト: `Lax` / 別ドメイン: `None; Secure` |
| CSRF トークン | 状態変更 API に `X-CSRF-Token` 必須 |
| Origin チェック | リクエスト Origin ヘッダーを許可リストで検証 |
| OAuth state | Google OAuth フローで state パラメータ検証 |

---

## 5. ファイルアップロードセキュリティ

| ルール | 値 |
|--------|-----|
| 許可 MIME type | `image/jpeg`, `image/png`, `image/heic`, `image/heif` |
| 変換後形式 | HEIC/HEIF → JPEG にサーバー側変換して保存 |
| 最大ファイルサイズ | 20 MB |
| 最大ファイル数 | 50 枚 / 1 回 |
| ファイル名 | UUID + 拡張子にリネーム（元名は DB のみ） |
| 保存先 | `uploads/` 外から直接アクセス不可 |
| MIME 検証 | 拡張子だけでなくファイル内容で判定 |
| Safari 対応 | `<input type="file" accept="image/*" multiple>` を必須 UI とする |

### アップロードフロー

```
1. クライアント: <input type="file"> でファイル選択（Safari/iOS 対応）
2. multer でファイル受信
3. file-type で MIME type を実検証
4. HEIC/HEIF の場合 → sharp/heic-convert で JPEG 変換
5. 許可 type 以外 → 400 エラー + ファイル削除
6. sharp で画像メタデータ取得（width/height）
7. UUID ファイル名で storage/ に保存（JPEG/PNG）
8. DB にメタデータ記録
```

### HEIC 対策（Safari / iOS 必須）

| 項目 | 方針 |
|------|------|
| 背景 | iOS Safari はカメラロールの HEIC 形式を `<input file>` で返す |
| クライアント | `accept="image/jpeg,image/png,image/heic,image/heif,image/*"` |
| サーバー | HEIC/HEIF 受信 → JPEG 変換 → 以降の処理は JPEG 統一 |
| 変換ライブラリ | `heic-convert` または `sharp`（libvips HEIF サポート） |
| ユーザー通知 | HEIC 変換中はローディング表示 |
| 変換失敗 | 「この画像形式はサポートされていません。JPEG/PNG で保存し直してください。」 |

---

## 6. 認可（Authorization）

### リソース所有者チェック

全 API で「リクエストユーザー = リソース所有者」を確認する。

```typescript
// ミドルウェア例
async function authorizeProjectOwner(req, res, next) {
  const project = await findProject(req.params.id);
  if (!project) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
  if (project.user_id !== req.user.id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN' } });
  }
  req.project = project;
  next();
}
```

### IDOR（Insecure Direct Object Reference）防止

- UUID を使用（連番 ID は推測可能）
- 全エンドポイントで所有者チェック
- エラーメッセージでリソース存在を漏らさない（404 統一）

### ロールベース認可（RBAC）

- `users.role`（`operator` / `admin`）でアクセス制御
- Admin 専用 API には `authorize('admin')` ミドルウェアを適用
- JWT ペイロードの role は DB の最新値と整合性を保つ（role 変更時は再ログイン推奨）

---

## 7. Google OAuth セキュリティ

| 対策 | 詳細 |
|------|------|
| state パラメータ | CSRF 防止のため OAuth state を検証 |
| id_token 検証 | Google 公開鍵で id_token の署名を検証 |
| google_id 一意性 | google_id を UNIQUE 制約で管理 |
| スコープ最小化 | `openid email profile` のみ |
| クライアントシークレット | 環境変数のみ、Git 禁止 |

---

## 8. AI API セキュリティ

| 対策 | 詳細 |
|------|------|
| API キー管理 | LLM API キーはサーバー側環境変数のみ |
| 画像非送信 | 画像データは LLM に送信しない（テキストのみ） |
| プロンプトインジェクション対策 | ユーザーメモをサニタイズ、システムプロンプトと分離 |
| レートリミット | 10 回 / 分 / ユーザー |
| タイムアウト | 15 秒で打ち切り |
| 出力検証 | 生成コメントの長さ上限（1000 文字） |

---

## 9. HTTP セキュリティヘッダー

Helmet.js で以下を設定：

| ヘッダー | 値 |
|----------|-----|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `0`（CSP に委譲） |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

---

## 10. CORS 設定（本番ドメイン単位で明示）

### 許可オリジン一覧

```typescript
const allowedOrigins: Record<string, string[]> = {
  development: [
    'http://localhost:5173',
  ],
  production: [
    'https://app.example.com',   // 本番フロントエンド
  ],
};

const corsOptions = {
  origin: (origin, callback) => {
    const env = process.env.NODE_ENV ?? 'development';
    const allowed = allowedOrigins[env] ?? [];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
};
```

| 環境 | 許可オリジン | 備考 |
|------|-------------|------|
| 開発 | `http://localhost:5173` | Vite dev server |
| 本番 | `https://app.example.com` | 本番ドメインのみ |
| 禁止 | `origin: '*'` | Cookie 認証と両立不可 |
| 禁止 | ワイルドカードサブドメイン | 明示的に列挙する |

> Safari は CORS プリフライト + Cookie 送信の組み合わせに厳格。`credentials: true` 時はオリジンを明示的に列挙する。

---

## 11. レートリミット

```typescript
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMIT', message: 'しばらく待ってから再試行してください' } },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});
```

---

## 12. 機密情報管理

| 項目 | 方針 |
|------|------|
| `.env` | Git にコミットしない（`.gitignore` 必須） |
| `.env.example` | キー名のみ記載（値は空） |
| JWT_SECRET | 32 文字以上のランダム文字列 |
| GOOGLE_CLIENT_SECRET | 環境変数のみ |
| LLM_API_KEY | 環境変数のみ |
| DB 接続文字列 | 環境変数のみ |
| ログ | トークン・API キー・個人情報を出力しない |
| エラーレスポンス | スタックトレースを本番で返さない |

### .gitignore（必須項目）

```
.env
.env.local
.env.*.local
uploads/
storage/
node_modules/
dist/
```

---

## 13. 依存関係セキュリティ

- Phase 完了ごとに `npm audit` を実行
- Critical / High の脆弱性は Phase 完了前に対処
- 依存パッケージは必要最小限に留める

---

## 14. MVP 対象外（セキュリティ関連）

| 機能 | 理由 |
|------|------|
| **Stripe 決済** | Post-MVP。PCI DSS 対応は MVP スコープ外 |
| メール + パスワード認証 | Google OAuth に統一 |

---

---

## 16. Safari 対応（必須）

### 対象ブラウザ

| ブラウザ | 必須 |
|----------|------|
| Safari（macOS）最新版 | ✅ |
| Safari（iOS）最新版 | ✅ |
| Chrome 最新版 | ✅ |
| Edge 最新版 | ✅ |

### Safari セキュリティ要件チェックリスト

| # | 項目 | 対策 |
|---|------|------|
| 1 | OAuth リダイレクト URI | 開発 / 本番で別 URI・別 OAuth クライアント ID |
| 2 | Cookie SameSite | 同一サイト: `Lax` / 別ドメイン: `None; Secure` |
| 3 | ITP 対策 | 同一ドメイン構成優先。Cookie 失敗検知 + エラーメッセージ |
| 4 | CORS | 本番ドメインを明示的に列挙（`credentials: true`） |
| 5 | 画像アップロード | `<input type="file">` 方式（ドラッグ&ドロップは補助） |
| 6 | HEIC 対応 | サーバー側 JPEG 変換 |
| 7 | PDF | ブラウザ内プレビュー非依存。ダウンロードボタン必須 |
| 8 | UI 検証 | TailwindCSS + React を Safari / iOS Safari で目視確認 |
| 9 | OAuth 環境分離 | `.env.development` / `.env.production` + Vite プロキシ |
| 10 | ログイン失敗 | Safari 向けエラーメッセージ（`cookie_blocked` 等） |

### Safari ITP と Cookie

| シナリオ | リスク | 対策 |
|----------|--------|------|
| クロスサイト API 呼び出し | Cookie 送信されない | リバースプロキシで同一オリジン化 |
| プライベートブラウズ | Cookie 即時削除 | エラーメッセージ + 代替案提示 |
| 7 日間未操作 | Cookie 削除（ITP 2.1） | JWT 24h 有効期限で影響最小化 |
| iframe 内 OAuth | ブロック | トップレベルリダイレクトのみ使用 |

---

## 17. セキュリティチェックリスト（Phase 完了時）

- [ ] 全 API に認証ミドルウェア適用（公開 API 以外）
- [ ] 全リソース API に所有者チェック
- [ ] Admin API に role チェック（`authorize('admin')`）
- [ ] 入力バリデーション（zod）全エンドポイント
- [ ] SQL パラメータ化クエリのみ
- [ ] ファイルアップロード MIME 検証
- [ ] Google OAuth state パラメータ検証
- [ ] AI API キーがサーバー側のみ
- [ ] Helmet.js ヘッダー設定
- [ ] CORS オリジン限定
- [ ] レートリミット設定（OAuth / AI / API）
- [ ] `.env` が `.gitignore` に含まれる
- [ ] `npm audit` Critical/High なし
- [ ] JWT HttpOnly Cookie 設定確認（Safari: SameSite / Secure）
- [ ] CORS 本番ドメイン明示設定
- [ ] OAuth リダイレクト URI 開発/本番分離
- [ ] HEIC → JPEG 変換動作確認
- [ ] Safari / iOS Safari ログイン E2E 成功
- [ ] Safari ログイン失敗エラーメッセージ表示確認
