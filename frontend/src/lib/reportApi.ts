import { fetchApi } from './api';
import { downloadFromResponse } from './downloadFile';
import type { ReportRecord, ReportType } from './reportData';

function withCsrf(csrfToken?: string): HeadersInit | undefined {
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined;
}

export function listReports(projectId: string): Promise<{ reports: ReportRecord[]; total: number }> {
  return fetchApi(`/api/v1/projects/${projectId}/reports`);
}

export function generateReport(
  projectId: string,
  reportType: ReportType,
  csrfToken?: string,
): Promise<{ report: ReportRecord & { pageCount: number } }> {
  return fetchApi(`/api/v1/projects/${projectId}/reports`, {
    method: 'POST',
    body: JSON.stringify({ reportType }),
    headers: withCsrf(csrfToken),
  });
}

export async function downloadReportFile(
  projectId: string,
  reportId: string,
  filename: string,
): Promise<void> {
  const response = await fetch(`/api/v1/projects/${projectId}/reports/${reportId}/file`, {
    credentials: 'include',
  });
  await downloadFromResponse(response, filename);
}
