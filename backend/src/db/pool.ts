import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

function resolvePoolConfig(connectionString: string): pg.PoolConfig {
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode');
    const needsSsl = sslMode !== null && sslMode !== 'disable';
    if (needsSsl) {
      parsed.searchParams.delete('sslmode');
    }
    return {
      connectionString: parsed.toString(),
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
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
