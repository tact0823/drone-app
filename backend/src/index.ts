import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createApp } from './app.js';
import { env, assertGoogleOAuthEnv } from './config/env.js';
import { checkDbConnection, getDbConnectionError } from './db/pool.js';
import { runMigrations } from './db/runMigrations.js';

function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid DATABASE_URL format)';
  }
}

function isRetryableDbError(message: string): boolean {
  return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|57P03|53300/i.test(message);
}

async function waitForDbConnection(maxAttempts = 5, delayMs = 3000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await checkDbConnection()) return true;

    const detail = (await getDbConnectionError()) ?? 'connection failed';
    if (!isRetryableDbError(detail)) {
      console.error(`PostgreSQL connection failed: ${detail}`);
      console.error(`DATABASE_URL: ${maskDatabaseUrl(env.databaseUrl)}`);
      return false;
    }

    if (attempt < maxAttempts) {
      console.warn(`PostgreSQL not ready (${attempt}/${maxAttempts}): ${detail}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const detail = (await getDbConnectionError()) ?? 'connection failed';
  console.error(`PostgreSQL connection failed after ${maxAttempts} attempts: ${detail}`);
  console.error(`DATABASE_URL: ${maskDatabaseUrl(env.databaseUrl)}`);
  return false;
}

async function start() {
  assertGoogleOAuthEnv();

  await mkdir(path.resolve(env.uploadsDir), { recursive: true });
  await mkdir(path.resolve(env.reportsDir), { recursive: true });

  if (env.databaseUrl) {
    const connected = await waitForDbConnection();
    if (!connected) {
      console.error('Failed to connect to PostgreSQL. Check DATABASE_URL.');
      process.exit(1);
    }
    await runMigrations();
    console.log('Database migrations applied');
  } else {
    console.warn('DATABASE_URL not set — auth and DB features disabled');
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
    console.log(`Environment: ${env.nodeEnv}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
