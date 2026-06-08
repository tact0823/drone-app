/**
 * 本番確認 — DB接続 / マイグレーション / Seed / PDF / OAuth 設定
 * Usage: npm run prod:verify
 */
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { env, isGoogleOAuthConfigured } from '../src/config/env.js';
import { checkDbConnection, getDbConnectionError, getPool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/runMigrations.js';
import { listAnomaliesByProject } from '../src/services/anomalyService.js';
import { getProjectAssessment } from '../src/services/assessmentService.js';
import { listImagesByProject } from '../src/services/imageService.js';
import { findProjectById } from '../src/services/projectService.js';
import { findReportById, generateReport, listReportsByProject } from '../src/services/report/reportService.js';
import { seedDemoData } from './seedDemo.js';

interface StepResult {
  step: string;
  ok: boolean;
  detail: string;
}

const results: StepResult[] = [];

function record(step: string, ok: boolean, detail: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}: ${detail}`);
}

function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid URL format)';
  }
}

async function verifyGoogleOAuthConfig(): Promise<void> {
  const configured = isGoogleOAuthConfigured();
  const hasJwt = env.jwtSecret.length >= 16;

  record(
    '7. Google OAuth 設定',
    configured && hasJwt,
    `clientId=${configured ? 'set' : 'missing'}, secret=${configured ? 'set' : 'missing'}, jwt=${hasJwt ? 'ok' : 'too short'}, callback=${env.googleCallbackUrl}`,
  );

  if (!configured) {
    record(
      '7b. Google ログイン',
      false,
      'GOOGLE_CLIENT_ID/SECRET 未設定 — ブラウザログインはスキップ（設定後に /login から確認）',
    );
    return;
  }

  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : env.port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/google`, {
      redirect: 'manual',
    });
    const location = response.headers.get('location') ?? '';
    const ok =
      response.status === 302 &&
      (location.includes('accounts.google.com') || location.includes('google.com/o/oauth2'));
    record(
      '7b. Google ログイン',
      ok,
      ok ? `redirect OK (${response.status})` : `unexpected response ${response.status}`,
    );
  } catch (error) {
    record('7b. Google ログイン', false, String(error));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function main() {
  console.log('\n=== Production Verification ===\n');

  if (!env.databaseUrl.trim()) {
    record(
      '0. DATABASE_URL',
      false,
      '未設定 — リポジトリ直下 `.env` の DATABASE_URL に接続文字列を設定してください',
    );
    printSummary();
    process.exit(1);
  }

  record('0. DATABASE_URL', true, maskDatabaseUrl(env.databaseUrl));

  const connected = await checkDbConnection();
  if (connected) {
    record('1. PostgreSQL 接続', true, 'SELECT 1 OK');
  } else {
    const detail = (await getDbConnectionError()) ?? 'connection failed';
    record('1. PostgreSQL 接続', false, detail);
  }
  if (!connected) {
    printSummary();
    process.exit(1);
  }

  await mkdir(path.resolve(env.uploadsDir), { recursive: true });
  await mkdir(path.resolve(env.reportsDir), { recursive: true });

  try {
    await runMigrations();
    record('2. マイグレーション', true, 'applied successfully');
  } catch (error) {
    record('2. マイグレーション', false, String(error));
    printSummary();
    process.exit(1);
  }

  let seed;
  try {
    seed = await seedDemoData();
    record('3. Seed 投入', true, `project=${seed.projectId}, anomalies=${seed.anomalyIds.length}`);
  } catch (error) {
    record('3. Seed 投入', false, String(error));
    printSummary();
    process.exit(1);
  }

  const project = await findProjectById(seed.projectId);
  record('4. サンプル案件', !!project, project?.title ?? 'not found');

  const images = await listImagesByProject(seed.projectId);
  record('5. サンプル画像', images.length >= 3, `${images.length} images`);

  const anomalies = await listAnomaliesByProject(seed.projectId);
  record('6. サンプル異常', anomalies.length >= 2, `${anomalies.length} anomalies`);

  await verifyGoogleOAuthConfig();

  const assessment = await getProjectAssessment(seed.projectId);
  record(
    '8. 評価エンジン',
    !!assessment?.overallScore,
    `score=${assessment?.overallScore ?? '—'}`,
  );

  for (const reportType of ['SURVEY', 'CUSTOMER', 'SALES'] as const) {
    try {
      const { report, pageCount } = await generateReport(seed.projectId, seed.userId, { reportType });
      const row = await findReportById(seed.projectId, report.id);
      if (!row) throw new Error('Report row not found');
      const fileStat = await stat(path.resolve(row.storage_path));
      record(
        `9. PDF生成 (${reportType})`,
        fileStat.size > 1000 && pageCount > 0,
        `${report.filename} — ${pageCount}p, ${fileStat.size} bytes`,
      );
    } catch (error) {
      record(`9. PDF生成 (${reportType})`, false, String(error));
    }
  }

  const reports = await listReportsByProject(seed.projectId);
  record('10. PDF一覧', reports.length >= 3, `${reports.length} reports in DB`);

  printSummary();
  await getPool().end();

  if (results.some((item) => !item.ok)) {
    process.exit(1);
  }
}

function printSummary() {
  const passed = results.filter((item) => item.ok).length;
  console.log(`\n=== Summary: ${passed}/${results.length} passed ===\n`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
