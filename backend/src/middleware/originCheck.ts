import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

export function originCheck(req: Request, res: Response, next: NextFunction): void {
  if (!env.isProduction || SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const allowed = normalizeOrigin(env.frontendUrl);
  const origin = req.headers.origin ? normalizeOrigin(String(req.headers.origin)) : null;
  const referer = req.headers.referer ? normalizeOrigin(String(req.headers.referer)) : null;

  if (origin === allowed || referer === allowed) {
    next();
    return;
  }

  if (!origin && !referer) {
    next();
    return;
  }

  res.status(403).json({
    error: {
      code: 'ORIGIN_FORBIDDEN',
      message: 'Invalid request origin',
    },
  });
}
