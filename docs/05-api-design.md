# 5. API 設計

## 基本方針

- RESTful API
- ベース URL: `/api/v1`
- リクエスト/レスポンス: JSON
- 認証: Google OAuth 2.0 → JWT（HttpOnly Cookie）
- エラーレスポンス: 統一フォーマット

## エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [
      { "field": "inspectionType", "message": "点検種別を選択してください" }
    ]
  }
}
```

## HTTP ステータスコード

| コード | 用途 |
|--------|------|
| 200 | 成功（GET / PATCH） |
| 201 | 作成成功（POST） |
| 204 | 削除成功（DELETE） |
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | 権限不足 |
| 404 | リソース未存在 |
| 413 | ファイルサイズ超過 |
| 429 | レートリミット |
| 500 | サーバーエラー |
| 502 | AI サービスエラー |

---

## エンドポイント一覧

### 認証 `/api/v1/auth`

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/auth/google` | 不要 | Google OAuth 認可 URL へリダイレクト |
| GET | `/auth/google/callback` | 不要 | Google コールバック → JWT Cookie 設定 |
| POST | `/auth/logout` | 必要 | ログアウト → Cookie 削除 |
| GET | `/auth/me` | 必要 | 現在のユーザー情報（role 含む） |

#### GET `/auth/google`

- Google OAuth 2.0 認可エンドポイントへリダイレクト
- スコープ: `openid email profile`

#### GET `/auth/google/callback`

```
// 処理フロー
1. Google から authorization code を受信
2. code → access_token + id_token に交換
3. id_token から google_id, email, name, avatar_url を取得
4. users テーブルで google_id を検索
   - 存在しない → 新規作成（role: operator）
   - 存在する → プロフィール更新
5. JWT 発行 → HttpOnly Cookie 設定
6. フロントエンド /auth/callback へリダイレクト

// Response 302 → フロントエンド
Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict
```

#### GET `/auth/me`

```json
// Response 200
{
  "user": {
    "id": "uuid",
    "email": "operator@gmail.com",
    "name": "山田 太郎",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "role": "operator"
  },
  "csrfToken": "..."
}
```

---

### プロジェクト `/api/v1/projects`

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/projects` | 必要 | 自分のプロジェクト一覧 |
| POST | `/projects` | 必要 | プロジェクト作成 |
| GET | `/projects/:id` | 必要 | プロジェクト詳細 |
| PATCH | `/projects/:id` | 必要 | プロジェクト更新 |
| DELETE | `/projects/:id` | 必要 | プロジェクト削除 |
| GET | `/projects/inspection-types` | 必要 | 点検種別マスタ + 異常種別リスト |

#### GET `/projects`

```json
// Response 200
{
  "projects": [
    {
      "id": "uuid",
      "title": "○○太陽光点検",
      "inspectionType": "SOLAR_PANEL",
      "siteName": "○○発電所",
      "inspectionDate": "2026-06-01",
      "status": "draft",
      "imageCount": 12,
      "anomalyCount": 3,
      "createdAt": "2026-06-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### POST `/projects`

```json
// Request
{
  "title": "○○太陽光点検",
  "inspectionType": "SOLAR_PANEL",
  "siteName": "○○発電所",
  "inspectionDate": "2026-06-01",
  "location": "千葉県○○市",
  "equipment": "DJI Mavic 3T",
  "weather": "晴れ",
  "notes": ""
}

// Response 201
{ "project": { "id": "uuid", "inspectionType": "SOLAR_PANEL", ... } }
```

#### GET `/projects/inspection-types`

```json
// Response 200
{
  "inspectionTypes": [
    {
      "code": "SOLAR_PANEL",
      "label": "太陽光パネル",
      "anomalyTypes": [
        { "code": "HOT_SPOT", "label": "ホットスポット" },
        { "code": "DELAMINATION", "label": "層間剥離" }
      ]
    },
    {
      "code": "EXTERIOR_WALL",
      "label": "外壁",
      "anomalyTypes": [ "..." ]
    },
    {
      "code": "ROOF",
      "label": "屋根",
      "anomalyTypes": [ "..." ]
    }
  ]
}
```

---

### 画像 `/api/v1/projects/:projectId/images`

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/projects/:id/images` | 必要 | 画像一覧 |
| POST | `/projects/:id/images` | 必要 | 画像アップロード（multipart） |
| GET | `/projects/:id/images/:imageId/file` | 必要 | 画像ファイル配信 |
| DELETE | `/projects/:id/images/:imageId` | 必要 | 画像削除 |

---

### 異常 `/api/v1/projects/:projectId/anomalies`

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/projects/:id/anomalies` | 必要 | 異常一覧 |
| POST | `/projects/:id/anomalies` | 必要 | 異常記録作成 |
| PATCH | `/projects/:id/anomalies/:anomalyId` | 必要 | 異常更新 |
| DELETE | `/projects/:id/anomalies/:anomalyId` | 必要 | 異常削除 |

#### POST `/projects/:id/anomalies`

```json
// Request
{
  "imageId": "uuid",
  "type": "HOT_SPOT",
  "comment": "パネル右上に温度上昇を確認",
  "aiComment": "AI生成: セル単位の温度上昇が確認され...",
  "markerX": 0.65,
  "markerY": 0.30,
  "markerW": 0.10,
  "markerH": 0.08,
  "severity": "high"
}

// Response 201
{ "anomaly": { "id": "uuid", ... } }
```

---

### AI 診断コメント `/api/v1/projects/:projectId/ai`

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| POST | `/projects/:id/ai/diagnostic-comment` | 必要 | AI 診断コメント生成 |

#### POST `/projects/:id/ai/diagnostic-comment`

```json
// Request
{
  "anomalyType": "HOT_SPOT",
  "severity": "high",
  "memo": "パネル右上付近"
}

// Response 200
{
  "comment": "太陽光パネル右上部にホットスポットを確認。セル単位の温度上昇（ΔT 15°C 以上）が見られ、バイパスダイオードの故障またはセルの微細クラックが疑われる。早期の詳細点検および該当パネルの交換を推奨する。",
  "generatedAt": "2026-06-01T12:00:00Z"
}
```

**処理フロー：**

1. プロジェクトの `inspection_type` を取得
2. 点検種別 + 異常種別 + 重要度 + メモをプロンプトに組み立て
3. LLM API を呼び出し（サーバー側のみ、API キーは環境変数）
4. 生成コメントを返却 → 異常保存時に `ai_comment` として DB 保存

**自動生成:** `POST /anomalies` 保存時にバックグラウンドで実行  
**手動再生成:** `POST /ai/diagnostic-comment`（既存）

**制約：**

- 画像データは LLM に送信しない
- レートリミット: 10 回 / 分 / ユーザー
- タイムアウト: 15 秒

---

### 評価 `/api/v1/projects/:projectId/assessment`

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/projects/:id/assessment` | 必要 | 評価サマリー取得 |
| POST | `/projects/:id/assessment/recalculate` | 必要 | 評価再算出 |

#### GET `/projects/:id/assessment`

```json
{
  "overallScore": "C",
  "autoOverallScore": "C",
  "roofLife": { "min": 12, "max": 15 },
  "solarRisk": "MEDIUM",
  "anomalyCount": 4,
  "recommendedPlans": [
    { "type": "MINOR", "title": "簡易補修", "isRecommended": false, "summary": "..." },
    { "type": "MODERATE", "title": "中規模改修", "isRecommended": true, "summary": "..." },
    { "type": "MAJOR", "title": "大規模改修", "isRecommended": false, "summary": "..." }
  ],
  "calculatedAt": "2026-06-07T12:00:00Z"
}
```

---

### 報告書 `/api/v1/projects/:projectId/reports`

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/projects/:id/reports` | 必要 | 報告書一覧（reportType 含む） |
| POST | `/projects/:id/reports` | 必要 | 報告書 PDF 生成（3 種対応） |
| GET | `/projects/:id/reports/:reportId/file` | 必要 | PDF ダウンロード |

#### POST `/projects/:id/reports`

```json
// Request
{
  "reportType": "SALES",
  "includeSolarAnnex": true,
  "companyName": "株式会社 嶋口"
}

// Response 201
{
  "report": {
    "id": "uuid",
    "reportType": "SALES",
    "filename": "嶋口様_20260607_提案版.pdf",
    "pageCount": 8,
    "downloadUrl": "/api/v1/projects/:id/reports/:reportId/file"
  }
}
```

> `reportType`: `SURVEY`（調査版）/ `CUSTOMER`（顧客提出版）/ `SALES`（営業提案版）

---

### 管理者 `/api/v1/admin`

| Method | Path | 認証 | 説明 |
|--------|------|------|------|
| GET | `/admin/users` | Admin | 全ユーザー一覧（role 含む） |

#### GET `/admin/users`

```json
// Response 200
{
  "users": [
    {
      "id": "uuid",
      "name": "山田 太郎",
      "email": "yamada@gmail.com",
      "role": "operator",
      "createdAt": "2026-06-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

## 認可ルール

| リソース | ルール |
|----------|--------|
| projects | 自分が作成したもののみ CRUD |
| images | 所属プロジェクトの所有者のみ |
| anomalies | 所属プロジェクトの所有者のみ |
| ai/diagnostic-comment | 所属プロジェクトの所有者のみ |
| assessment/* | 所属プロジェクトの所有者のみ |
| reports | 所属プロジェクトの所有者のみ |
| admin/* | `role = admin` のみ |

---

## レートリミット

| エンドポイント | 制限 |
|----------------|------|
| `/auth/google` | 10 回 / 15 分 / IP |
| `/ai/diagnostic-comment` | 10 回 / 1 分 / ユーザー |
| 画像アップロード | 50 枚 / 1 回 |
| その他 API | 100 回 / 1 分 / ユーザー |
