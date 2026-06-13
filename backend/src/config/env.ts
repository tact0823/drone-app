import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(configDir, '../..');
const repoRoot = path.resolve(backendRoot, '..');
const nodeEnv = process.env.NODE_ENV ?? 'development';

// 空文字の環境変数は dotenv 読込前に除去（シェル側の空上書きを防ぐ）
for (const key of [
  'LLM_API_KEY',
  'LLM_MODEL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'DATABASE_URL',
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
] as const) {
  if (process.env[key] === '') {
    delete process.env[key];
  }
}

const envFiles = [
  path.join(repoRoot, '.env'),
  path.join(repoRoot, `.env.${nodeEnv}`),
  path.join(backendRoot, '.env'),
  path.join(backendRoot, `.env.${nodeEnv}`),
];

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

if (nodeEnv === 'test') {
  const testEnvFile = path.join(backendRoot, '.env.test');
  if (existsSync(testEnvFile)) {
    dotenv.config({ path: testEnvFile, override: true });
  }
}

type SameSiteValue = 'lax' | 'strict' | 'none';

function parseSameSite(value: string | undefined): SameSiteValue {
  const defaultValue = nodeEnv === 'production' ? 'none' : 'lax';
  const normalized = (value ?? defaultValue).toLowerCase();
  if (normalized === 'none') return 'none';
  if (normalized === 'strict') return 'strict';
  return 'lax';
}

function resolveFrontendUrl(): string {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

function trimEnv(value: string | undefined): string {
  return (value ?? '').trim();
}

/** Railway backend callback only (production). Localhost allowed in development/test. */
const RAILWAY_GOOGLE_CALLBACK_PATTERN =
  /^https:\/\/[a-z0-9-]+\.up\.railway\.app\/api\/v1\/auth\/google\/callback$/;
const LOCAL_GOOGLE_CALLBACK_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/v1\/auth\/google\/callback$/;

function resolveGoogleCallbackUrl(): string {
  return trimEnv(process.env.GOOGLE_CALLBACK_URL);
}

export function validateGoogleCallbackUrl(callbackUrl: string): void {
  if (RAILWAY_GOOGLE_CALLBACK_PATTERN.test(callbackUrl)) {
    return;
  }
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    if (LOCAL_GOOGLE_CALLBACK_PATTERN.test(callbackUrl)) {
      return;
    }
  }
  throw new Error(
    'GOOGLE_CALLBACK_URL must be https://<service>.up.railway.app/api/v1/auth/google/callback',
  );
}

export function assertAuthEnv(): void {
  if (!env.jwtSecret || env.jwtSecret.length < 16) {
    console.error('JWT_SECRET is required (minimum 16 characters, 32+ recommended)');
    process.exit(1);
  }

  if (!env.databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  if (!env.adminEmail || !env.adminPassword) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
    process.exit(1);
  }

  if (env.adminPassword.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }
}

/** Optional — only when Google OAuth routes are used */
export function assertGoogleOAuthEnv(): void {
  if (!env.googleCallbackUrl) {
    console.error('GOOGLE_CALLBACK_URL is required for Google OAuth');
    process.exit(1);
  }

  try {
    validateGoogleCallbackUrl(env.googleCallbackUrl);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(`GOOGLE_CALLBACK_URL: ${env.googleCallbackUrl}`);
    process.exit(1);
  }

  if (!env.googleClientId || !env.googleClientSecret) {
    console.error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Google OAuth');
    process.exit(1);
  }
}

const frontendUrl = resolveFrontendUrl();
const googleCallbackUrl = resolveGoogleCallbackUrl();

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  frontendUrl,
  databaseUrl: trimEnv(process.env.DATABASE_URL),
  jwtSecret: trimEnv(process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  adminEmail: trimEnv(process.env.ADMIN_EMAIL).toLowerCase(),
  adminPassword: trimEnv(process.env.ADMIN_PASSWORD),
  googleClientId: trimEnv(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: trimEnv(process.env.GOOGLE_CLIENT_SECRET),
  googleCallbackUrl,
  cookieSameSite: parseSameSite(process.env.COOKIE_SAME_SITE),
  isProduction: nodeEnv === 'production',
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  maxUploadBytes: 20 * 1024 * 1024,
  llmApiKey: process.env.LLM_API_KEY ?? '',
  llmApiUrl: process.env.LLM_API_URL ?? 'https://api.openai.com/v1',
  llmModel: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  reportsDir: process.env.REPORTS_DIR ?? 'storage/reports',
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? '',
  companyName: process.env.COMPANY_NAME ?? 'ThermoInspect 株式会社',
  companyAddress: process.env.COMPANY_ADDRESS ?? '東京都千代田区',
  companyPhone: process.env.COMPANY_PHONE ?? '03-0000-0000',
  companyWebsite: process.env.COMPANY_WEBSITE ?? 'https://example.com',
} as const;

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleCallbackUrl);
}

export function isEmailLoginConfigured(): boolean {
  return Boolean(env.adminEmail && env.adminPassword);
}
