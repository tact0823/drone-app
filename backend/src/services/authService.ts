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
    oauthClient = new OAuth2Client({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      redirectUri: env.googleCallbackUrl,
    });
  }
  return oauthClient;
}

export function getGoogleOAuthRedirectUri(): string {
  return env.googleCallbackUrl;
}

export function getGoogleAuthUrl(state: string): string {
  const redirectUri = getGoogleOAuthRedirectUri();
  const authUrl = getOAuthClient().generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
    redirect_uri: redirectUri,
  });
  const authRedirectUri = extractRedirectUriFromAuthUrl(authUrl);
  if (authRedirectUri !== redirectUri) {
    throw new Error('OAuth authorization redirect_uri mismatch');
  }
  logOAuthStep(`authorization redirect_uri=${redirectUri}`);
  return authUrl;
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
    ...(env.isProduction && sameSite === 'none' ? { partitioned: true } : {}),
  };
}

function getClearCookieOptions(): CookieOptions {
  const sameSite = env.isProduction ? 'none' : env.cookieSameSite;
  return {
    httpOnly: true,
    secure: env.isProduction || sameSite === 'none',
    sameSite,
    path: '/',
    ...(env.isProduction && sameSite === 'none' ? { partitioned: true } : {}),
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

function sanitizeOAuthLogMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, '[redacted]')
    .replace(/GOCSPX-\S+/gi, '[redacted]')
    .replace(/ya29\.[A-Za-z0-9._-]+/gi, '[redacted]')
    .replace(/access_token[=:]\S+/gi, 'access_token=[redacted]')
    .replace(/refresh_token[=:]\S+/gi, 'refresh_token=[redacted]');
}

interface GoogleOAuthApiError {
  response?: {
    data?: {
      error?: string;
      error_description?: string;
    };
  };
}

export function extractRedirectUriFromAuthUrl(authUrl: string): string | null {
  try {
    return new URL(authUrl).searchParams.get('redirect_uri');
  } catch {
    return null;
  }
}

export function getConfiguredGoogleCallbackUrl(): string {
  return env.googleCallbackUrl;
}

export function extractGoogleOAuthError(err: unknown): {
  message: string;
  googleError?: string;
  googleErrorDescription?: string;
} {
  const message = err instanceof Error ? err.message : 'unknown error';
  const apiError = err as GoogleOAuthApiError;
  return {
    message,
    googleError: apiError.response?.data?.error,
    googleErrorDescription: apiError.response?.data?.error_description,
  };
}

export type GoogleOAuthFailureReason =
  | 'invalid_client'
  | 'invalid_grant'
  | 'redirect_uri_mismatch'
  | 'token_exchange';

const PUBLIC_GOOGLE_ERRORS = new Set([
  'invalid_client',
  'invalid_grant',
  'redirect_uri_mismatch',
  'unknown',
]);

export function classifyGoogleOAuthFailure(
  googleError?: string,
  googleErrorDescription?: string,
): GoogleOAuthFailureReason {
  const error = (googleError ?? '').toLowerCase();
  const description = (googleErrorDescription ?? '').toLowerCase();

  if (error === 'invalid_client') return 'invalid_client';
  if (error === 'redirect_uri_mismatch') return 'redirect_uri_mismatch';
  if (description.includes('redirect_uri')) return 'redirect_uri_mismatch';
  if (error === 'invalid_grant') return 'invalid_grant';
  return 'token_exchange';
}

export function sanitizeGoogleErrorForClient(googleError?: string): string {
  const normalized = (googleError ?? 'unknown').toLowerCase();
  if (PUBLIC_GOOGLE_ERRORS.has(normalized)) {
    return normalized;
  }
  if (normalized === 'invalid_client' || normalized === 'invalid_grant') {
    return normalized;
  }
  return 'unknown';
}

async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const redirectUri = getGoogleOAuthRedirectUri();
  logOAuthStep(`token exchange redirect_uri=${redirectUri}`);
  return client.getToken({
    code,
    redirect_uri: redirectUri,
  });
}

export async function fetchGoogleProfile(client: OAuth2Client, idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
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

export async function exchangeGoogleCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await exchangeCodeForTokens(code);
  if (!tokens.id_token) {
    throw new Error('Missing id_token from Google');
  }

  return fetchGoogleProfile(client, tokens.id_token);
}

export async function exchangeGoogleCodeWithSteps(
  code: string,
  onStep: (step: string) => void,
) {
  const client = getOAuthClient();
  const { tokens } = await exchangeCodeForTokens(code);
  onStep('token exchange success');
  if (!tokens.id_token) {
    throw new Error('Missing id_token from Google');
  }
  const profile = await fetchGoogleProfile(client, tokens.id_token);
  onStep('profile fetched');
  return profile;
}

export interface OAuthLoginRedirectOptions {
  reason?: string;
  step?: string;
  googleError?: string;
}

export function redirectToLogin(
  res: Response,
  errorCode: string,
  options?: OAuthLoginRedirectOptions,
): void {
  const params = new URLSearchParams({ error: errorCode });
  if (options?.reason) {
    params.set('reason', options.reason);
  }
  if (options?.step) {
    params.set('step', options.step);
  }
  if (options?.googleError) {
    params.set('google_error', sanitizeGoogleErrorForClient(options.googleError));
  }
  res.redirect(`${env.frontendUrl}/login?${params.toString()}`);
}

export function logOAuthStep(step: string): void {
  console.log(`[auth] ${step}`);
}

export function logOAuthFailure(step: string, err: unknown): void {
  const { message, googleError, googleErrorDescription } = extractGoogleOAuthError(err);
  const safeMessage = sanitizeOAuthLogMessage(message);
  const parts = [`[auth] ${step} failed: ${safeMessage}`];
  if (googleError) {
    parts.push(`google_error=${googleError}`);
  }
  if (googleErrorDescription) {
    parts.push(`google_error_description=${sanitizeOAuthLogMessage(googleErrorDescription)}`);
  }
  console.error(parts.join(' '));
}

export { OAUTH_STATE_COOKIE, TOKEN_COOKIE };
