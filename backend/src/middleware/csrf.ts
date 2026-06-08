import type { NextFunction, Request, Response } from 'express';
import { verifyCsrfToken } from '../services/authService.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function validateCsrf(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const header = req.headers['x-csrf-token'];
  const token = Array.isArray(header) ? header[0] : header;

  if (!token || !verifyCsrfToken(req.user.id, token)) {
    res.status(403).json({
      error: {
        code: 'CSRF_INVALID',
        message: 'CSRF トークンが無効です。ページを再読み込みしてください。',
      },
    });
    return;
  }

  next();
}
