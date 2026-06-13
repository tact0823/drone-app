export type UserRole = 'operator' | 'admin';

export interface User {
  id: string;
  googleId: string | null;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
}
