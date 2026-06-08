import { fetchApi } from './api';
import type {
  CreateProjectPayload,
  InspectionTypeOption,
  Project,
  ProjectListItem,
  UpdateProjectPayload,
} from './projects';

function withCsrf(csrfToken?: string): HeadersInit | undefined {
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined;
}

export function listProjects(): Promise<{ projects: ProjectListItem[]; total: number }> {
  return fetchApi('/api/v1/projects');
}

export function getInspectionTypes(): Promise<{ inspectionTypes: InspectionTypeOption[] }> {
  return fetchApi('/api/v1/projects/inspection-types');
}

export function getProject(id: string): Promise<{ project: Project }> {
  return fetchApi(`/api/v1/projects/${id}`);
}

export function createProject(
  payload: CreateProjectPayload,
  csrfToken?: string,
): Promise<{ project: Project }> {
  return fetchApi('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: withCsrf(csrfToken),
  });
}

export function updateProject(
  id: string,
  payload: UpdateProjectPayload,
  csrfToken?: string,
): Promise<{ project: Project }> {
  return fetchApi(`/api/v1/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: withCsrf(csrfToken),
  });
}

export function deleteProject(id: string, csrfToken?: string): Promise<void> {
  return fetchApi(`/api/v1/projects/${id}`, {
    method: 'DELETE',
    headers: withCsrf(csrfToken),
  });
}
