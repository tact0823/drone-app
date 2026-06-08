# drone-app — プロジェクト憲章

## 役割分担

| 役割 | 担当 | 責務 |
|------|------|------|
| **AI CEO** | Claude（`AI CEO として` 依頼時） | 事業判断・優先順位・Go/No-Go |
| **オーナー** | ユーザー | 最終承認・外部サービス操作・実機確認 |
| **AI CTO** | Claude（実装依頼時） | 技術選定・アーキテクチャ・セキュリティ方針 |
| **AI PM** | Claude | MVP 定義・Phase 計画・要件整理 |
| **AI 開発社員** | Claude | 実装・テスト・型チェック・ビルド確認 |

Claude は **CEO モード** では実装せず判断と指示に専念する。**CTO/開発モード** では CEO の判断を最優先し、技術的な選択肢とトレードオフを提示したうえで実行する。

> AI CEO 運用: `docs/ai-ceo.md` / `.cursor/rules/ai-ceo.mdc`

---

## 標準技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React + TypeScript + Vite + TailwindCSS |
| バックエンド | Node.js + Express + TypeScript |
| データベース | PostgreSQL |
| 認証 | Google OAuth 2.0 + JWT（HttpOnly Cookie） |
| AI | LLM API（診断コメント生成） |
| パッケージマネージャ | npm（PowerShell では `npm.cmd` を使用） |

上記以外の技術を導入する場合は、実装前に CEO へ理由と代替案を提示する。

---

## 開発原則

1. **最初に全体設計を作る** — 実装前にアーキテクチャ・ディレクトリ構成・データモデルを文書化する
2. **MVP を小さく切る** — 最小限の価値を最速で届ける
3. **1 回で全機能を実装しない** — スコープを Phase 単位に分割する
4. **Phase ごとに実装する** — 各 Phase 完了後に CEO の確認を得てから次へ進む
5. **実装前に変更対象ファイルを提示する** — ファイル一覧と変更概要を CEO に承認してもらう
6. **実装後に品質確認を行う** — テスト・型チェック・ビルドを必ず実行する
7. **セキュリティを最優先する** — 機能より先にセキュリティ要件を満たす

---

## Phase 開発フロー

```
[CEO] 事業判断・優先順位
   ↓
[CTO/PM] 全体設計・Phase 計画・MVP 定義
   ↓
[CEO] 設計・Phase 承認
   ↓
[開発] 変更対象ファイル提示 → [CEO] 承認
   ↓
[開発] 実装
   ↓
[開発] テスト / 型チェック / ビルド確認
   ↓
[CEO] Phase 完了レビュー → 次 Phase へ
```

---

## 実装前チェックリスト

実装を開始する前に、必ず以下を CEO に提示する。

- [ ] 今回の Phase の目的とスコープ
- [ ] 変更・作成するファイル一覧（パス付き）
- [ ] 各ファイルの変更概要（1 行ずつ）
- [ ] セキュリティ上の考慮事項
- [ ] 想定されるリスクと対策

**CEO の承認なしに実装を開始しない。**

---

## 実装後チェックリスト

各 Phase の実装完了後、必ず以下を実行し結果を報告する。

- [ ] ユニットテスト / 結合テストの実行
- [ ] TypeScript 型チェック（`tsc --noEmit`）
- [ ] フロントエンドビルド（`vite build`）
- [ ] バックエンド起動確認
- [ ] Lint エラーなし

---

## セキュリティ方針（最優先）

### 認証・認可

- 認証は **Google OAuth 2.0** に統一する（メール + パスワードは不使用）
- JWT は HttpOnly Cookie + Secure + SameSite を基本とする
- `users.role`（`operator` / `admin`）でロールベース認可を行う
- 全 API エンドポイントに認可チェックを設ける

### 入力検証

- サーバー側で必ずバリデーションする（クライアントのみに依存しない）
- SQL はパラメータ化クエリ / ORM を使用する（生 SQL 文字列結合禁止）
- XSS 対策：React のデフォルトエスケープを維持し、`dangerouslySetInnerHTML` は原則禁止

### 機密情報

- `.env` ファイルを Git にコミットしない（`.gitignore` に必ず追加）
- API キー・DB 接続文字列は環境変数で管理する
- ログにトークン・API キー・個人情報を出力しない

### HTTP / ネットワーク

- CORS は許可オリジンを明示的に限定する
- Helmet.js でセキュリティヘッダーを設定する
- レートリミットを API に適用する

### 依存関係

- `npm audit` を定期的に実行する
- 重大な脆弱性があるパッケージは Phase 完了前に対処する

---

## ディレクトリ構成（予定）

```
drone-app/
├── CLAUDE.md              # 本ファイル（プロジェクト憲章）
├── frontend/              # React + Vite + TailwindCSS
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/               # Node.js + Express + TypeScript
│   ├── src/
│   └── package.json
├── docs/                  # 設計書・Phase 計画
│   ├── 01-service-overview.md
│   ├── 02-mvp-features.md
│   ├── 03-db-design.md
│   ├── 04-screen-design.md
│   ├── 05-api-design.md
│   ├── 06-auth-design.md
│   ├── 07-security-design.md
│   ├── 08-development-phases.md
│   ├── 09-report-template-design.md
│   └── 10-sales-assessment-design.md
└── .gitignore
```

> 実際の構成は全体設計 Phase で確定する。上記は初期案。

---

## コミュニケーション規約

- 報告は **日本語** で行う
- 技術的判断には **理由と代替案** を添える
- Phase 完了時は **変更サマリー + テスト結果** を報告する
- スコープ外の作業は CEO に確認してから着手する
- 「とりあえず全部作る」提案はしない — MVP と Phase 分割を徹底する

---

## MVP 確定事項（CEO 承認済み）

| 項目 | 内容 |
|------|------|
| 認証 | Google OAuth 2.0 |
| 点検種別 | 太陽光パネル / 外壁 / 屋根 |
| AI 機能 | 異常ごと AI 診断コメント自動生成 |
| 営業支援 | 総合スコア A〜E / 緊急度★ / 残寿命 / 発電リスク / 工事プラン |
| 報告書 | 調査版 / 顧客提出版 / 営業提案版 の 3 種 PDF |
| ユーザーロール | `operator`（デフォルト）/ `admin` |
| 決済 | **Stripe は MVP 対象外**（Post-MVP） |
| 対応ブラウザ | Safari（macOS/iOS）/ Chrome / Edge 最新版（必須） |
| Safari 対応 | OAuth URI 分離、Cookie/ITP 対策、HEIC 変換、PDF DL 必須 |

---

## 現在のステータス

| 項目 | 状態 |
|------|------|
| プロジェクト | 設計ドキュメント作成済み |
| 全体設計 | ✅ 完了（docs/01〜08） |
| MVP 定義 | ✅ CEO 承認済み（修正反映済み） |
| Phase 0（基盤） | ✅ 完了 |
| Phase 1（Google OAuth） | ✅ 完了 |
| Phase 2（プロジェクト管理） | ✅ 完了 |
| Phase 3（画像・異常・AI） | ✅ 完了 |
| Phase 4（報告書 PDF） | ✅ 完了 |
| Phase 5（Admin・監査・E2E） | ✅ 完了 |

**次のアクション：** 本番ローンチ準備（CEO P0: OAuth → デプロイ → prod:verify 14/14）
