import { Router } from 'express';
import { INSPECTION_TYPES } from '../constants/inspectionTypes.js';
import { recordAuditLog } from '../services/auditService.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateCsrf } from '../middleware/csrf.js';
import { authorizeProjectOwner } from '../middleware/authorizeProjectOwner.js';
import {
  createProject,
  deleteProject,
  listProjectsByUser,
  updateProject,
} from '../services/projectService.js';
import type { CreateProjectInput, UpdateProjectInput } from '../types/project.js';
import { ValidationError } from '../types/project.js';
import { getRouteParam } from '../utils/routeParams.js';
import { anomaliesRouter } from './anomalies.js';
import { aiRouter } from './ai.js';
import { assessmentRouter } from './assessment.js';
import { imagesRouter } from './images.js';
import { reportsRouter } from './reports.js';

export const projectsRouter = Router();

projectsRouter.use(authenticate);
projectsRouter.use(validateCsrf);

projectsRouter.get('/inspection-types', (_req, res) => {
  res.json({ inspectionTypes: INSPECTION_TYPES });
});

projectsRouter.get('/', async (req, res) => {
  const projects = await listProjectsByUser(req.user!.id);
  res.json({ projects, total: projects.length });
});

projectsRouter.post('/', async (req, res) => {
  try {
    const project = await createProject(req.user!.id, req.body as CreateProjectInput);
    await recordAuditLog(req, {
      action: 'project.create',
      resourceType: 'project',
      resourceId: project.id,
      details: { title: project.title },
    });
    res.status(201).json({ project });
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

projectsRouter.use('/:id/images', authorizeProjectOwner, imagesRouter);
projectsRouter.use('/:id/anomalies', authorizeProjectOwner, anomaliesRouter);
projectsRouter.use('/:id/ai', authorizeProjectOwner, aiRouter);
projectsRouter.use('/:id/assessment', authorizeProjectOwner, assessmentRouter);
projectsRouter.use('/:id/reports', authorizeProjectOwner, reportsRouter);

projectsRouter.get('/:id', authorizeProjectOwner, (req, res) => {
  res.json({ project: req.project });
});

projectsRouter.patch('/:id', authorizeProjectOwner, async (req, res) => {
  try {
    const project = await updateProject(getRouteParam(req.params.id), req.body as UpdateProjectInput);
    if (!project) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
      return;
    }
    await recordAuditLog(req, {
      action: 'project.update',
      resourceType: 'project',
      resourceId: project.id,
    });
    res.json({ project });
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

projectsRouter.delete('/:id', authorizeProjectOwner, async (req, res) => {
  const projectId = getRouteParam(req.params.id);
  const deleted = await deleteProject(projectId);
  if (!deleted) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return;
  }
  await recordAuditLog(req, {
    action: 'project.delete',
    resourceType: 'project',
    resourceId: projectId,
  });
  res.status(204).send();
});
