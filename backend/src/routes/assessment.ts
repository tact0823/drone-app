import { Router } from 'express';
import {
  getProjectAssessment,
  recalculateProjectAssessment,
} from '../services/assessmentService.js';
import { getProjectId } from '../utils/routeParams.js';

export const assessmentRouter = Router({ mergeParams: true });

assessmentRouter.get('/', async (req, res) => {
  const projectId = getProjectId(req.params);
  const assessment = await getProjectAssessment(projectId);

  if (!assessment) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return;
  }

  res.json(assessment);
});

assessmentRouter.post('/recalculate', async (req, res) => {
  const projectId = getProjectId(req.params);
  const assessment = await recalculateProjectAssessment(projectId, req.project!.inspectionType);
  res.json(assessment);
});
