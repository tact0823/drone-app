import { env } from '../config/env.js';
import { checkDbConnection, getPool } from './pool.js';
import { runMigrations } from './runMigrations.js';

async function main() {
  if (!env.databaseUrl) {
    console.error('DATABASE_URL is required for migrations');
    process.exit(1);
  }

  const connected = await checkDbConnection();
  if (!connected) {
    console.error('Failed to connect to PostgreSQL');
    process.exit(1);
  }

  await runMigrations();
  console.log('Migrations complete');
  await getPool().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
