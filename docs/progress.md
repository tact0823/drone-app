# プロジェクト進捗・設計サマリー

**最終更新:** 2026-06-07  
**プロジェクト:** ThermoInspect Report（drone-app）  
**実装状況:** 設計完了・**Phase 3 完了**

---

## 1. 現在のサービス概要

### サービス名（仮）

**ThermoInspect Report** — ドローン赤外線点検 報告書自動作成 Web アプリ

### コンセプト

**点検データから、工事受注率を上げる営業支援型報告書を自動生成する**

単なる調査報告書ではなく、総合評価スコア・残寿命推定・推奨工事プランを含む **3 種類の PDF**（調査版 / 顧客提出版 / 営業提案版）を出力する。

### ターゲットユーザー

| ユーザー | role | 役割 |
|----------|------|------|
| 点検オペレーター | `operator` | 撮影・異常記録・報告書生成 |
| 管理者 | `admin` | ユーザー一覧管理 |

### 対応点検種別

| コード | 名称 |
|--------|------|
| `SOLAR_PANEL` | 太陽光パネル |
| `EXTERIOR_WALL` | 外壁 |
| `ROOF` | 屋根 |

### 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React + TypeScript + Vite + TailwindCSS |
| バックエンド | Node.js + Express + TypeScript |
| データベース | PostgreSQL |
| 認証 | Google OAuth 2.0 + JWT（HttpOnly Cookie） |
| AI | LLM API（診断コメント自動生成） |
| PDF | Puppeteer（HTML → PDF、Phase 4 で実装） |

### 提供価値

1. 工事受注率の向上（営業提案版 PDF + 推奨工事プラン）
2. 自動評価（総合スコア A〜E、緊急度★、推奨対応時期）
3. 屋根残寿命推定・太陽光発電リスク可視化
4. AI 診断コメント（異常保存時に自動生成）
5. 3 種 PDF（調査版 / 顧客提出版 / 営業提案版）
6. 作業時間の短縮（数時間 → 数分）

---

## 2. 承認済みの設計方針

### CEO 承認済み（確定事項）

| 項目 | 方針 |
|------|------|
| 認証 | Google OAuth 2.0（メール+パスワードは不使用） |
| 点検種別 | 太陽光パネル / 外壁 / 屋根 |
| 報告書の位置づけ | **営業支援型**（工事受注率向上が目的） |
| 総合評価 | A〜E を自動算出 |
| 異常評価 | 緊急度★1〜5 + 推奨対応時期 |
| 屋根 | 推定残寿命 ○〜○ 年 |
| 太陽光 | 発電リスク 低/中/高 |
| 工事プラン | 簡易補修 / 中規模改修 / 大規模改修 |
| AI | 異常ごとに診断コメント自動生成 |
| 報告書 | 調査版 / 顧客提出版 / 営業提案版 |
| ユーザーロール | `operator` / `admin` |
| Stripe 決済 | **MVP 対象外** |
| ブラウザ | Safari（macOS/iOS）/ Chrome / Edge 必須 |

### 開発原則

1. 最初に全体設計 → MVP を小さく切る
2. Phase ごとに実装（1 回で全機能を実装しない）
3. 実装前に変更対象ファイルを CEO に提示
4. 実装後にテスト・型チェック・ビルド確認
5. セキュリティ最優先

### 参考 PDF

- `嶋口様邸 屋根・太陽光パネル劣化診断調査報告書`（2 部構成）をテンプレート参考として採用

### 設計ドキュメント一覧

| ファイル | 内容 |
|----------|------|
| `docs/01-service-overview.md` | サービス概要 |
| `docs/02-mvp-features.md` | MVP 機能 |
| `docs/03-db-design.md` | DB 設計 |
| `docs/04-screen-design.md` | 画面設計 |
| `docs/05-api-design.md` | API 設計 |
| `docs/06-auth-design.md` | 認証設計 |
| `docs/07-security-design.md` | セキュリティ設計 |
| `docs/08-development-phases.md` | 開発フェーズ |
| `docs/09-report-template-design.md` | 報告書 PDF テンプレート |
| `docs/10-sales-assessment-design.md` | 営業支援型評価設計 |
| `CLAUDE.md` | プロジェクト憲章 |

---

## 3. 報告書テンプレート構成

> 詳細: `docs/09-report-template-design.md`

### ページテンプレート

| ID | 名称 | 内容 |
|----|------|------|
| T-01 | 表紙 | 依頼者名・タイトル・全景写真・調査日・担当者・会社情報 |
| T-02 | 物件概要 | 物件情報表 + 全景マップ（異常マーカー A/B/C…） |
| T-03 | 太陽光別紙 | 太陽光パネル熱赤外線診断（一覧 + 可視/赤外線ペア） |
| T-04 | 詳細報告 | 異常 1 件 = 1 ページ（評価 + 可視/赤外線 + 方位） |
| T-05 | 総括 | 調査概要 / 点検種別別結果 / 総合判定 |
| T-06 | 評価サマリー | 総合スコア + 残寿命 + 発電リスク |
| T-07 | 推奨工事プラン | 簡易補修 / 中規模改修 / 大規模改修 |

### 3 種 PDF

| 種別 | コード | 用途 | 特有ページ |
|------|--------|------|-----------|
| 調査版 | `SURVEY` | 社内技術記録 | 技術詳細・座標データ |
| 顧客提出版 | `CUSTOMER` | 施主への正式報告 | T-01〜T-05 のみ |
| 営業提案版 | `SALES` | 工事受注提案 | + T-06 + T-07 |

### ファイル命名

```
{clientName}_{YYYYMMDD}_調査版.pdf
{clientName}_{YYYYMMDD}_提出版.pdf
{clientName}_{YYYYMMDD}_提案版.pdf
```

### 画像要件

| type | 用途 |
|------|------|
| `OVERVIEW` | 表紙・全景マップ |
| `VISIBLE` | 可視画像（詳細ページ） |
| `INFRARED` | 赤外線画像（詳細ページ、`pair_id` でペアリング） |

---

## 4. DB 設計の要点

> 詳細: `docs/03-db-design.md`  
> **実装:** Phase 1 以降（Phase 0 では未実装）

### テーブル（5 + 評価拡張）

```
users ──< projects ──< images
                  ├──< anomalies
                  └──< reports
```

### users

- `google_id`（UNIQUE）、`email`、`name`、`avatar_url`
- `role`: `operator` | `admin`（デフォルト: operator）

### projects（主要カラム）

| カラム | 説明 |
|--------|------|
| inspection_type | SOLAR_PANEL / EXTERIOR_WALL / ROOF |
| client_name, site_name, location | 基本情報 |
| structure, floors, building_age, roof_material | 物件情報 |
| overall_score, auto_overall_score | 総合評価 A〜E |
| roof_life_min, roof_life_max | 屋根残寿命（年） |
| solar_risk | LOW / MEDIUM / HIGH |
| recommended_plans | 推奨工事プラン（JSONB） |

### images

- `image_type`: OVERVIEW / VISIBLE / INFRARED
- `pair_id`: 可視↔赤外線ペア
- `direction`: 撮影方位

### anomalies

- マーカー座標（0.0〜1.0 正規化）
- `overall_grade`, `auto_overall_grade`: A〜E
- `urgency_stars`: 1〜5
- `recommended_timing`: IMMEDIATE / WITHIN_6_MONTHS / WITHIN_1_YEAR / WITHIN_3_YEARS / MONITORING
- `comment`, `ai_comment`

### reports

- `report_type`: SURVEY / CUSTOMER / SALES

---

## 5. 画面設計の要点

> 詳細: `docs/04-screen-design.md`

| # | 画面 | パス | 概要 |
|---|------|------|------|
| S-01 | ログイン | `/login` | Google OAuth ボタン + Safari エラー表示 |
| S-02 | OAuth コールバック | `/auth/callback` | セッション確認 |
| S-03 | ダッシュボード | `/` | プロジェクト一覧 |
| S-04 | プロジェクト作成 | `/projects/new` | 点検種別 3 択 + 依頼者名等 |
| S-05 | プロジェクト詳細 | `/projects/:id` | 概要/画像/異常/報告書タブ + 評価サマリー |
| S-06 | 画像アップロード | `/projects/:id/upload` | `<input file>` 必須 + HEIC 対応 |
| S-07 | 異常記録 | `/projects/:id/images/:imageId` | 矩形マーカー + 評価 + AI コメント |
| S-08 | 報告書 | `/projects/:id/reports` | 3 種 PDF 選択 + ダウンロード |
| S-09 | ユーザー管理 | `/admin/users` | Admin のみ |

### 主要 UI コンポーネント

- `OverallScoreBadge` — A〜E 評価
- `UrgencyStars` — 緊急度★
- `AssessmentPanel` — 評価サマリー
- `ReportTypeSelector` — 3 種 PDF 選択
- `ConstructionPlanCard` — 推奨工事プラン
- `FileUploadInput` — Safari 対応 file input

---

## 6. API 設計の要点

> 詳細: `docs/05-api-design.md`  
> ベース URL: `/api/v1`

### 認証

| Method | Path | 説明 |
|--------|------|------|
| GET | `/auth/google` | Google OAuth 開始 |
| GET | `/auth/google/callback` | コールバック → JWT Cookie |
| POST | `/auth/logout` | ログアウト |
| GET | `/auth/me` | 現在ユーザー + CSRF トークン |

### プロジェクト / 画像 / 異常

- プロジェクト CRUD + `GET /projects/inspection-types`
- 画像 multipart アップロード + 認証付きファイル配信
- 異常 CRUD

### 評価

| Method | Path | 説明 |
|--------|------|------|
| GET | `/projects/:id/assessment` | 評価サマリー取得 |
| POST | `/projects/:id/assessment/recalculate` | 評価再算出 |

### AI

| Method | Path | 説明 |
|--------|------|------|
| POST | `/projects/:id/ai/diagnostic-comment` | AI コメント再生成 |

### 報告書

| Method | Path | 説明 |
|--------|------|------|
| POST | `/projects/:id/reports` | PDF 生成（`reportType` 必須） |
| GET | `/projects/:id/reports/:reportId/file` | PDF ダウンロード |

### 管理者

- `GET /admin/users` — Admin のみ

---

## 7. セキュリティ要件

> 詳細: `docs/07-security-design.md`

### 最優先事項

1. **Google OAuth 2.0** — パスワード不使用
2. **JWT + HttpOnly Cookie** — LocalStorage 禁止
3. **ロールベース認可** — operator / admin
4. **入力バリデーション** — サーバー側 zod
5. **SQL** — パラメータ化クエリのみ
6. **ファイル** — MIME 実検証、UUID リネーム、20MB 制限
7. **Helmet.js** — セキュリティヘッダー
8. **CORS** — 本番ドメイン明示列挙
9. **レートリミット** — OAuth / AI / API
10. **機密情報** — `.env` Git 除外、API キーはサーバー側のみ

### MVP 対象外

- Stripe 決済（PCI DSS）
- メール + パスワード認証

---

## 8. Safari 対応要件

> 詳細: `docs/06-auth-design.md`, `docs/07-security-design.md`

### 対象ブラウザ（必須）

Safari（macOS/iOS）最新版 / Chrome 最新版 / Edge 最新版

### 10 項目チェックリスト

| # | 要件 | 方針 |
|---|------|------|
| 1 | OAuth リダイレクト URI | 開発 / 本番で別 URI・別 OAuth クライアント ID |
| 2 | Cookie SameSite | 同一サイト: `Lax` / 別ドメイン: `None; Secure` |
| 3 | ITP 対策 | リバースプロキシで同一オリジン化、失敗時エラー表示 |
| 4 | CORS | 本番ドメインを明示的に列挙 |
| 5 | 画像アップロード | `<input type="file">` 必須 |
| 6 | HEIC 対策 | サーバー側 JPEG 変換 |
| 7 | PDF | ブラウザ内プレビュー非依存、DL ボタン必須 |
| 8 | UI | Tailwind + React を Safari で目視検証 |
| 9 | OAuth 環境分離 | `.env.development` / `.env.production` + Vite プロキシ |
| 10 | ログイン失敗 | Safari 向けエラーメッセージ（`cookie_blocked` 等） |

### Vite プロキシ（開発）

```
/api → http://localhost:3000  （Safari Cookie 同一オリジン化）
```

---

## 9. 今後の開発フェーズ

> 詳細: `docs/08-development-phases.md`

| Phase | 内容 | 状態 |
|-------|------|------|
| **Phase 0** | プロジェクト基盤（FE/BE scaffold、health API） | **完了** |
| Phase 1 | Google OAuth 認証 + DB マイグレーション | **完了** |
| Phase 2 | プロジェクト CRUD + 点検種別 + ダッシュボード | **完了** |
| Phase 3 | 画像 UP + 異常記録 + AI + 評価エンジン | **完了** |
| Phase 4 | 報告書 PDF 3 種生成（T-01〜T-07） | **完了** |
| Phase 5 | Admin + セキュリティ監査 + E2E + Safari 確認 | **完了** |

### Post-MVP 展望

- Stripe 決済・課金
- AI 自動異常検知（画像解析）
- 組織（テナント）管理
- クライアント向け共有リンク
- 本番デプロイ（Docker + CI/CD）
- S3 ファイルストレージ

---

## 10. Phase 0 実装結果（完了）

**完了日:** 2026-06-07

### 実装済み

| # | タスク | 状態 |
|---|--------|------|
| 1 | `.gitignore` + `.env.example` | ✅ |
| 2 | フロントエンド: Vite + React + TS + TailwindCSS | ✅ |
| 3 | バックエンド: Express + TS + 基本ミドルウェア | ✅ |
| 4 | `GET /api/v1/health` | ✅ |
| 5 | Helmet / CORS / rate-limit | ✅ |
| 6 | Vite プロキシ（`/api` → backend） | ✅ |
| 7 | `README.md` | ✅ |
| 8 | `CLAUDE.md` ステータス更新 | ✅ |
| 9 | ルート一時ファイル削除 | ✅ |

### Phase 0 完了条件

- [x] フロントエンド起動（localhost:5173）
- [x] バックエンド起動（localhost:3000）
- [x] `GET /api/v1/health` → 200
- [x] Vite プロキシ経由で health 取得可能
- [x] TypeScript 型チェック / ビルド PASS
- [x] 認証 / DB / PDF / AI コードなし

### 次のアクション

CEO から **「Phase 3 承認」** を得次第、画像アップロード + 異常記録 + AI 開始。

→ Phase 3 完了済み（2026-06-07）

---

## 12. Phase 2 実装結果（完了）

**完了日:** 2026-06-07

### 実装済み

| 領域 | 内容 |
|------|------|
| API | プロジェクト CRUD 5 エンドポイント + `GET /inspection-types` |
| 認可 | `authorizeProjectOwner`（他人のプロジェクト → 403） |
| バリデーション | 400 + `VALIDATION_ERROR` + details |
| フロント | ダッシュボード（S-03）、作成（S-04）、詳細概要タブ（S-05） |
| UI | 点検種別 3 択、空状態、削除確認ダイアログ、ステータスバッジ |

### Phase 2 完了条件

- [x] 3 点検種別で CRUD 成功
- [x] 他人のプロジェクト → 403
- [x] バリデーションエラー → 400 + details
- [x] 空状態 UI 表示
- [x] 型チェック / ビルド PASS

### 次のアクション

→ Phase 3 完了済み（2026-06-07）

---

## 13. Phase 3 実装結果（完了）

**完了日:** 2026-06-07

### 実装済み

| 領域 | 内容 |
|------|------|
| 画像 API | multipart UP / 一覧 / 配信 / 削除、HEIC→JPEG、MIME 検証 |
| 異常 API | CRUD + 矩形マーカー + 自動評価（★/A-E/対応時期） |
| AI | 異常保存時 auto `ai_comment`、手動再生成 API（LLM or テンプレート） |
| 評価エンジン | 総合スコア / 屋根残寿命 / 太陽光リスク / 推奨工事プラン 3 段階 |
| 評価 API | GET `/assessment`、POST `/assessment/recalculate` |
| フロント | 画像タブ（S-06）、異常記録（S-07 Canvas）、AssessmentPanel（S-05） |

### Phase 3 完了条件

- [x] JPEG/PNG アップロード
- [x] HEIC → JPEG 変換（サーバー側）
- [x] Safari 対応 `<input type="file">`
- [x] 非許可ファイル → 400
- [x] 矩形マーカー保存・表示
- [x] 点検種別ごと異常種別リスト
- [x] 異常保存 → AI コメント自動生成
- [x] 総合スコア A〜E / 緊急度★ / 推奨対応時期
- [x] 屋根残寿命 / 太陽光リスク / 推奨工事プラン
- [x] 評価サマリー UI
- [x] 型チェック / ビルド PASS
- [ ] iOS Safari 実機確認（CEO 環境で要検証）

### 次のアクション

CEO から **「Phase 5 承認」** を得次第、Admin・セキュリティ監査・E2E 開始。

---

## 14. Phase 4 実装結果（完了）

**完了日:** 2026-06-07

### 実装済み

| 領域 | 内容 |
|------|------|
| PDF 生成 | Puppeteer（HTML → A4 PDF、`--no-sandbox` 対応） |
| テンプレート | T-01 表紙 / T-02 概要 / T-03 太陽光別紙 / T-04 詳細×N / T-05 サマリー / T-06 評価 / T-07 工事プラン |
| 報告書種別 | `SURVEY`（調査版 T-01〜T-06）/ `CUSTOMER`（提出版 T-01〜T-05）/ `SALES`（提案版 T-06+T-07） |
| 報告書 API | `GET/POST .../reports`、`GET .../reports/:id/file`（attachment ダウンロード） |
| ストレージ | `storage/reports/{projectId}/{id}.pdf` + DB `reports` テーブル |
| フロント | S-08 報告書タブ（種別選択・生成・一覧・ダウンロード） |

### Phase 4 完了条件

- [x] 3 種別 PDF 生成 API
- [x] テンプレート T-01〜T-07（種別・点検種別で出し分け）
- [x] 生成済み一覧 + attachment ダウンロード（Safari Cookie 対応 fetch+blob）
- [x] 型チェック / ビルド PASS
- [ ] 実 PDF 内容の目視確認（CEO 環境）
- [ ] iOS Safari ダウンロード実機確認

### 次のアクション

→ Phase 4 完了済み（2026-06-07）

---

## 15. Phase 5 実装結果（完了）

**完了日:** 2026-06-07

### 実装済み

| 領域 | 内容 |
|------|------|
| Admin API | `GET /admin/users`, `/admin/projects`, `/admin/audit-logs`（admin のみ） |
| 監査ログ | `audit_logs` テーブル + ログイン/CRUD/PDF 生成の記録 |
| CSRF | サーバー側 `X-CSRF-Token` 検証（変更系 API） |
| Origin チェック | 本番環境で Origin/Referer 検証 |
| Admin UI | `/admin` タブ（ユーザー / プロジェクト / 監査ログ） |
| Safari PDF DL | Blob URL + iOS フォールバック（新規タブ） |
| PDF 品質 | A4 print-color-adjust / page-break 改善 |
| E2E | Playwright smoke（login redirect, health, admin 401） |
| Security Audit | `npm run security:audit` スクリプト |

### Phase 5 完了条件

- [x] Admin ユーザー / プロジェクト / 監査ログ閲覧
- [x] operator → Admin API 403（authorize）
- [x] CSRF / 認証 / Rate Limit / SQL パラメータ化
- [x] 型チェック / ビルド PASS
- [x] E2E smoke PASS
- [x] security:audit スクリプト
- [ ] iOS Safari 実機 PDF DL（CEO 環境）
- [ ] CEO 最終レビュー承認

---

## 11. Phase 1 実装結果（完了）

**完了日:** 2026-06-07

### 実装済み

| 領域 | 内容 |
|------|------|
| DB | PostgreSQL マイグレーション（全 5 テーブル + ENUM） |
| 認証 API | `GET /auth/google`, `/callback`, `POST /logout`, `GET /me` |
| ミドルウェア | `authenticate`, `authorize`, OAuth レートリミット |
| Cookie | HttpOnly JWT、SameSite=Lax（開発） |
| フロント | ログイン（S-01）、OAuth コールバック（S-02）、空ダッシュボード、ルートガード |
| Safari | エラーコード別メッセージ表示 |

### Phase 1 完了条件

- [x] 認証 API 実装（OAuth / logout / me）
- [x] JWT HttpOnly Cookie 設定
- [x] 初回ログイン時 users 自動作成（role: operator）
- [x] 未認証 API → 401
- [x] DB マイグレーション（users + 将来テーブル）
- [x] 型チェック / ビルド PASS
- [ ] Safari / iOS Safari 実機ログイン確認（CEO 環境で要検証）
- [ ] Google OAuth クレデンシャル設定（`.env` 要設定）

### 次のアクション

→ Phase 2 完了済み（2026-06-07）

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-06-07 | 初版作成（設計サマリー + Phase 0 計画） |
| 2026-06-07 | Phase 0 完了（frontend/backend scaffold + Health API） |
| 2026-06-07 | Phase 1 完了（Google OAuth + PostgreSQL + ログイン UI） |
| 2026-06-07 | Phase 2 完了（プロジェクト CRUD + ダッシュボード UI） |
| 2026-06-07 | Phase 3 完了（画像 UP / 異常記録 / AI / 評価エンジン） |
| 2026-06-07 | Phase 4 完了（Puppeteer PDF 3 種 / S-08 報告書タブ） |
| 2026-06-07 | Phase 5 完了（Admin / 監査ログ / CSRF / E2E / Safari DL） |
| 2026-06-07 | MVP 完成確認（Vercel 設定 / シード / PDF 検証 / デプロイ手順） |
