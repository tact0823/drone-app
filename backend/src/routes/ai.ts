import { Router } from 'express';
import { aiRateLimiter } from '../middleware/aiRateLimit.js';
import { analyzeAnomaly, generateDiagnosticComment } from '../services/aiService.js';
import type { AnomalyType, SeverityLevel } from '../types/anomaly.js';

export const aiRouter = Router({ mergeParams: true });

aiRouter.post('/analyze-anomaly', aiRateLimiter, async (req, res) => {
  const inspectionType = req.project!.inspectionType;
  const { partName, direction, checkContent, memo, marker, regenerate } = req.body as {
    partName?: string;
    direction?: string;
    checkContent?: string;
    memo?: string;
    marker?: { x: number; y: number; w: number; h: number };
    regenerate?: boolean;
  };

  const analysis = await analyzeAnomaly({
    inspectionType,
    partName,
    direction,
    checkContent,
    memo,
    marker,
    regenerate: regenerate === true,
  });

  res.json({
    ...analysis,
    generatedAt: new Date().toISOString(),
  });
});

/** 後方互換 — 種別・重要度を既知とする場合 */
aiRouter.post('/diagnostic-comment', aiRateLimiter, async (req, res) => {
  const inspectionType = req.project!.inspectionType;
  const { anomalyType, severity, memo, regenerate, partName, direction, marker } = req.body as {
    anomalyType?: AnomalyType;
    severity?: SeverityLevel;
    memo?: string;
    partName?: string;
    direction?: string;
    marker?: { x: number; y: number; w: number; h: number };
    regenerate?: boolean;
  };

  if (!anomalyType || !severity) {
    const analysis = await analyzeAnomaly({
      inspectionType,
      partName: partName ?? memo,
      direction,
      memo,
      marker,
      regenerate: regenerate === true,
    });
    res.json({
      comment: analysis.comment,
      anomalyType: analysis.anomalyType,
      severity: analysis.severity,
      checkContent: analysis.checkContent,
      source: analysis.source,
      generatedAt: new Date().toISOString(),
    });
    return;
  }

  const comment = await generateDiagnosticComment({
    inspectionType,
    anomalyType,
    severity,
    memo: memo ?? partName,
    regenerate: regenerate === true,
  });

  res.json({ comment, generatedAt: new Date().toISOString() });
});
