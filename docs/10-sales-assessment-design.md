# 10. 営業支援型評価設計

## 目的

報告書を **「調査記録」から「工事受注率を上げる営業提案ツール」** に昇格させる。

点検データ → 自動評価 → 推奨工事プラン → 3 種 PDF 出力 の一気通貫フローを設計する。

---

## 評価パイプライン

```
[異常記録 + AI コメント]
        ↓
[異常ごと評価] 緊急度★ / 推奨対応時期 / 個別グレード
        ↓
[プロジェクト評価] 総合スコア A〜E / 屋根残寿命 / 太陽光リスク
        ↓
[推奨工事プラン] 簡易補修 / 中規模改修 / 大規模改修
        ↓
[PDF 生成] 調査版 / 顧客提出版 / 営業提案版
```

---

## 1. 総合評価スコア（A〜E）— 自動算出

### 定義

| スコア | 名称 | 意味 | 営業メッセージ |
|--------|------|------|---------------|
| **A** | 正常 | 異常なし、または軽微 | 「現状良好。定期点検のみ」 |
| **B** | 軽度劣化 | 経年劣化あり、急ぎ不要 | 「予防保全の提案タイミング」 |
| **C** | 要点検 | 劣化進行中、計画的対応必要 | 「6 か月以内の点検・部分補修を推奨」 |
| **D** | 要修繕 | 機能に影響する劣化 | 「1 年以内の修繕工事を推奨」 |
| **E** | 緊急 | 安全・性能に直結 | 「即時対応が必要」 |

### 自動算出ロジック

```typescript
// 概要（実装は Phase 3/4）
function calculateOverallScore(anomalies: Anomaly[]): OverallScore {
  if (anomalies.length === 0) return 'A';

  const worst = anomalies.reduce((max, a) =>
    gradeWeight(a.overall_grade) > gradeWeight(max.overall_grade) ? a : max
  , anomalies[0]);

  // 異常の最悪グレードをベースに、件数・緊急度で補正
  let score = worst.overall_grade;

  const urgentCount = anomalies.filter(a => a.urgency_stars >= 4).length;
  const emergencyCount = anomalies.filter(a => a.recommended_timing === 'IMMEDIATE').length;

  if (emergencyCount >= 1) score = 'E';
  else if (urgentCount >= 2 && score < 'D') score = 'D';
  else if (urgentCount >= 1 && score < 'C') score = 'C';

  return score;
}

function gradeWeight(g: OverallScore): number {
  return { A: 1, B: 2, C: 3, D: 4, E: 5 }[g];
}
```

### 異常種別 → 初期グレード マッピング

| 異常種別 | severity: low | severity: medium | severity: high |
|----------|---------------|----------------|----------------|
| HOT_SPOT | C | D | E |
| DELAMINATION | C | D | E |
| MOISTURE | B | C | D |
| CRACK | B | C | D |
| INSULATION_DEFECT | B | C | D |
| DETERIORATION | B | C | D |
| OTHER | B | C | C |

> オペレーターが手動で上書き可能。自動算出値は `auto_overall_grade` として保持。

### 保存先

- `projects.overall_score` — 確定値
- `projects.auto_overall_score` — 自動算出値
- `anomalies.overall_grade` — 異常ごとの A〜E

---

## 2. 異常ごと：緊急度・推奨対応時期

### 緊急度（★1〜★5）

| ★ | 意味 | 算出条件（自動） |
|---|------|-----------------|
| ★☆☆☆☆ | 低 | overall_grade A or B |
| ★★☆☆☆ | やや低 | overall_grade B + severity medium |
| ★★★☆☆ | 中 | overall_grade C |
| ★★★★☆ | 高 | overall_grade D |
| ★★★★★ | 最高 | overall_grade E or IMMEDIATE timing |

### 推奨対応時期

| コード | 表示 | 自動マッピング（overall_grade ベース） |
|--------|------|--------------------------------------|
| `IMMEDIATE` | 即時 | E |
| `WITHIN_6_MONTHS` | 6 か月以内 | D |
| `WITHIN_1_YEAR` | 1 年以内 | C |
| `WITHIN_3_YEARS` | 3 年以内 | B |
| `MONITORING` | 経過観察 | A |

```typescript
function calculateUrgency(anomaly: AnomalyInput): { stars: number; timing: RecommendedTiming } {
  const grade = anomaly.overall_grade ?? autoGrade(anomaly);
  const timingMap: Record<OverallScore, RecommendedTiming> = {
    A: 'MONITORING', B: 'WITHIN_3_YEARS', C: 'WITHIN_1_YEAR',
    D: 'WITHIN_6_MONTHS', E: 'IMMEDIATE',
  };
  const starsMap: Record<OverallScore, number> = {
    A: 1, B: 2, C: 3, D: 4, E: 5,
  };
  return { stars: starsMap[grade], timing: timingMap[grade] };
}
```

---

## 3. 屋根残寿命推定

### 表示形式

```
推定残寿命：15〜20 年
```

### 算出ロジック

```typescript
function estimateRoofLife(project: Project, anomalies: Anomaly[]): { min: number; max: number } {
  const BASE_LIFE: Record<string, number> = {
    'スレート': 30, '金属': 40, 'アスファルト': 20, '未知': 25,
  };
  const base = BASE_LIFE[project.roof_material ?? '未知'] ?? 25;
  const age = parseBuildingAge(project.building_age); // 築年数を数値化

  const roofAnomalies = anomalies.filter(a =>
    ['MOISTURE', 'CRACK', 'DETERIORATION', 'INSULATION_DEFECT'].includes(a.type)
  );

  let penalty = 0;
  for (const a of roofAnomalies) {
    penalty += { A: 0, B: 1, C: 3, D: 5, E: 8 }[a.overall_grade ?? 'B'];
  }

  const remaining = Math.max(0, base - age - penalty);
  return { min: Math.max(0, remaining - 3), max: remaining };
}
```

### 保存先

| カラム | 説明 |
|--------|------|
| `projects.roof_life_min` | 推定残寿命（下限・年） |
| `projects.roof_life_max` | 推定残寿命（上限・年） |
| `projects.roof_material` | 屋根材質（算出ベース） |

> 点検種別が `ROOF` または複合点検時のみ表示。Post-MVP で複合対応。

---

## 4. 太陽光パネル健全度 — 発電リスク

### 表示形式

```
発電リスク：中
```

| リスク | 表示 | 条件 |
|--------|------|------|
| `LOW` | 低 | 太陽光異常 0 件、または全件 A/B |
| `MEDIUM` | 中 | C 級異常 1 件以上、または D 級 1 件 |
| `HIGH` | 高 | E 級 1 件以上、または D 級 2 件以上、または HOT_SPOT + DELAMINATION 複合 |

```typescript
function calculateSolarRisk(anomalies: Anomaly[]): SolarRisk {
  const solar = anomalies.filter(a =>
    ['HOT_SPOT', 'COLD_SPOT', 'DELAMINATION'].includes(a.type)
  );
  if (solar.length === 0) return 'LOW';

  const hasE = solar.some(a => a.overall_grade === 'E');
  const dCount = solar.filter(a => a.overall_grade === 'D').length;
  const cCount = solar.filter(a => a.overall_grade === 'C').length;

  if (hasE || dCount >= 2) return 'HIGH';
  if (dCount >= 1 || cCount >= 1) return 'MEDIUM';
  return 'LOW';
}
```

### 保存先

| カラム | 説明 |
|--------|------|
| `projects.solar_risk` | LOW / MEDIUM / HIGH |

---

## 5. 推奨工事プラン（報告書最終ページ）

### 3 段階プラン

| プラン | 名称 | 自動選定条件 | 内容例 |
|--------|------|-------------|--------|
| `MINOR` | 簡易補修 | overall_score B or C（異常 1〜2 件） | 部分シーリング、瓦差し替え、パネル清掃 |
| `MODERATE` | 中規模改修 | overall_score C or D（異常 3〜5 件） | 部分葺き替え、バイパスダイオード交換、部分防水 |
| `MAJOR` | 大規模改修 | overall_score D or E（異常 6 件以上 or E あり） | 全面葺き替え、パネル交換、大規模防水工事 |

### 自動生成内容

各プランに以下を AI + ルールベースで生成：

- **工事概要**（1〜2 行）
- **対象部位一覧**
- **概算工期**（目安）
- **優先度**

```typescript
function recommendPlans(project: Project, anomalies: Anomaly[]): ConstructionPlan[] {
  const score = project.overall_score;
  const count = anomalies.length;
  const plans: ConstructionPlan[] = [];

  // 常に 3 プランを生成。overall_score に応じて「推奨」バッジを付与
  plans.push(buildMinorPlan(anomalies));
  plans.push(buildModeratePlan(anomalies));
  plans.push(buildMajorPlan(anomalies));

  const recommended =
    score === 'E' || score === 'D' ? 'MAJOR' :
    score === 'C' ? 'MODERATE' : 'MINOR';

  return plans.map(p => ({ ...p, isRecommended: p.type === recommended }));
}
```

### 保存先

`project_assessments` テーブル（JSON）または `projects.recommended_plans` JSONB

---

## 6. AI 診断コメント — 異常ごと自動生成

### 方針変更

| 項目 | 旧 | 新 |
|------|----|----|
| 生成タイミング | 手動ボタン | **異常保存時に自動生成**（手動再生成も可） |
| 内容 | 所見文案 | 所見 + リスク説明 + 推奨アクション |
| 報告書反映 | comment フィールド | ai_comment + comment（編集後） |

### AI プロンプト構成

```
入力: 点検種別, 異常種別, overall_grade, urgency_stars, recommended_timing, part_name
出力:
  1. 診断所見（100〜200 文字）
  2. リスク説明（50〜100 文字）
  3. 推奨アクション（50 文字）
```

### API

- 自動: `POST /anomalies` 保存時にバックグラウンド生成
- 手動: `POST /projects/:id/ai/diagnostic-comment`（既存、再生成用）

---

## 7. 報告書 3 種類

### 種別定義

| コード | 名称 | 用途 | 含むページ |
|--------|------|------|-----------|
| `SURVEY` | 調査版 | 社内記録・技術確認 | 全ページ + 技術詳細 + 生データ |
| `CUSTOMER` | 顧客提出版 | 施主への正式報告 | T-01〜T-05（営業要素を抑制） |
| `SALES` | 営業提案版 | 工事受注の提案 | T-01〜T-05 + T-06 評価 + T-07 工事プラン |

### ページ差分

| ページ | 調査版 | 顧客提出版 | 営業提案版 |
|--------|--------|-----------|-----------|
| T-01 表紙 | ✅ | ✅ | ✅（「ご提案書」副題） |
| T-02 概要 + スコア | ✅ 詳細 | ✅ スコアのみ | ✅ 強調表示 |
| T-03 太陽光別紙 | ✅ 全データ | ✅ 概要 | ✅ + 発電リスク |
| T-04 異常詳細 | ✅ 全項目 | ✅ 所見のみ | ✅ + 緊急度★ + 対応時期 |
| T-05 総括 | ✅ 技術総括 | ✅ 所見総括 | ✅ 営業文案 |
| T-06 評価サマリー | ✅ | ❌ | ✅ 大きく表示 |
| T-07 推奨工事プラン | ❌ | ❌ | ✅ |
| 内部メモ・座標データ | ✅ | ❌ | ❌ |

### 生成 API

```json
// POST /projects/:id/reports
{
  "reportType": "SALES",  // SURVEY | CUSTOMER | SALES
  "includeSolarAnnex": true
}
```

### ファイル命名

```
{clientName}_{date}_調査版.pdf
{clientName}_{date}_提出版.pdf
{clientName}_{date}_提案版.pdf
```

---

## 評価再算出トリガー

| イベント | 動作 |
|----------|------|
| 異常 CREATE / UPDATE / DELETE | 異常評価 → プロジェクト評価 → 工事プラン再算出 |
| プロジェクト building_age / roof_material 変更 | 屋根残寿命再算出 |
| 報告書生成前 | 最新評価をスナップショットして PDF に反映 |

### 評価 API

| Method | Path | 説明 |
|--------|------|------|
| GET | `/projects/:id/assessment` | 現在の評価サマリー取得 |
| POST | `/projects/:id/assessment/recalculate` | 手動再算出 |

```json
// GET /projects/:id/assessment  Response
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
