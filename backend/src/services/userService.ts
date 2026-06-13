import type { User, UserRole } from '../types/user.js';
import { getPool } from '../db/pool.js';

interface UserRow {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

function mapUser(row: UserRow): User {
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

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const result = await getPool().query<UserRow>(
    'SELECT * FROM users WHERE google_id = $1',
    [googleId],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await getPool().query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await getPool().query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findFirstUser(): Promise<User | null> {
  const result = await getPool().query<UserRow>(
    'SELECT * FROM users ORDER BY created_at ASC LIMIT 1',
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function upsertUserFromGoogle(profile: GoogleProfile): Promise<User> {
  const existingByGoogleId = await findUserByGoogleId(profile.googleId);
  if (existingByGoogleId) {
    const result = await getPool().query<UserRow>(
      `UPDATE users
       SET email = $2, name = $3, avatar_url = $4, updated_at = NOW()
       WHERE google_id = $1
       RETURNING *`,
      [profile.googleId, profile.email, profile.name, profile.avatarUrl],
    );
    return mapUser(result.rows[0]);
  }

  const existingByEmail = await findUserByEmail(profile.email);
  if (existingByEmail) {
    const result = await getPool().query<UserRow>(
      `UPDATE users
       SET google_id = $1, name = $2, avatar_url = $3, updated_at = NOW()
       WHERE email = $4
       RETURNING *`,
      [profile.googleId, profile.name, profile.avatarUrl, profile.email],
    );
    return mapUser(result.rows[0]);
  }

  const result = await getPool().query<UserRow>(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [profile.googleId, profile.email, profile.name, profile.avatarUrl],
  );
  return mapUser(result.rows[0]);
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export async function listAllUsers(): Promise<AdminUserListItem[]> {
  const result = await getPool().query<UserRow>(
    'SELECT * FROM users ORDER BY created_at DESC',
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  }));
}
