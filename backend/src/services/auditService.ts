import type { Request } from 'express';
import type { AuditLog } from '../types/audit.js';
import { getPool } from '../db/pool.js';

interface AuditRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
}

function mapAuditLog(row: AuditRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    details: row.details,
    ipAddress: row.ip_address,
    createdAt: row.created_at.toISOString(),
  };
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? null;
  return req.ip ?? null;
}

export async function recordAuditLog(
  req: Request,
  params: {
    userId?: string | null;
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    details?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await getPool().query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId ?? req.user?.id ?? null,
        params.action,
        params.resourceType ?? null,
        params.resourceId ?? null,
        params.details ? JSON.stringify(params.details) : null,
        clientIp(req),
        req.headers['user-agent'] ?? null,
      ],
    );
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}

export async function listAuditLogs(limit = 100, offset = 0): Promise<{ logs: AuditLog[]; total: number }> {
  const countResult = await getPool().query<{ count: string }>('SELECT COUNT(*) AS count FROM audit_logs');
  const result = await getPool().query<AuditRow>(
    `SELECT a.id, a.user_id, u.name AS user_name, u.email AS user_email,
            a.action, a.resource_type, a.resource_id, a.details, a.ip_address, a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return {
    logs: result.rows.map(mapAuditLog),
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}
