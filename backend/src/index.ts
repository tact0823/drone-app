import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDbConnection } from './db/pool.js';
import { runMigrations } from './db/runMigrations.js';

async function start() {
  await mkdir(path.resolve(env.uploadsDir), { recursive: true });
  await mkdir(path.resolve(env.reportsDir), { recursive: true });

  if (env.databaseUrl) {
    const connected = await checkDbConnection();
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
