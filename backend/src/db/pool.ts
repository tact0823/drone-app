import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function isSupabaseHost(hostname: string): boolean {
  return (
    hostname.endsWith('.supabase.co') ||
    hostname.endsWith('.supabase.com') ||
    hostname.includes('.pooler.supabase.com')
  );
}

function isRailwayInternalHost(hostname: string): boolean {
  return hostname.endsWith('.railway.internal');
}

function isRailwayPublicHost(hostname: string): boolean {
  return hostname.endsWith('.rlwy.net') || hostname.endsWith('.railway.app');
}

function resolveSsl(hostname: string, sslMode: string | null): pg.ConnectionConfig['ssl'] {
  if (sslMode === 'disable') return undefined;
  if (isRailwayInternalHost(hostname)) return undefined;
  if (
    isSupabaseHost(hostname) ||
    isRailwayPublicHost(hostname) ||
    (sslMode !== null && sslMode !== 'disable')
  ) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function resolvePoolConfig(connectionString: string): pg.PoolConfig {
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode');

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 5432,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '') || 'postgres',
      ssl: resolveSsl(parsed.hostname, sslMode),
    };
  } catch {
    return { connectionString };
  }
}

export function getPool(): pg.Pool {
  if (!pool) {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new Pool(resolvePoolConfig(env.databaseUrl));
  }
  return pool;
}

export async function checkDbConnection(): Promise<boolean> {
  if (!env.databaseUrl) return false;
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

export async function getDbConnectionError(): Promise<string | null> {
  if (!env.databaseUrl) return 'DATABASE_URL is not configured';
  try {
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    return null;
  } catch (error) {
    if (error instanceof Error) {
      const pgError = error as Error & { code?: string };
      return pgError.code ? `${pgError.code}: ${pgError.message}` : pgError.message;
    }
    return String(error);
  }
}
