import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import type { JwtPayload, PublicUser, User, UserRole } from '../types/user.js';

const TOKEN_COOKIE = 'token';
const OAUTH_STATE_COOKIE = 'oauth_state';

let oauthClient: OAuth2Client | null = null;

export function resetOAuthClientForTests(): void {
  oauthClient = null;
}

function getOAuthClient(): OAuth2Client {
  if (!oauthClient) {
    if (!env.googleClientId || !env.googleClientSecret || !env.googleCallbackUrl) {
      throw new Error('Google OAuth is not configured');
    }
    oauthClient = new OAuth2Client(
      env.googleClientId,
      env.googleClientSecret,
      env.googleCallbackUrl,
    );
  }
  return oauthClient;
}

export function getGoogleAuthUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
}

export function createOAuthState(): string {
  return randomBytes(32).toString('hex');
}

export function getOAuthStateCookieOptions(): CookieOptions {
  return getAuthCookieOptions(10 * 60 * 1000);
}

export function getTokenCookieOptions(): CookieOptions {
  return getAuthCookieOptions(24 * 60 * 60 * 1000);
}

function getAuthCookieOptions(maxAge: number): CookieOptions {
  const sameSite = env.isProduction ? 'none' : env.cookieSameSite;
  return {
    httpOnly: true,
    secure: env.isProduction || sameSite === 'none',
    sameSite,
    maxAge,
    path: '/',
  };
}

function getClearCookieOptions(): CookieOptions {
  const sameSite = env.isProduction ? 'none' : env.cookieSameSite;
  return {
    httpOnly: true,
    secure: env.isProduction || sameSite === 'none',
    sameSite,
    path: '/',
  };
}

export function setOAuthStateCookie(res: Response, state: string): void {
  res.cookie(OAUTH_STATE_COOKIE, state, getOAuthStateCookieOptions());
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, getClearCookieOptions());
}

export function setTokenCookie(res: Response, token: string): void {
  res.cookie(TOKEN_COOKIE, token, getTokenCookieOptions());
}

export function clearTokenCookie(res: Response): void {
  res.clearCookie(TOKEN_COOKIE, getClearCookieOptions());
}

export function signToken(user: Pick<User, 'id' | 'role'>): string {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const payload: JwtPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

export function createCsrfToken(userId: string): string {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const nonce = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', env.jwtSecret)
    .update(`${userId}:${nonce}`)
    .digest('hex');
  return `${nonce}.${signature}`;
}

export function verifyCsrfToken(userId: string, token: string): boolean {
  if (!env.jwtSecret) return false;
  const [nonce, signature] = token.split('.');
  if (!nonce || !signature || signature.length !== 64) return false;

  const expected = createHmac('sha256', env.jwtSecret)
    .update(`${userId}:${nonce}`)
    .digest('hex');

  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function exchangeGoogleCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error('Missing id_token from Google');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Invalid Google profile');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0],
    avatarUrl: payload.picture ?? null,
  };
}

export function redirectToLogin(res: Response, errorCode: string, reason?: string): void {
  const params = new URLSearchParams({ error: errorCode });
  if (reason) {
    params.set('reason', reason);
  }
  res.redirect(`${env.frontendUrl}/login?${params.toString()}`);
}

export function logOAuthStep(step: string): void {
  console.log(`[oauth] ${step}`);
}

export function logOAuthFailure(step: string, err: unknown): void {
  const message = err instanceof Error ? err.message : 'unknown error';
  console.error(`[oauth] ${step} failed: ${message}`);
}

export { OAUTH_STATE_COOKIE, TOKEN_COOKIE };
