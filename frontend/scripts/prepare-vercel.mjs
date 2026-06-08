/**
 * Optional: generate frontend/vercel.json from vercel.template.json with BACKEND_URL.
 * Not used on Vercel deploy — frontend/vercel.json is committed directly for SPA rewrites.
 *
 * Usage (local only):
 *   BACKEND_URL=https://your-backend.railway.app node scripts/prepare-vercel.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');

if (!backendUrl) {
  console.error(
    'BACKEND_URL is required.\n' +
      'Example: BACKEND_URL=https://your-backend.railway.app node scripts/prepare-vercel.mjs',
  );
  process.exit(1);
}

const templatePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../vercel.template.json');
const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../vercel.json');

const template = readFileSync(templatePath, 'utf8');
const config = template.replaceAll('__BACKEND_URL__', backendUrl);

writeFileSync(outputPath, config);
console.log(`Generated vercel.json with BACKEND_URL=${backendUrl}`);
