import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');

if (!backendUrl) {
  console.error(
    'BACKEND_URL is required for Vercel build.\n' +
      'Set it in Vercel Dashboard → Settings → Environment Variables',
  );
  process.exit(1);
}

const templatePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../vercel.template.json');
const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../vercel.json');

const template = readFileSync(templatePath, 'utf8');
const config = template.replaceAll('__BACKEND_URL__', backendUrl);

writeFileSync(outputPath, config);
console.log(`Generated vercel.json with BACKEND_URL=${backendUrl}`);
