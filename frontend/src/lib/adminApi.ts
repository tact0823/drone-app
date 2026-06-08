import { fetchApi } from './api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'operator' | 'admin';
  createdAt: string;
}

export interface AdminProject {
  id: string;
  title: string;
  inspectionType: string;
  siteName: string;
  inspectionDate: string;
  status: string;
  imageCount: number;
  anomalyCount: number;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

function withCsrf(csrfToken?: string): HeadersInit | undefined {
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined;
}

export function listAdminUsers(csrfToken?: string): Promise<{ users: AdminUser[]; total: number }> {
  return fetchApi('/api/v1/admin/users', { headers: withCsrf(csrfToken) });
}

export function listAdminProjects(
  csrfToken?: string,
): Promise<{ projects: AdminProject[]; total: number }> {
  return fetchApi('/api/v1/admin/projects', { headers: withCsrf(csrfToken) });
}

export function listAuditLogs(
  csrfToken?: string,
): Promise<{ logs: AuditLogRecord[]; total: number }> {
  return fetchApi('/api/v1/admin/audit-logs', { headers: withCsrf(csrfToken) });
}
