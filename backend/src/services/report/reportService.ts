import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { getPool } from '../../db/pool.js';
import { ValidationError } from '../../types/project.js';
import {
  REPORT_FILENAME_SUFFIX,
  type ReportRecord,
  type ReportType,
} from '../../types/report.js';
import { buildReportHtml, estimatePageCount } from './htmlBuilder.js';
import { generatePdfFromHtml } from './pdfGenerator.js';
import { loadReportData } from './reportDataLoader.js';

interface ReportRow {
  id: string;
  project_id: string;
  user_id: string;
  report_type: ReportType;
  filename: string;
  storage_path: string;
  file_size: number | null;
  generated_at: Date;
}

function mapReport(row: ReportRow, projectId: string): ReportRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    reportType: row.report_type,
    filename: row.filename,
    fileSize: row.file_size,
    generatedAt: row.generated_at.toISOString(),
    downloadUrl: `/api/v1/projects/${projectId}/reports/${row.id}/file`,
  };
}

function validateReportType(value: unknown): ReportType {
  if (value === 'SURVEY' || value === 'CUSTOMER' || value === 'SALES') return value;
  throw new ValidationError([{ field: 'reportType', message: '報告書種別を選択してください' }]);
}

function buildFilename(clientName: string, inspectionDate: string, reportType: ReportType): string {
  const datePart = inspectionDate.replace(/-/g, '');
  const safeName = clientName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
  return `${safeName}_${datePart}_${REPORT_FILENAME_SUFFIX[reportType]}.pdf`;
}

function getReportDir(projectId: string): string {
  return path.join(env.reportsDir, projectId);
}

export async function listReportsByProject(projectId: string): Promise<ReportRecord[]> {
  const result = await getPool().query<ReportRow>(
    'SELECT * FROM reports WHERE project_id = $1 ORDER BY generated_at DESC',
    [projectId],
  );
  return result.rows.map((row) => mapReport(row, projectId));
}

export async function findReportById(
  projectId: string,
  reportId: string,
): Promise<ReportRow | null> {
  const result = await getPool().query<ReportRow>(
    'SELECT * FROM reports WHERE id = $1 AND project_id = $2',
    [reportId, projectId],
  );
  return result.rows[0] ?? null;
}

export async function generateReport(
  projectId: string,
  userId: string,
  body: { reportType?: unknown },
): Promise<{ report: ReportRecord; pageCount: number }> {
  const reportType = validateReportType(body.reportType);
  const data = await loadReportData(projectId, userId);
  const html = await buildReportHtml(data, reportType);
  const pdfBuffer = await generatePdfFromHtml(html);

  const id = randomUUID();
  const clientName = data.project.clientName ?? data.project.siteName;
  const filename = buildFilename(clientName, data.project.inspectionDate, reportType);
  const dir = getReportDir(projectId);
  await mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, `${id}.pdf`);
  await writeFile(storagePath, pdfBuffer);

  const pageCount = estimatePageCount(data, reportType);

  const result = await getPool().query<ReportRow>(
    `INSERT INTO reports (id, project_id, user_id, report_type, filename, storage_path, file_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, projectId, userId, reportType, filename, storagePath, pdfBuffer.length],
  );

  return {
    report: mapReport(result.rows[0], projectId),
    pageCount,
  };
}

export { ReportRow };
