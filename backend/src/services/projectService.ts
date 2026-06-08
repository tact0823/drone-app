import {
  ValidationError,
  type CreateProjectInput,
  type InspectionType,
  type Project,
  type ProjectListItem,
  type ProjectStatus,
  type OverallScore,
  type SolarRisk,
  type ConstructionPlan,
  type UpdateProjectInput,
  type ValidationDetail,
} from '../types/project.js';
import { INSPECTION_TYPE_CODES } from '../constants/inspectionTypes.js';
import { getPool } from '../db/pool.js';

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  inspection_type: InspectionType;
  site_name: string;
  inspection_date: string | Date;
  location: string | null;
  equipment: string | null;
  weather: string | null;
  notes: string | null;
  client_name: string | null;
  structure: string | null;
  floors: string | null;
  building_age: string | null;
  roof_material: string | null;
  overall_score: OverallScore | null;
  auto_overall_score: OverallScore | null;
  roof_life_min: number | null;
  roof_life_max: number | null;
  solar_risk: SolarRisk | null;
  recommended_plans: unknown;
  status: ProjectStatus;
  created_at: Date;
  updated_at: Date;
}

interface ProjectListRow extends ProjectRow {
  image_count: string;
  anomaly_count: string;
}

function parsePlans(value: unknown): ConstructionPlan[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value as ConstructionPlan[];
  return null;
}

function formatDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    inspectionType: row.inspection_type,
    siteName: row.site_name,
    inspectionDate: formatDateOnly(row.inspection_date),
    location: row.location,
    equipment: row.equipment,
    weather: row.weather,
    notes: row.notes,
    clientName: row.client_name,
    structure: row.structure,
    floors: row.floors,
    buildingAge: row.building_age,
    roofMaterial: row.roof_material,
    overallScore: row.overall_score,
    autoOverallScore: row.auto_overall_score,
    roofLifeMin: row.roof_life_min,
    roofLifeMax: row.roof_life_max,
    solarRisk: row.solar_risk,
    recommendedPlans: parsePlans(row.recommended_plans),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapListItem(row: ProjectListRow): ProjectListItem {
  return {
    id: row.id,
    title: row.title,
    inspectionType: row.inspection_type,
    siteName: row.site_name,
    inspectionDate: formatDateOnly(row.inspection_date),
    status: row.status,
    imageCount: Number(row.image_count),
    anomalyCount: Number(row.anomaly_count),
    createdAt: row.created_at.toISOString(),
  };
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function validateRequiredString(
  details: ValidationDetail[],
  field: string,
  value: unknown,
  label: string,
  maxLength = 200,
): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    details.push({ field, message: `${label}を入力してください` });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    details.push({ field, message: `${label}は${maxLength}文字以内で入力してください` });
    return undefined;
  }
  return trimmed;
}

function validateInspectionType(details: ValidationDetail[], value: unknown): InspectionType | undefined {
  if (typeof value !== 'string' || !INSPECTION_TYPE_CODES.includes(value as InspectionType)) {
    details.push({ field: 'inspectionType', message: '点検種別を選択してください' });
    return undefined;
  }
  return value as InspectionType;
}

function validateInspectionDate(details: ValidationDetail[], value: unknown): string | undefined {
  if (typeof value !== 'string' || !isValidDate(value)) {
    details.push({ field: 'inspectionDate', message: '有効な点検日を入力してください' });
    return undefined;
  }
  return value;
}

export function validateCreateInput(input: CreateProjectInput): CreateProjectInput {
  const details: ValidationDetail[] = [];
  const title = validateRequiredString(details, 'title', input.title, 'プロジェクト名');
  const inspectionType = validateInspectionType(details, input.inspectionType);
  const siteName = validateRequiredString(details, 'siteName', input.siteName, '点検現場名');
  const clientName = validateRequiredString(details, 'clientName', input.clientName, '依頼者名');
  const inspectionDate = validateInspectionDate(details, input.inspectionDate);

  if (details.length > 0) {
    throw new ValidationError(details);
  }

  return {
    title: title!,
    inspectionType: inspectionType!,
    siteName: siteName!,
    clientName: clientName!,
    inspectionDate: inspectionDate!,
    location: input.location?.trim() || undefined,
    equipment: input.equipment?.trim() || undefined,
    weather: input.weather?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    structure: input.structure?.trim() || undefined,
    floors: input.floors?.trim() || undefined,
    buildingAge: input.buildingAge?.trim() || undefined,
    roofMaterial: input.roofMaterial?.trim() || undefined,
  };
}

export function validateUpdateInput(input: UpdateProjectInput): UpdateProjectInput {
  const details: ValidationDetail[] = [];
  const result: UpdateProjectInput = {};

  if (input.title !== undefined) {
    const title = validateRequiredString(details, 'title', input.title, 'プロジェクト名');
    if (title) result.title = title;
  }
  if (input.inspectionType !== undefined) {
    const inspectionType = validateInspectionType(details, input.inspectionType);
    if (inspectionType) result.inspectionType = inspectionType;
  }
  if (input.siteName !== undefined) {
    const siteName = validateRequiredString(details, 'siteName', input.siteName, '点検現場名');
    if (siteName) result.siteName = siteName;
  }
  if (input.clientName !== undefined) {
    const clientName = validateRequiredString(details, 'clientName', input.clientName, '依頼者名');
    if (clientName) result.clientName = clientName;
  }
  if (input.inspectionDate !== undefined) {
    const inspectionDate = validateInspectionDate(details, input.inspectionDate);
    if (inspectionDate) result.inspectionDate = inspectionDate;
  }
  if (input.status !== undefined) {
    if (input.status !== 'draft' && input.status !== 'completed') {
      details.push({ field: 'status', message: '無効なステータスです' });
    } else {
      result.status = input.status;
    }
  }

  const optionalStringFields: Array<[keyof UpdateProjectInput, string, number]> = [
    ['location', '場所', 300],
    ['equipment', '使用機材', 200],
    ['weather', '天候', 100],
    ['structure', '構造', 100],
    ['floors', '階数', 20],
    ['buildingAge', '築年数', 50],
    ['roofMaterial', '屋根材質', 100],
  ];

  for (const [field, label, maxLength] of optionalStringFields) {
    const value = input[field];
    if (value === undefined) continue;
    if (value === null) {
      (result as Record<string, string | null>)[field] = null;
      continue;
    }
    if (typeof value !== 'string') {
      details.push({ field: String(field), message: `${label}の形式が不正です` });
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length > maxLength) {
      details.push({ field: String(field), message: `${label}は${maxLength}文字以内で入力してください` });
      continue;
    }
    (result as Record<string, string | null>)[field] = trimmed || null;
  }

  if (input.notes !== undefined) {
    result.notes = typeof input.notes === 'string' ? input.notes.trim() || null : null;
  }

  if (details.length > 0) {
    throw new ValidationError(details);
  }

  if (Object.keys(result).length === 0) {
    details.push({ field: '_', message: '更新する項目がありません' });
    throw new ValidationError(details);
  }

  return result;
}

export async function listProjectsByUser(userId: string): Promise<ProjectListItem[]> {
  const result = await getPool().query<ProjectListRow>(
    `SELECT p.*,
            COALESCE(i.cnt, 0)::text AS image_count,
            COALESCE(a.cnt, 0)::text AS anomaly_count
     FROM projects p
     LEFT JOIN (
       SELECT project_id, COUNT(*) AS cnt FROM images GROUP BY project_id
     ) i ON i.project_id = p.id
     LEFT JOIN (
       SELECT project_id, COUNT(*) AS cnt FROM anomalies GROUP BY project_id
     ) a ON a.project_id = p.id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId],
  );
  return result.rows.map(mapListItem);
}

export async function findProjectById(id: string): Promise<Project | null> {
  const result = await getPool().query<ProjectRow>('SELECT * FROM projects WHERE id = $1', [id]);
  return result.rows[0] ? mapProject(result.rows[0]) : null;
}

export async function createProject(userId: string, input: CreateProjectInput): Promise<Project> {
  const validated = validateCreateInput(input);
  const result = await getPool().query<ProjectRow>(
    `INSERT INTO projects (
       user_id, title, inspection_type, site_name, inspection_date,
       client_name, location, equipment, weather, notes,
       structure, floors, building_age, roof_material
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      userId,
      validated.title,
      validated.inspectionType,
      validated.siteName,
      validated.inspectionDate,
      validated.clientName,
      validated.location ?? null,
      validated.equipment ?? null,
      validated.weather ?? null,
      validated.notes ?? null,
      validated.structure ?? null,
      validated.floors ?? null,
      validated.buildingAge ?? null,
      validated.roofMaterial ?? null,
    ],
  );
  return mapProject(result.rows[0]);
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
  const validated = validateUpdateInput(input);
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  const columnMap: Record<string, string> = {
    title: 'title',
    inspectionType: 'inspection_type',
    siteName: 'site_name',
    inspectionDate: 'inspection_date',
    clientName: 'client_name',
    location: 'location',
    equipment: 'equipment',
    weather: 'weather',
    notes: 'notes',
    structure: 'structure',
    floors: 'floors',
    buildingAge: 'building_age',
    roofMaterial: 'roof_material',
    status: 'status',
  };

  for (const [key, column] of Object.entries(columnMap)) {
    const value = validated[key as keyof UpdateProjectInput];
    if (value !== undefined) {
      fields.push(`${column} = $${index++}`);
      values.push(value);
    }
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await getPool().query<ProjectRow>(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
    values,
  );
  return result.rows[0] ? mapProject(result.rows[0]) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  const result = await getPool().query('DELETE FROM projects WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export interface AdminProjectListItem extends ProjectListItem {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
}

interface AdminProjectRow extends ProjectListRow {
  owner_name: string;
  owner_email: string;
}

export async function listAllProjectsForAdmin(): Promise<AdminProjectListItem[]> {
  const result = await getPool().query<AdminProjectRow>(
    `SELECT p.*,
            u.id AS user_id,
            u.name AS owner_name,
            u.email AS owner_email,
            COALESCE(i.cnt, 0)::text AS image_count,
            COALESCE(a.cnt, 0)::text AS anomaly_count
     FROM projects p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN (
       SELECT project_id, COUNT(*) AS cnt FROM images GROUP BY project_id
     ) i ON i.project_id = p.id
     LEFT JOIN (
       SELECT project_id, COUNT(*) AS cnt FROM anomalies GROUP BY project_id
     ) a ON a.project_id = p.id
     ORDER BY p.created_at DESC`,
  );
  return result.rows.map((row) => ({
    ...mapListItem(row),
    ownerId: row.user_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
  }));
}
