import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import type { User } from '../types/user.js';
import { hashPassword, verifyPassword } from './passwordService.js';

interface UserAuthRow {
  id: string;
  google_id: string | null;
  email: string;
  name: string;
  avatar_url: string | null;
  role: User['role'];
  password_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapUser(row: UserAuthRow): User {
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function authenticateWithEmailPassword(
  email: string,
  password: string,
): Promise<User | null> {
  if (!env.databaseUrl) {
    return null;
  }

  try {
    const result = await getPool().query<UserAuthRow>(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [email.trim().toLowerCase()],
    );
    const row = result.rows[0];
    if (!row?.password_hash) {
      return null;
    }

    const valid = await verifyPassword(password, row.password_hash);
    if (!valid) {
      return null;
    }

    return mapUser(row);
  } catch (error) {
    console.error('Email login authentication failed:', error);
    return null;
  }
}

export async function ensureAdminUser(): Promise<void> {
  if (!env.adminEmail || !env.adminPassword) {
    console.warn('ADMIN_EMAIL/ADMIN_PASSWORD not set — admin user seed skipped');
    return;
  }

  const email = env.adminEmail.trim().toLowerCase();
  const passwordHash = await hashPassword(env.adminPassword);
  const name = email.split('@')[0] || 'Admin';
  const googleId = `local:${email}`;

  await getPool().query(
    `INSERT INTO users (google_id, email, name, role, password_hash)
     VALUES ($1, $2, $3, 'admin', $4)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       name = EXCLUDED.name,
       updated_at = NOW()`,
    [googleId, email, name, passwordHash],
  );

  console.log(`Admin user ensured for ${email}`);
}
