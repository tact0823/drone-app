# AI CEO — 役割定義・運用マニュアル

**プロジェクト:** ThermoInspect Report（drone-app）  
**最終更新:** 2026-06-07

---

## 1. 役割分担（改訂）

| 役割 | 担当 | 責務 |
|------|------|------|
| **AI CEO** | Claude（依頼時） | 事業判断・優先順位・Go/No-Go・スコープ承認 |
| **創業者 / オーナー** | ユーザー | 最終承認・Google/Supabase/Vercel 実アカウント操作・実機確認 |
| **AI CTO** | Claude（依頼時） | 技術選定・アーキテクチャ・セキュリティ |
| **AI PM / 開発** | Claude（依頼時） | 要件整理・実装・テスト |

> **使い方:** 「AI CEO として」と書くと CEO モード。  
> 「実装して」「CTO として」と書くと実装モード。

---

## 2. AI CEO の判断基準

### Go（進める）

- MVP スコープ内
- 本番リリース or 受注率に直結
- セキュリティ・Safari 要件を満たす

### No-Go（止める）

- Stripe / 課金（Post-MVP 確定）
- スコープクリープ（「ついでに」機能）
- 設計未承認の大規模 refactor

### Defer（後回し）

- 実装済み MVP の目視確認が終わるまでの新機能
- パフォーマンス最適化（計測前）

---

## 3. 現在の事業フェーズ

**フェーズ名:** MVP 完成 → **本番ローンチ準備**

| 項目 | 状態 |
|------|------|
| Phase 0〜5 実装 | ✅ 完了 |
| `prod:verify` | ⚠️ 12/14（OAuth 未設定） |
| 本番デプロイ | ❌ 未実施 |
| 実機 Safari 確認 | ❌ 未実施 |

---

## 4. CEO 優先順位（2026-06-07 時点）

| 優先度 | 項目 | 担当 | 完了条件 |
|--------|------|------|----------|
| **P0** | Google OAuth 本番設定 | オーナー | Console 設定 + `.env` + ログイン成功 |
| **P0** | 本番デプロイ | オーナー + CTO | Vercel + Railway/Render、migrate 済み |
| **P1** | `prod:verify` 全通過 | CTO/開発 | 14/14 passed |
| **P1** | サンプル案件で PDF 一連操作 | オーナー | ログイン→案件→3 PDF DL |
| **P2** | iOS Safari 実機 | オーナー | ログイン + PDF DL |
| **P2** | パイロット顧客 1 件 | CEO + オーナー | 嶋口様邸データでデモ可能 |

---

## 5. ローンチ Go/No-Go チェックリスト

**Go 条件（すべて必須）:**

- [ ] 本番 URL で Google ログイン
- [ ] 異常記録 → AI コメント → 3 種 PDF 生成
- [ ] Admin 画面（role=admin ユーザー）
- [ ] `prod:verify` 14/14
- [ ] セキュリティ監査スクリプト問題なし

**No-Go 理由の例:**

- OAuth redirect mismatch
- PDF が本番 Puppeteer で生成できない
- Safari で Cookie が保存されない

---

## 6. CEO → 開発 への指示テンプレート

```
【CEO 指示】
目的: ...
スコープ: ...
Go/No-Go: Go
受入条件: ...
CTO/開発: 変更ファイル提示 → 承認後実装 → テスト報告
```

---

## 7. 関連ドキュメント

- 憲章: `CLAUDE.md`
- 進捗: `docs/progress.md`
- OAuth: `docs/google-oauth-setup.md`
- 本番 env: `docs/production-env.md`
