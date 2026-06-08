# 8. 開発フェーズ

## フェーズ概要

```
Phase 0: プロジェクト基盤 ──→ Phase 1: Google OAuth ──→ Phase 2: プロジェクト管理
                                                              │
Phase 5: 仕上げ・確認 ←── Phase 4: 報告書生成 ←── Phase 3: 画像・異常・AI
```

各 Phase は **CEO 承認 → 実装 → テスト/型チェック/ビルド → CEO レビュー** のサイクルで進める。

## 対応ブラウザ（全 Phase 共通・必須）

| ブラウザ | 必須検証 |
|----------|---------|
| Safari（macOS）最新版 | ✅ |
| Safari（iOS）最新版 | ✅ |
| Chrome 最新版 | ✅ |
| Edge 最新版 | ✅ |

---

## Phase 0: プロジェクト基盤

**目的:** 開発環境・ディレクトリ構成・DB 接続の確立

### スコープ

| タスク | 詳細 |
|--------|------|
| Git 初期化 | `.gitignore`, 初回コミット |
| フロントエンド scaffold | Vite + React + TS + TailwindCSS |
| バックエンド scaffold | Express + TS + 基本ミドルウェア |
| PostgreSQL 接続 | 接続確認 + マイグレーション基盤 |
| DB マイグレーション | 全テーブル作成（users + role, projects + inspection_type, images, anomalies + ai_comment, reports） |
| 環境変数 | `.env.development` / `.env.production` 分離（OAuth, CORS, Cookie） |
| Vite プロキシ | 開発時 `/api` → `localhost:3000`（Safari Cookie 同一オリジン化） |
| Helmet / CORS / rate-limit | セキュリティミドルウェア設定（CORS 本番ドメイン明示） |

### 成果物

- `frontend/` — `npm run dev` で起動
- `backend/` — `npm run dev` で起動
- DB — 全テーブル + ENUM 型作成済み
- ヘルスチェック API: `GET /api/v1/health`

### 完了条件

- [ ] フロントエンド起動（localhost:5173）
- [ ] バックエンド起動（localhost:3000）
- [ ] `GET /api/v1/health` → 200
- [ ] DB マイグレーション成功（users.role, projects.inspection_type 含む）
- [ ] TypeScript 型チェック PASS
- [ ] ビルド PASS
- [ ] `.env.development` / `.env.production` 分離確認
- [ ] Vite プロキシ設定確認（`/api` → backend）

---

## Phase 1: Google OAuth 認証

**目的:** Google OAuth ログイン・ログアウト・認証ミドルウェア・role 管理

### スコープ

| タスク | 詳細 |
|--------|------|
| Google OAuth 設定 | 開発 / 本番で別クライアント ID・別リダイレクト URI |
| 認可 URL | GET `/auth/google` |
| コールバック | GET `/auth/google/callback` → JWT Cookie（Safari 対応 SameSite 設定） |
| Cookie 設定 | 環境別 SameSite（開発: Lax / 本番: Lax or None+Secure） |
| Safari エラー | コールバック失敗 → `/login?error=<code>` リダイレクト |
| ログアウト API | POST `/auth/logout` |
| 現在ユーザー API | GET `/auth/me`（role 含む） |
| 認証ミドルウェア | JWT 検証 → req.user = { id, role } |
| authorize ミドルウェア | role チェック（admin 用） |
| ログイン画面 | S-01 Google ログインボタン + Safari エラー表示 |
| OAuth コールバック | S-02 セッション確認 + 失敗時エラーリダイレクト |
| 認証状態管理 | React Context / カスタムフック |
| ルートガード | 未認証 → ログインリダイレクト |

### 成果物

- Google ログイン → ダッシュボード（空）→ ログアウトが動作
- 初回ログイン時に users レコード自動作成（role: operator）

### 完了条件

- [ ] Google OAuth ログイン → `/auth/me` 成功（role 返却）
- [ ] 未認証 API → 401
- [ ] JWT HttpOnly Cookie 設定確認（SameSite / Secure）
- [ ] OAuth リダイレクト URI 開発/本番分離確認
- [ ] Safari（macOS）で Google ログイン成功
- [ ] iOS Safari で Google ログイン成功
- [ ] Safari Cookie 拒否時 → エラーメッセージ表示（`cookie_blocked`）
- [ ] OAuth レートリミット動作
- [ ] Chrome / Edge でもログイン成功
- [ ] 型チェック / ビルド PASS

---

## Phase 2: プロジェクト管理

**目的:** プロジェクト CRUD + 点検種別 + ダッシュボード

### スコープ

| タスク | 詳細 |
|--------|------|
| プロジェクト CRUD API | 5 エンドポイント + inspection_type |
| 点検種別マスタ API | GET `/projects/inspection-types` |
| 所有者チェック | authorizeProjectOwner ミドルウェア |
| ダッシュボード | S-03 プロジェクト一覧（点検種別表示） |
| プロジェクト作成 | S-04 点検種別 3 択 + フォーム |
| プロジェクト詳細 | S-05 概要タブ |
| プロジェクト編集 | 概要タブ内編集 |
| プロジェクト削除 | 確認ダイアログ付き |

### 成果物

- 点検種別選択 → プロジェクト作成 → 一覧 → 詳細 → 編集 → 削除が動作

### 完了条件

- [ ] 3 点検種別（SOLAR_PANEL / EXTERIOR_WALL / ROOF）で CRUD 成功
- [ ] 他人のプロジェクト → 403
- [ ] バリデーションエラー → 400 + details
- [ ] 空状態 UI 表示
- [ ] 型チェック / ビルド PASS

---

## Phase 3: 画像アップロード・異常記録・AI 診断

**目的:** 画像アップロード + 異常箇所記録 + AI 診断コメント生成

### スコープ

| タスク | 詳細 |
|--------|------|
| 画像アップロード API | multipart + MIME 検証 + HEIC → JPEG 変換 |
| 画像一覧 / 配信 / 削除 API | 3 エンドポイント |
| 異常 CRUD API | 4 エンドポイント（ai_comment 対応） |
| AI 診断コメント API | POST `/projects/:id/ai/diagnostic-comment`（再生成用） |
| AI 自動生成 | 異常 POST 時に ai_comment 自動生成 |
| 評価エンジン | 総合スコア A〜E / 緊急度★ / 対応時期 自動算出 |
| 評価 API | GET/POST `/projects/:id/assessment` |
| 屋根残寿命推定 | building_age + roof_material + 異常から算出 |
| 太陽光リスク判定 | 異常種別・グレードから LOW/MEDIUM/HIGH |
| 推奨工事プラン生成 | 3 段階プラン JSONB 保存 |
| 異常記録画面 | S-07 評価・緊急度・AI コメント UI |
| 評価サマリー UI | S-05 概要タブ内 AssessmentPanel |

### 成果物

- 画像 UP → 異常マーカー → AI コメント生成 → 編集 → 保存 → 一覧表示

### 完了条件

- [ ] JPEG/PNG アップロード成功
- [ ] HEIC アップロード → JPEG 変換成功（iOS Safari 実機確認）
- [ ] `<input type="file">` で Safari / iOS Safari から選択可能
- [ ] 非許可ファイル → 400
- [ ] 矩形マーカー保存・表示（Safari Canvas 動作確認）
- [ ] 点検種別ごとに異常種別リストが変動
- [ ] 異常保存 → AI コメント自動生成
- [ ] 総合スコア A〜E 自動算出
- [ ] 緊急度★ + 推奨対応時期 自動表示
- [ ] 屋根残寿命 / 太陽光リスク 算出
- [ ] 推奨工事プラン 3 段階生成
- [ ] 評価サマリー UI 表示
- [ ] 型チェック / ビルド PASS

---

## Phase 4: 報告書 PDF 生成

**目的:** 参考 PDF 準拠のテンプレート（T-01〜T-05）から PDF 自動生成・ダウンロード

> テンプレート詳細: `docs/09-report-template-design.md`

### スコープ

| タスク | 詳細 |
|--------|------|
| PDF 生成エンジン | Puppeteer（HTML → PDF） |
| テンプレート T-01 | 表紙（依頼者名・全景写真・会社情報） |
| テンプレート T-02 | 物件概要 + 全景マップ（マーカー A/B/C） |
| テンプレート T-03 | 太陽光別紙（一覧表 + 可視/赤外線ペア） |
| テンプレート T-04 | 詳細報告（異常 1 件 = 1 ページ、診断グレード + 方位 + ペア画像） |
| テンプレート T-05 | 総括（調査概要 / 点検種別別結果 / 総合判定） |
| マーカー付き赤外線画像 | PDF 内に矩形オーバーレイ + 温度スケール |
| 方位コンパス | SVG コンパス（N/E/S/W）を可視画像横に配置 |
| 報告書生成 / 一覧 / DL API | 3 エンドポイント（`Content-Disposition: attachment`） |
| 報告書タブ UI | S-08 生成 + 一覧 + **ダウンロードボタン必須** |
| テンプレート T-06 | 評価サマリー（スコア + 残寿命 + リスク） |
| テンプレート T-07 | 推奨工事プラン（SALES 版のみ） |
| 3 種 PDF 生成 | SURVEY / CUSTOMER / SALES |
| 報告書種別選択 UI | S-08 ReportTypeSelector |

### 成果物

- 参考 PDF と同等構成の PDF を自動生成 → ダウンロード

### 完了条件

- [ ] T-01 表紙（全景写真 + メタデータ + 会社情報）
- [ ] T-02 物件概要（マーカー付き全景）
- [ ] T-03 太陽光別紙（SOLAR_PANEL 時）
- [ ] T-04 詳細ページ（可視 + 赤外線ペア + 診断グレード + 方位）
- [ ] T-06 評価サマリー（SALES / SURVEY）
- [ ] T-07 推奨工事プラン（SALES のみ）
- [ ] 3 種 PDF 生成（調査版 / 提出版 / 提案版）
- [ ] A4 縦 / Noto Sans JP / 表組スタイルが参考 PDF 準拠
- [ ] 30 秒以内に生成完了
- [ ] ダウンロードボタンで PDF 保存成功（Safari / iOS Safari）
- [ ] ブラウザ内 PDF プレビューに依存していない
- [ ] 型チェック / ビルド PASS

---

## Phase 5: 仕上げ・Admin・総合確認

**目的:** 管理者機能 + 全体品質確認 + セキュリティ監査

### スコープ

| タスク | 詳細 |
|--------|------|
| Admin ユーザー一覧 | S-09 + GET `/admin/users`（role 表示） |
| エラーハンドリング統一 | 全 API エラーレスポンス統一 |
| ローディング / 空状態 UI | 全画面 |
| CSRF トークン | 状態変更 API |
| npm audit | 脆弱性修正 |
| Safari クロスブラウザ検証 | Safari / iOS Safari / Chrome / Edge 全画面確認 |
| TailwindCSS Safari UI 検証 | `min-h-dvh`、タップ領域 44px、Canvas、sticky ヘッダー |
| セキュリティチェックリスト | docs/07 全項目確認（Safari 項目含む） |
| E2E テスト | 主要フロー通しテスト（4 ブラウザ） |

### 成果物

- MVP 全機能が動作 + セキュリティチェックリスト完了

### 完了条件

- [ ] Google ログイン → 点検種別選択 → プロジェクト作成 → 画像 UP → 異常記録 → AI コメント → 報告書 DL（E2E）
- [ ] Safari（macOS）全フロー成功
- [ ] iOS Safari 全フロー成功（HEIC アップロード + PDF DL 含む）
- [ ] Chrome / Edge 全フロー成功
- [ ] Admin ユーザー一覧（role 列表示）
- [ ] operator が Admin API → 403
- [ ] Safari ログイン失敗エラーメッセージ表示確認
- [ ] セキュリティチェックリスト全項目 ✅
- [ ] npm audit Critical/High なし
- [ ] 型チェック / ビルド PASS
- [ ] CEO 最終レビュー承認

---

## タイムライン（目安）

| Phase | 内容 | 目安 |
|-------|------|------|
| Phase 0 | プロジェクト基盤 | 1 セッション |
| Phase 1 | Google OAuth 認証 | 1 セッション |
| Phase 2 | プロジェクト管理 + 点検種別 | 1 セッション |
| Phase 3 | 画像・異常・AI 診断 | 1〜2 セッション |
| Phase 4 | 報告書 PDF | 1 セッション |
| Phase 5 | 仕上げ・確認 | 1 セッション |

---

## Post-MVP 展望

| 機能 | 優先度 |
|------|--------|
| **Stripe 決済・課金** | 高（MVP 対象外） |
| AI 自動異常検知（画像解析） | 中 |
| 組織（テナント）管理 | 中 |
| クライアント向け共有リンク | 中 |
| リフレッシュトークン | 低 |
| S3 ファイルストレージ | 低 |
| 本番デプロイ（Docker + CI/CD） | 低 |
