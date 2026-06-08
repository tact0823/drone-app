import { getPool } from '../db/pool.js';
import { INSPECTION_TYPES } from '../constants/inspectionTypes.js';
import type { InspectionType } from '../types/project.js';
import type {
  Anomaly,
  AnomalyType,
  CreateAnomalyInput,
  OverallScore,
  RecommendedTiming,
  SeverityLevel,
  UpdateAnomalyInput,
} from '../types/anomaly.js';
import { ValidationError, type ValidationDetail } from '../types/project.js';
import { autoGrade, calculateUrgency } from './assessmentEngine.js';
import { analyzeAnomaly } from './aiService.js';
import { findImageById } from './imageService.js';
import { recalculateProjectAssessment } from './assessmentService.js';

interface AnomalyRow {
  id: string;
  project_id: string;
  image_id: string;
  type: AnomalyType;
  comment: string | null;
  ai_comment: string | null;
  marker_x: number;
  marker_y: number;
  marker_w: number;
  marker_h: number;
  severity: SeverityLevel;
  finding_number: number | null;
  overall_grade: OverallScore | null;
  auto_overall_grade: OverallScore | null;
  urgency_stars: number | null;
  recommended_timing: RecommendedTiming | null;
  direction: string | null;
  check_content: string | null;
  part_name: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapAnomaly(row: AnomalyRow): Anomaly {
  return {
    id: row.id,
    projectId: row.project_id,
    imageId: row.image_id,
    type: row.type,
    comment: row.comment,
    aiComment: row.ai_comment,
    markerX: row.marker_x,
    markerY: row.marker_y,
    markerW: row.marker_w,
    markerH: row.marker_h,
    severity: row.severity,
    findingNumber: row.finding_number,
    overallGrade: row.overall_grade,
    autoOverallGrade: row.auto_overall_grade,
    urgencyStars: row.urgency_stars,
    recommendedTiming: row.recommended_timing,
    direction: row.direction,
    checkContent: row.check_content,
    partName: row.part_name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function isAllowedAnomalyType(inspectionType: InspectionType, type: AnomalyType): boolean {
  const master = INSPECTION_TYPES.find((item) => item.code === inspectionType);
  return master?.anomalyTypes.some((item) => item.code === type) ?? false;
}

function validateMarker(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max) {
    throw new ValidationError([{ field, message: `${field}の値が不正です` }]);
  }
  return value;
}

function validateSeverity(value: unknown): SeverityLevel {
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  throw new ValidationError([{ field: 'severity', message: '重要度を選択してください' }]);
}

function validateAnomalyType(
  inspectionType: InspectionType,
  value: unknown,
): AnomalyType {
  if (typeof value !== 'string') {
    throw new ValidationError([{ field: 'type', message: '異常種別を選択してください' }]);
  }
  if (!isAllowedAnomalyType(inspectionType, value as AnomalyType)) {
    throw new ValidationError([{ field: 'type', message: 'この点検種別では使用できない異常種別です' }]);
  }
  return value as AnomalyType;
}

export async function listAnomaliesByProject(projectId: string): Promise<Anomaly[]> {
  const result = await getPool().query<AnomalyRow>(
    'SELECT * FROM anomalies WHERE project_id = $1 ORDER BY finding_number ASC NULLS LAST, created_at ASC',
    [projectId],
  );
  return result.rows.map(mapAnomaly);
}

export async function findAnomalyById(
  projectId: string,
  anomalyId: string,
): Promise<Anomaly | null> {
  const result = await getPool().query<AnomalyRow>(
    'SELECT * FROM anomalies WHERE id = $1 AND project_id = $2',
    [anomalyId, projectId],
  );
  return result.rows[0] ? mapAnomaly(result.rows[0]) : null;
}

async function nextFindingNumber(projectId: string): Promise<number> {
  const result = await getPool().query<{ max: number | null }>(
    'SELECT MAX(finding_number) AS max FROM anomalies WHERE project_id = $1',
    [projectId],
  );
  return (result.rows[0]?.max ?? 0) + 1;
}

export async function createAnomaly(
  projectId: string,
  inspectionType: InspectionType,
  input: CreateAnomalyInput,
): Promise<Anomaly> {
  const image = await findImageById(projectId, input.imageId);
  if (!image) {
    throw new ValidationError([{ field: 'imageId', message: '画像が見つかりません' }]);
  }

  const type = validateAnomalyType(inspectionType, input.type);
  const severity = validateSeverity(input.severity);
  const markerX = validateMarker(input.markerX, 'markerX', 0, 1);
  const markerY = validateMarker(input.markerY, 'markerY', 0, 1);
  const markerW = validateMarker(input.markerW, 'markerW', 0.01, 1);
  const markerH = validateMarker(input.markerH, 'markerH', 0.01, 1);

  const autoOverallGrade = autoGrade(type, severity);
  const overallGrade = input.overallGrade ?? autoOverallGrade;
  const { stars, timing } = calculateUrgency(overallGrade);

  let aiComment = input.comment?.trim() ?? '';
  let checkContent = input.checkContent ?? null;

  if (!aiComment) {
    const analysis = await analyzeAnomaly({
      inspectionType,
      partName: input.partName ?? input.memo,
      direction: input.direction,
      memo: input.memo,
      marker: { x: markerX, y: markerY, w: markerW, h: markerH },
    });
    aiComment = analysis.comment;
    checkContent = checkContent ?? analysis.checkContent;
  }

  const findingNumber = await nextFindingNumber(projectId);

  const result = await getPool().query<AnomalyRow>(
    `INSERT INTO anomalies (
       project_id, image_id, type, comment, ai_comment,
       marker_x, marker_y, marker_w, marker_h, severity,
       finding_number, overall_grade, auto_overall_grade,
       urgency_stars, recommended_timing, direction, check_content, part_name
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [
      projectId,
      input.imageId,
      type,
      input.comment ?? aiComment,
      aiComment,
      markerX,
      markerY,
      markerW,
      markerH,
      severity,
      findingNumber,
      overallGrade,
      autoOverallGrade,
      stars,
      timing,
      input.direction ?? null,
      checkContent,
      input.partName ?? null,
    ],
  );

  await recalculateProjectAssessment(projectId, inspectionType);
  return mapAnomaly(result.rows[0]);
}

export async function regenerateAnomalyAiComment(
  projectId: string,
  anomalyId: string,
  inspectionType: InspectionType,
): Promise<Anomaly | null> {
  const existing = await findAnomalyById(projectId, anomalyId);
  if (!existing) return null;

  const analysis = await analyzeAnomaly({
    inspectionType,
    partName: existing.partName,
    direction: existing.direction,
    checkContent: existing.checkContent,
    marker: {
      x: existing.markerX,
      y: existing.markerY,
      w: existing.markerW,
      h: existing.markerH,
    },
    regenerate: true,
  });

  const autoOverallGrade = autoGrade(analysis.anomalyType, analysis.severity);
  const { stars, timing } = calculateUrgency(autoOverallGrade);

  const result = await getPool().query<AnomalyRow>(
    `UPDATE anomalies SET
       type = $1, severity = $2, comment = $3, ai_comment = $3,
       check_content = $4, auto_overall_grade = $5,
       urgency_stars = $6, recommended_timing = $7, updated_at = NOW()
     WHERE id = $8 AND project_id = $9
     RETURNING *`,
    [
      analysis.anomalyType,
      analysis.severity,
      analysis.comment,
      analysis.checkContent,
      autoOverallGrade,
      stars,
      timing,
      anomalyId,
      projectId,
    ],
  );

  const updated = result.rows[0] ? mapAnomaly(result.rows[0]) : null;
  if (updated) {
    await recalculateProjectAssessment(projectId, inspectionType);
  }
  return updated;
}

export async function updateAnomaly(
  projectId: string,
  anomalyId: string,
  inspectionType: InspectionType,
  input: UpdateAnomalyInput,
): Promise<Anomaly | null> {
  const existing = await findAnomalyById(projectId, anomalyId);
  if (!existing) return null;

  const type = input.type ? validateAnomalyType(inspectionType, input.type) : existing.type;
  const severity = input.severity ? validateSeverity(input.severity) : existing.severity;
  const autoOverallGrade = autoGrade(type, severity);
  const overallGrade = input.overallGrade ?? existing.overallGrade ?? autoOverallGrade;
  const { stars, timing } = calculateUrgency(overallGrade);

  const markerX =
    input.markerX !== undefined
      ? validateMarker(input.markerX, 'markerX', 0, 1)
      : existing.markerX;
  const markerY =
    input.markerY !== undefined
      ? validateMarker(input.markerY, 'markerY', 0, 1)
      : existing.markerY;
  const markerW =
    input.markerW !== undefined
      ? validateMarker(input.markerW, 'markerW', 0.01, 1)
      : existing.markerW;
  const markerH =
    input.markerH !== undefined
      ? validateMarker(input.markerH, 'markerH', 0.01, 1)
      : existing.markerH;

  const result = await getPool().query<AnomalyRow>(
    `UPDATE anomalies SET
       type = $1, comment = $2, marker_x = $3, marker_y = $4, marker_w = $5, marker_h = $6,
       severity = $7, overall_grade = $8, auto_overall_grade = $9,
       urgency_stars = $10, recommended_timing = $11,
       direction = $12, check_content = $13, part_name = $14, updated_at = NOW()
     WHERE id = $15 AND project_id = $16
     RETURNING *`,
    [
      type,
      input.comment !== undefined ? input.comment : existing.comment,
      markerX,
      markerY,
      markerW,
      markerH,
      severity,
      overallGrade,
      autoOverallGrade,
      stars,
      timing,
      input.direction !== undefined ? input.direction : existing.direction,
      input.checkContent !== undefined ? input.checkContent : existing.checkContent,
      input.partName !== undefined ? input.partName : existing.partName,
      anomalyId,
      projectId,
    ],
  );

  await recalculateProjectAssessment(projectId, inspectionType);
  return result.rows[0] ? mapAnomaly(result.rows[0]) : null;
}

export async function deleteAnomaly(
  projectId: string,
  anomalyId: string,
  inspectionType: InspectionType,
): Promise<boolean> {
  const result = await getPool().query(
    'DELETE FROM anomalies WHERE id = $1 AND project_id = $2',
    [anomalyId, projectId],
  );
  if ((result.rowCount ?? 0) === 0) return false;
  await recalculateProjectAssessment(projectId, inspectionType);
  return true;
}

export function validateCreateAnomalyBody(body: unknown): CreateAnomalyInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError([{ field: '_', message: 'リクエストが不正です' }]);
  }
  const data = body as Record<string, unknown>;
  return {
    imageId: String(data.imageId ?? ''),
    type: data.type as AnomalyType,
    comment: typeof data.comment === 'string' ? data.comment : null,
    markerX: Number(data.markerX),
    markerY: Number(data.markerY),
    markerW: Number(data.markerW),
    markerH: Number(data.markerH),
    severity: data.severity as SeverityLevel,
    overallGrade: (data.overallGrade as OverallScore | null) ?? null,
    partName: typeof data.partName === 'string' ? data.partName : null,
    direction: typeof data.direction === 'string' ? data.direction : null,
    checkContent: typeof data.checkContent === 'string' ? data.checkContent : null,
    memo: typeof data.memo === 'string' ? data.memo : null,
  };
}
