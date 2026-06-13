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
  'DATABASE_URL',
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

function resolveGoogleCallbackUrl(frontendUrl: string): string {
  const explicit = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (explicit) return explicit;
  return `${frontendUrl}/api/v1/auth/google/callback`;
}

const frontendUrl = resolveFrontendUrl();

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  frontendUrl,
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleCallbackUrl: resolveGoogleCallbackUrl(frontendUrl),
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
  return Boolean(env.googleClientId && env.googleClientSecret);
}
