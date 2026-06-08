/**
 * デモ用テストデータ投入
 * Usage: npm run seed
 * Optional: SEED_USER_EMAIL=user@gmail.com
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { env } from '../src/config/env.js';
import { getPool } from '../src/db/pool.js';
import { runMigrations } from '../src/db/runMigrations.js';
import { createAnomaly } from '../src/services/anomalyService.js';
import { saveUploadedImage } from '../src/services/imageService.js';
import { createProject, listProjectsByUser } from '../src/services/projectService.js';
import {
  findFirstUser,
  findUserByEmail,
  upsertUserFromGoogle,
} from '../src/services/userService.js';

const DEMO_PROJECT_TITLE = '【サンプル】嶋口様邸 太陽光パネル点検';

export interface SeedResult {
  userId: string;
  projectId: string;
  imageIds: { overview: string; visible: string; infrared: string };
  anomalyIds: string[];
}

async function resolveSeedUser() {
  if (process.env.SEED_USER_EMAIL) {
    const user = await findUserByEmail(process.env.SEED_USER_EMAIL);
    if (user) return user;
    console.warn(`SEED_USER_EMAIL=${process.env.SEED_USER_EMAIL} not found — using fallback`);
  }

  const existing = await findFirstUser();
  if (existing) return existing;

  return upsertUserFromGoogle({
    googleId: 'local-seed-demo-user',
    email: 'demo@thermo-inspect.local',
    name: 'デモユーザー',
    avatarUrl: null,
  });
}

async function createPlaceholderImage(label: string, rgb: { r: number; g: number; b: number }) {
  const svg = `
    <svg width="960" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgb(${rgb.r},${rgb.g},${rgb.b})"/>
      <text x="50%" y="50%" font-size="42" fill="white" text-anchor="middle" dominant-baseline="middle"
        font-family="sans-serif">${label}</text>
    </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

export async function seedDemoData(): Promise<SeedResult> {
  const user = await resolveSeedUser();

  const existing = (await listProjectsByUser(user.id)).find((p) => p.title === DEMO_PROJECT_TITLE);
  if (existing) {
    console.log(`Demo project already exists: ${existing.id}`);
    const images = await getPool().query<{ id: string; image_type: string }>(
      'SELECT id, image_type FROM images WHERE project_id = $1 ORDER BY sort_order',
      [existing.id],
    );
    const byType = Object.fromEntries(images.rows.map((row) => [row.image_type, row.id]));
    const anomalies = await getPool().query<{ id: string }>(
      'SELECT id FROM anomalies WHERE project_id = $1',
      [existing.id],
    );
    return {
      userId: user.id,
      projectId: existing.id,
      imageIds: {
        overview: byType.OVERVIEW ?? '',
        visible: byType.VISIBLE ?? '',
        infrared: byType.INFRARED ?? '',
      },
      anomalyIds: anomalies.rows.map((row) => row.id),
    };
  }

  const project = await createProject(user.id, {
    title: DEMO_PROJECT_TITLE,
    inspectionType: 'SOLAR_PANEL',
    siteName: '嶋口様邸',
    clientName: '嶋口',
    inspectionDate: new Date().toISOString().slice(0, 10),
    location: '東京都',
    equipment: 'DJI Mavic 3 Thermal',
    weather: '晴れ',
    structure: '木造',
    floors: '2F',
    buildingAge: '築15年',
    roofMaterial: 'スレート',
    notes: 'MVP デモ用サンプル案件',
  });

  const pairId = randomUUID();

  const overview = await saveUploadedImage(
    project.id,
    'overview.jpg',
    await createPlaceholderImage('OVERVIEW MAP', { r: 60, g: 60, b: 60 }),
    { imageType: 'OVERVIEW' },
  );

  const visible = await saveUploadedImage(
    project.id,
    'visible-01.jpg',
    await createPlaceholderImage('VISIBLE', { r: 100, g: 140, b: 200 }),
    { imageType: 'VISIBLE', pairId, direction: 'N' },
  );

  const infrared = await saveUploadedImage(
    project.id,
    'infrared-01.jpg',
    await createPlaceholderImage('INFRARED HOTSPOT', { r: 200, g: 80, b: 40 }),
    { imageType: 'INFRARED', pairId, direction: 'N' },
  );

  const anomaly1 = await createAnomaly(project.id, 'SOLAR_PANEL', {
    imageId: infrared.id,
    type: 'HOT_SPOT',
    markerX: 0.55,
    markerY: 0.35,
    markerW: 0.18,
    markerH: 0.15,
    severity: 'high',
    partName: '第3ストリング北側',
    direction: 'N',
    memo: 'パネル右上付近に温度上昇',
  });

  const anomaly2 = await createAnomaly(project.id, 'SOLAR_PANEL', {
    imageId: infrared.id,
    type: 'DELAMINATION',
    markerX: 0.25,
    markerY: 0.6,
    markerW: 0.2,
    markerH: 0.12,
    severity: 'medium',
    partName: '第2ストリング',
    direction: 'N',
  });

  return {
    userId: user.id,
    projectId: project.id,
    imageIds: {
      overview: overview.id,
      visible: visible.id,
      infrared: infrared.id,
    },
    anomalyIds: [anomaly1.id, anomaly2.id],
  };
}

async function main() {
  if (!env.databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  await mkdir(path.resolve(env.uploadsDir), { recursive: true });
  await mkdir(path.resolve(env.reportsDir), { recursive: true });
  await runMigrations();

  const result = await seedDemoData();

  console.log('\n=== Demo seed complete ===');
  console.log(`User ID:    ${result.userId}`);
  console.log(`Project ID: ${result.projectId}`);
  console.log(`Images:     overview=${result.imageIds.overview}`);
  console.log(`            visible=${result.imageIds.visible}`);
  console.log(`            infrared=${result.imageIds.infrared}`);
  console.log(`Anomalies:  ${result.anomalyIds.length} records`);
  console.log(`\nOpen: http://localhost:5173/projects/${result.projectId}`);

  await getPool().end();
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
