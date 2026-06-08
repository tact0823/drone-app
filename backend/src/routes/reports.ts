import { Router } from 'express';
import path from 'node:path';
import {
  findReportById,
  generateReport,
  listReportsByProject,
} from '../services/report/reportService.js';
import { ValidationError } from '../types/project.js';
import { recordAuditLog } from '../services/auditService.js';
import { getProjectId } from '../utils/routeParams.js';

export const reportsRouter = Router({ mergeParams: true });

reportsRouter.get('/', async (req, res) => {
  const projectId = getProjectId(req.params);
  const reports = await listReportsByProject(projectId);
  res.json({ reports, total: reports.length });
});

reportsRouter.post('/', async (req, res) => {
  const projectId = getProjectId(req.params);
  try {
    const { report, pageCount } = await generateReport(projectId, req.user!.id, req.body);
    await recordAuditLog(req, {
      action: 'report.generate',
      resourceType: 'report',
      resourceId: report.id,
      details: { reportType: report.reportType, filename: report.filename },
    });
    res.status(201).json({ report: { ...report, pageCount } });
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
    console.error('Report generation error:', error);
    res.status(500).json({
      error: {
        code: 'PDF_GENERATION_FAILED',
        message: 'PDF の生成に失敗しました',
      },
    });
  }
});

reportsRouter.get('/:reportId/file', async (req, res) => {
  const projectId = getProjectId(req.params);
  const reportId = Array.isArray(req.params.reportId)
    ? req.params.reportId[0]
    : req.params.reportId;

  const report = await findReportById(projectId, reportId);
  if (!report) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found' } });
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(report.filename)}"`);
  res.sendFile(path.resolve(report.storage_path));
});
