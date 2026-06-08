/**
 * PDF 生成フロー検証（案件 → 画像 → 異常 → PDF）
 * Usage: npm run verify:pdf
 */
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../src/config/env.js';
import { getPool } from '../src/db/pool.js';
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

async function main() {
  if (!env.databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  await mkdir(path.resolve(env.uploadsDir), { recursive: true });
  await mkdir(path.resolve(env.reportsDir), { recursive: true });
  await runMigrations();

  console.log('\n=== PDF Flow Verification ===\n');

  // 1. Seed demo data
  let seed;
  try {
    seed = await seedDemoData();
    record('1. テストデータ', true, `project=${seed.projectId}`);
  } catch (error) {
    record('1. テストデータ', false, String(error));
    printSummary();
    process.exit(1);
  }

  // 2. Project exists
  const project = await findProjectById(seed.projectId);
  record('2. 案件作成', !!project, project?.title ?? 'not found');

  // 3. Images
  const images = await listImagesByProject(seed.projectId);
  const hasOverview = images.some((i) => i.imageType === 'OVERVIEW');
  const hasPair = images.some((i) => i.imageType === 'VISIBLE') && images.some((i) => i.imageType === 'INFRARED');
  record('3. 画像登録', images.length >= 3 && hasOverview && hasPair, `${images.length} images`);

  // 4. Anomalies
  const anomalies = await listAnomaliesByProject(seed.projectId);
  record('4. 異常登録', anomalies.length >= 2, `${anomalies.length} anomalies`);

  // 5. Assessment
  const assessment = await getProjectAssessment(seed.projectId);
  record(
    '5. 評価エンジン',
    !!assessment?.overallScore,
    `score=${assessment?.overallScore ?? '—'}`,
  );

  // 6. PDF generation (3 types)
  const reportTypes = ['SURVEY', 'CUSTOMER', 'SALES'] as const;
  for (const reportType of reportTypes) {
    try {
      const { report, pageCount } = await generateReport(seed.projectId, seed.userId, { reportType });
      const row = await findReportById(seed.projectId, report.id);
      if (!row) throw new Error('Report row not found');
      const fileStat = await stat(path.resolve(row.storage_path));
      record(
        `6. PDF生成 (${reportType})`,
        fileStat.size > 0 && pageCount > 0,
        `${report.filename} (${pageCount} pages, ${fileStat.size} bytes)`,
      );
    } catch (error) {
      record(`6. PDF生成 (${reportType})`, false, String(error));
    }
  }

  const reports = await listReportsByProject(seed.projectId);
  record('7. 報告書一覧', reports.length >= 3, `${reports.length} reports stored`);

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
