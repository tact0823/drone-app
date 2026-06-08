import { fetchApi } from './api';
import type {
  Anomaly,
  AnomalyType,
  AssessmentSummary,
  ImageRecord,
  ImageType,
  SeverityLevel,
} from './inspectionData';

function withCsrf(csrfToken?: string): HeadersInit | undefined {
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined;
}

export function listImages(projectId: string): Promise<{ images: ImageRecord[]; total: number }> {
  return fetchApi(`/api/v1/projects/${projectId}/images`);
}

export async function uploadImages(
  projectId: string,
  files: File[],
  imageType: ImageType,
  csrfToken?: string,
): Promise<{ images: ImageRecord[] }> {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append('files', file);
    formData.append(`imageType_${index}`, imageType);
  });

  const headers = new Headers(withCsrf(csrfToken));
  const response = await fetch(`/api/v1/projects/${projectId}/images`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Upload failed');
  }
  return data;
}

export function deleteImage(projectId: string, imageId: string, csrfToken?: string): Promise<void> {
  return fetchApi(`/api/v1/projects/${projectId}/images/${imageId}`, {
    method: 'DELETE',
    headers: withCsrf(csrfToken),
  });
}

export function listAnomalies(projectId: string): Promise<{ anomalies: Anomaly[]; total: number }> {
  return fetchApi(`/api/v1/projects/${projectId}/anomalies`);
}

export function createAnomaly(
  projectId: string,
  payload: {
    imageId: string;
    type: AnomalyType;
    markerX: number;
    markerY: number;
    markerW: number;
    markerH: number;
    severity: SeverityLevel;
    comment?: string;
    partName?: string;
    direction?: string;
    checkContent?: string;
    memo?: string;
    overallGrade?: string;
  },
  csrfToken?: string,
): Promise<{ anomaly: Anomaly }> {
  return fetchApi(`/api/v1/projects/${projectId}/anomalies`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: withCsrf(csrfToken),
  });
}

export function updateAnomaly(
  projectId: string,
  anomalyId: string,
  payload: Record<string, unknown>,
  csrfToken?: string,
): Promise<{ anomaly: Anomaly }> {
  return fetchApi(`/api/v1/projects/${projectId}/anomalies/${anomalyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: withCsrf(csrfToken),
  });
}

export function deleteAnomaly(
  projectId: string,
  anomalyId: string,
  csrfToken?: string,
): Promise<void> {
  return fetchApi(`/api/v1/projects/${projectId}/anomalies/${anomalyId}`, {
    method: 'DELETE',
    headers: withCsrf(csrfToken),
  });
}

export function analyzeAnomalyWithAi(
  projectId: string,
  payload: {
    partName?: string;
    direction?: string;
    checkContent?: string;
    memo?: string;
    marker?: { x: number; y: number; w: number; h: number };
    regenerate?: boolean;
  },
  csrfToken?: string,
): Promise<{
  anomalyType: AnomalyType;
  severity: SeverityLevel;
  comment: string;
  checkContent: string | null;
  source: 'llm' | 'template';
  generatedAt: string;
}> {
  return fetchApi(`/api/v1/projects/${projectId}/ai/analyze-anomaly`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: withCsrf(csrfToken),
  });
}

/** @deprecated analyzeAnomalyWithAi を使用 */
export function regenerateAiComment(
  projectId: string,
  payload: {
    anomalyType: AnomalyType;
    severity: SeverityLevel;
    memo?: string;
    regenerate?: boolean;
  },
  csrfToken?: string,
): Promise<{ comment: string; generatedAt: string }> {
  return fetchApi(`/api/v1/projects/${projectId}/ai/diagnostic-comment`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: withCsrf(csrfToken),
  });
}

export function regenerateSavedAnomalyComment(
  projectId: string,
  anomalyId: string,
  csrfToken?: string,
): Promise<{ anomaly: Anomaly; generatedAt: string }> {
  return fetchApi(`/api/v1/projects/${projectId}/anomalies/${anomalyId}/regenerate-ai-comment`, {
    method: 'POST',
    headers: withCsrf(csrfToken),
  });
}

export function getAssessment(projectId: string): Promise<AssessmentSummary> {
  return fetchApi(`/api/v1/projects/${projectId}/assessment`);
}

export function recalculateAssessment(
  projectId: string,
  csrfToken?: string,
): Promise<AssessmentSummary> {
  return fetchApi(`/api/v1/projects/${projectId}/assessment/recalculate`, {
    method: 'POST',
    headers: withCsrf(csrfToken),
  });
}
