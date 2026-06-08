import { Router } from 'express';
import path from 'node:path';
import {
  deleteImage,
  findImageById,
  listImagesByProject,
  parseUploadMeta,
  saveUploadedImage,
  validateUploadBatch,
} from '../services/imageService.js';
import { ValidationError } from '../types/project.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { getProjectId, getRouteParam } from '../utils/routeParams.js';

export const imagesRouter = Router({ mergeParams: true });

imagesRouter.get('/', async (req, res) => {
  const projectId = getProjectId(req.params);
  const images = await listImagesByProject(projectId);
  res.json({ images, total: images.length });
});

imagesRouter.post('/', uploadMiddleware.array('files', 50), async (req, res) => {
  const projectId = getProjectId(req.params);
  const files = req.files as Express.Multer.File[] | undefined;

  try {
    validateUploadBatch(files?.length ?? 0);
    const body = req.body as Record<string, unknown>;
    const uploaded = [];

    for (let i = 0; i < files!.length; i++) {
      const file = files![i];
      const meta = parseUploadMeta(body, i);
      const image = await saveUploadedImage(projectId, file.originalname, file.buffer, meta);
      uploaded.push(image);
    }

    res.status(201).json({ images: uploaded, total: uploaded.length });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力内容に誤りがあります',
          details: error.details,
        },
      });
      return;
    }
    throw error;
  }
});

imagesRouter.get('/:imageId/file', async (req, res) => {
  const projectId = getProjectId(req.params);
  const imageId = getRouteParam(req.params.imageId);
  const image = await findImageById(projectId, imageId);

  if (!image) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image not found' } });
    return;
  }

  res.type(image.mime_type);
  res.sendFile(path.resolve(image.storage_path));
});

imagesRouter.delete('/:imageId', async (req, res) => {
  const projectId = getProjectId(req.params);
  const imageId = getRouteParam(req.params.imageId);
  const deleted = await deleteImage(projectId, imageId);

  if (!deleted) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image not found' } });
    return;
  }

  res.status(204).send();
});
