import { Router } from 'express';
import {
  createAnomaly,
  deleteAnomaly,
  findAnomalyById,
  listAnomaliesByProject,
  regenerateAnomalyAiComment,
  updateAnomaly,
  validateCreateAnomalyBody,
} from '../services/anomalyService.js';
import { aiRateLimiter } from '../middleware/aiRateLimit.js';
import type { UpdateAnomalyInput } from '../types/anomaly.js';
import { ValidationError } from '../types/project.js';
import { getProjectId, getRouteParam } from '../utils/routeParams.js';

export const anomaliesRouter = Router({ mergeParams: true });

anomaliesRouter.get('/', async (req, res) => {
  const projectId = getProjectId(req.params);
  const anomalies = await listAnomaliesByProject(projectId);
  res.json({ anomalies, total: anomalies.length });
});

anomaliesRouter.post('/', async (req, res) => {
  const projectId = getProjectId(req.params);
  const inspectionType = req.project!.inspectionType;

  try {
    const input = validateCreateAnomalyBody(req.body);
    const anomaly = await createAnomaly(projectId, inspectionType, input);
    res.status(201).json({ anomaly });
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

anomaliesRouter.post('/:anomalyId/regenerate-ai-comment', aiRateLimiter, async (req, res) => {
  const projectId = getProjectId(req.params);
  const anomalyId = getRouteParam(req.params.anomalyId);
  const inspectionType = req.project!.inspectionType;

  const anomaly = await regenerateAnomalyAiComment(projectId, anomalyId, inspectionType);
  if (!anomaly) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Anomaly not found' } });
    return;
  }

  res.json({ anomaly, generatedAt: new Date().toISOString() });
});

anomaliesRouter.patch('/:anomalyId', async (req, res) => {
  const projectId = getProjectId(req.params);
  const anomalyId = getRouteParam(req.params.anomalyId);
  const inspectionType = req.project!.inspectionType;

  try {
    const anomaly = await updateAnomaly(
      projectId,
      anomalyId,
      inspectionType,
      req.body as UpdateAnomalyInput,
    );
    if (!anomaly) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Anomaly not found' } });
      return;
    }
    res.json({ anomaly });
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

anomaliesRouter.delete('/:anomalyId', async (req, res) => {
  const projectId = getProjectId(req.params);
  const anomalyId = getRouteParam(req.params.anomalyId);
  const deleted = await deleteAnomaly(projectId, anomalyId, req.project!.inspectionType);

  if (!deleted) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Anomaly not found' } });
    return;
  }

  res.status(204).send();
});

anomaliesRouter.get('/:anomalyId', async (req, res) => {
  const projectId = getProjectId(req.params);
  const anomalyId = getRouteParam(req.params.anomalyId);
  const anomaly = await findAnomalyById(projectId, anomalyId);

  if (!anomaly) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Anomaly not found' } });
    return;
  }

  res.json({ anomaly });
});
