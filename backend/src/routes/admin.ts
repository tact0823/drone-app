import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateCsrf } from '../middleware/csrf.js';
import { listAuditLogs, recordAuditLog } from '../services/auditService.js';
import {
  activateAiPrompt,
  createAiPrompt,
  getAiPromptById,
  listAiPrompts,
  toAuditPromptSnapshot,
  updateAiPrompt,
} from '../services/aiPromptService.js';
import { listAllProjectsForAdmin } from '../services/projectService.js';
import { listAllUsers } from '../services/userService.js';
import type { AiPromptTargetType } from '../types/aiPrompt.js';
import { AI_PROMPT_TARGET_TYPES } from '../types/aiPrompt.js';

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

adminRouter.get('/ai-prompts', async (req, res) => {
  const targetType = req.query.targetType as AiPromptTargetType | undefined;
  if (targetType && !AI_PROMPT_TARGET_TYPES.includes(targetType)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid targetType' } });
    return;
  }
  const prompts = await listAiPrompts(targetType);
  await recordAuditLog(req, { action: 'admin.ai_prompts.list' });
  res.json({ prompts, total: prompts.length });
});

adminRouter.get('/ai-prompts/:id', async (req, res) => {
  const prompt = await getAiPromptById(req.params.id);
  if (!prompt) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prompt not found' } });
    return;
  }
  res.json({ prompt });
});

adminRouter.post('/ai-prompts', async (req, res) => {
  const { name, targetType, systemPrompt, userPrompt, model, isActive } = req.body ?? {};
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof targetType !== 'string' ||
    !AI_PROMPT_TARGET_TYPES.includes(targetType as AiPromptTargetType) ||
    typeof systemPrompt !== 'string' ||
    !systemPrompt.trim() ||
    typeof userPrompt !== 'string' ||
    !userPrompt.trim()
  ) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid prompt payload' } });
    return;
  }

  const prompt = await createAiPrompt({
    name: name.trim(),
    targetType: targetType as AiPromptTargetType,
    systemPrompt: systemPrompt.trim(),
    userPrompt: userPrompt.trim(),
    model: typeof model === 'string' ? model.trim() || null : null,
    isActive: Boolean(isActive),
  });

  await recordAuditLog(req, {
    action: 'admin.ai_prompt.create',
    resourceType: 'ai_prompt',
    resourceId: prompt.id,
    details: { after: toAuditPromptSnapshot(prompt) },
  });

  res.status(201).json({ prompt });
});

adminRouter.put('/ai-prompts/:id', async (req, res) => {
  const before = await getAiPromptById(req.params.id);
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prompt not found' } });
    return;
  }

  const body = req.body ?? {};
  const prompt = await updateAiPrompt(req.params.id, {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    systemPrompt: typeof body.systemPrompt === 'string' ? body.systemPrompt.trim() : undefined,
    userPrompt: typeof body.userPrompt === 'string' ? body.userPrompt.trim() : undefined,
    model:
      body.model === null
        ? null
        : typeof body.model === 'string'
          ? body.model.trim() || null
          : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
  });

  if (!prompt) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prompt not found' } });
    return;
  }

  await recordAuditLog(req, {
    action: 'admin.ai_prompt.update',
    resourceType: 'ai_prompt',
    resourceId: prompt.id,
    details: {
      before: toAuditPromptSnapshot(before),
      after: toAuditPromptSnapshot(prompt),
    },
  });

  res.json({ prompt });
});

adminRouter.post('/ai-prompts/:id/activate', async (req, res) => {
  const before = await getAiPromptById(req.params.id);
  if (!before) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prompt not found' } });
    return;
  }

  const prompt = await activateAiPrompt(req.params.id);
  if (!prompt) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prompt not found' } });
    return;
  }

  await recordAuditLog(req, {
    action: 'admin.ai_prompt.activate',
    resourceType: 'ai_prompt',
    resourceId: prompt.id,
    details: {
      before: toAuditPromptSnapshot(before),
      after: toAuditPromptSnapshot(prompt),
    },
  });

  res.json({ prompt });
});
