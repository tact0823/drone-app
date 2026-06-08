import type { NextFunction, Request, Response } from 'express';
import { TOKEN_COOKIE, verifyToken } from '../services/authService.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[TOKEN_COOKIE] as string | undefined;
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Session expired' } });
  }
}

export function authorize(...allowedRoles: Array<'operator' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }
    next();
  };
}
