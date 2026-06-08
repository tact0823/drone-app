import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import convert from 'heic-convert';
import { fileTypeFromBuffer } from 'file-type';
import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import type { ImageRecord, ImageType, UploadImageInput } from '../types/image.js';
import { ValidationError, type ValidationDetail } from '../types/project.js';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);
const HEIC_MIMES = new Set(['image/heic', 'image/heif']);

interface ImageRow {
  id: string;
  project_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  image_type: ImageType;
  pair_id: string | null;
  direction: string | null;
  created_at: Date;
}

function mapImage(row: ImageRow): ImageRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    filename: row.filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    imageType: row.image_type,
    pairId: row.pair_id,
    direction: row.direction,
    createdAt: row.created_at.toISOString(),
  };
}

export function getUploadDir(projectId: string): string {
  return path.join(env.uploadsDir, projectId);
}

export async function ensureProjectUploadDir(projectId: string): Promise<void> {
  await mkdir(getUploadDir(projectId), { recursive: true });
}

async function convertToJpegBuffer(buffer: Buffer, mime: string): Promise<Buffer> {
  if (HEIC_MIMES.has(mime)) {
    const converted = await convert({
      buffer: buffer as unknown as ArrayBufferLike,
      format: 'JPEG',
      quality: 0.9,
    });
    return Buffer.from(converted);
  }
  return sharp(buffer).jpeg({ quality: 90 }).toBuffer();
}

export async function listImagesByProject(projectId: string): Promise<ImageRecord[]> {
  const result = await getPool().query<ImageRow>(
    'SELECT * FROM images WHERE project_id = $1 ORDER BY sort_order ASC, created_at ASC',
    [projectId],
  );
  return result.rows.map(mapImage);
}

export async function findImageById(projectId: string, imageId: string): Promise<ImageRow | null> {
  const result = await getPool().query<ImageRow>(
    'SELECT * FROM images WHERE id = $1 AND project_id = $2',
    [imageId, projectId],
  );
  return result.rows[0] ?? null;
}

export async function saveUploadedImage(
  projectId: string,
  originalName: string,
  buffer: Buffer,
  meta: UploadImageInput,
): Promise<ImageRecord> {
  const detected = await fileTypeFromBuffer(buffer);
  const mime = detected?.mime ?? 'application/octet-stream';

  if (!ALLOWED_MIMES.has(mime)) {
    throw new ValidationError([
      {
        field: 'file',
        message: 'JPEG、PNG、HEIC 形式のみアップロードできます',
      },
    ]);
  }

  if (buffer.length > env.maxUploadBytes) {
    throw new ValidationError([
      { field: 'file', message: 'ファイルサイズは 20MB 以下にしてください' },
    ]);
  }

  const jpegBuffer = await convertToJpegBuffer(buffer, mime);
  const metadata = await sharp(jpegBuffer).metadata();
  const id = randomUUID();
  const storageFilename = `${id}.jpg`;
  const storagePath = path.join(getUploadDir(projectId), storageFilename);

  await ensureProjectUploadDir(projectId);
  await writeFile(storagePath, jpegBuffer);

  const sortResult = await getPool().query<{ max: number | null }>(
    'SELECT MAX(sort_order) AS max FROM images WHERE project_id = $1',
    [projectId],
  );
  const sortOrder = (sortResult.rows[0]?.max ?? -1) + 1;

  const result = await getPool().query<ImageRow>(
    `INSERT INTO images (
       id, project_id, filename, storage_path, mime_type, file_size,
       width, height, sort_order, image_type, pair_id, direction
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      id,
      projectId,
      originalName.replace(/\.(heic|heif)$/i, '.jpg'),
      storagePath,
      'image/jpeg',
      jpegBuffer.length,
      metadata.width ?? null,
      metadata.height ?? null,
      sortOrder,
      meta.imageType,
      meta.pairId ?? null,
      meta.direction ?? null,
    ],
  );

  return mapImage(result.rows[0]);
}

export async function deleteImage(projectId: string, imageId: string): Promise<boolean> {
  const image = await findImageById(projectId, imageId);
  if (!image) return false;

  await getPool().query('DELETE FROM images WHERE id = $1 AND project_id = $2', [
    imageId,
    projectId,
  ]);

  try {
    await unlink(image.storage_path);
  } catch {
    // File may already be missing
  }

  return true;
}

export function validateImageType(value: unknown): ImageType {
  if (value === 'OVERVIEW' || value === 'VISIBLE' || value === 'INFRARED') {
    return value;
  }
  throw new ValidationError([{ field: 'imageType', message: '画像種別が不正です' }]);
}

export function validateUploadBatch(count: number): void {
  if (count === 0) {
    throw new ValidationError([{ field: 'files', message: 'ファイルを選択してください' }]);
  }
  if (count > 50) {
    throw new ValidationError([{ field: 'files', message: '一度にアップロードできるのは50枚までです' }]);
  }
}

export function parseUploadMeta(body: Record<string, unknown>, index: number): UploadImageInput {
  const details: ValidationDetail[] = [];
  const imageTypeRaw = body[`imageType_${index}`] ?? body.imageType;
  let imageType: ImageType = 'INFRARED';
  try {
    imageType = validateImageType(imageTypeRaw);
  } catch (error) {
    if (error instanceof ValidationError) details.push(...error.details);
  }

  if (details.length > 0) throw new ValidationError(details);

  const pairId = body[`pairId_${index}`] ?? body.pairId;
  const direction = body[`direction_${index}`] ?? body.direction;

  return {
    imageType,
    pairId: typeof pairId === 'string' && pairId ? pairId : null,
    direction: typeof direction === 'string' && direction ? direction : null,
  };
}
