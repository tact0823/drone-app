import type { NextFunction, Request, Response } from 'express';
import { findProjectById } from '../services/projectService.js';
import type { Project } from '../types/project.js';
import { getRouteParam } from '../utils/routeParams.js';

declare global {
  namespace Express {
    interface Request {
      project?: Project;
    }
  }
}

export async function authorizeProjectOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { id } = req.params;
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const project = await findProjectById(getRouteParam(id));
  if (!project) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return;
  }

  if (project.userId !== req.user.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    return;
  }

  req.project = project;
  next();
}
