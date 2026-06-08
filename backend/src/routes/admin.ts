import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateCsrf } from '../middleware/csrf.js';
import { listAuditLogs, recordAuditLog } from '../services/auditService.js';
import { listAllProjectsForAdmin } from '../services/projectService.js';
import { listAllUsers } from '../services/userService.js';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'), validateCsrf);

adminRouter.get('/users', async (req, res) => {
  const users = await listAllUsers();
  await recordAuditLog(req, { action: 'admin.users.list' });
  res.json({ users, total: users.length });
});

adminRouter.get('/projects', async (req, res) => {
  const projects = await listAllProjectsForAdmin();
  await recordAuditLog(req, { action: 'admin.projects.list' });
  res.json({ projects, total: projects.length });
});

adminRouter.get('/audit-logs', async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);
  const data = await listAuditLogs(limit, offset);
  await recordAuditLog(req, { action: 'admin.audit_logs.list' });
  res.json(data);
});
