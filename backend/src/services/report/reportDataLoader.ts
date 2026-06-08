import { readFile } from 'node:fs/promises';
import { INSPECTION_TYPES } from '../../constants/inspectionTypes.js';
import { SCORE_LABELS, TIMING_LABELS } from '../assessmentEngine.js';
import { listAnomaliesByProject } from '../anomalyService.js';
import { getProjectAssessment } from '../assessmentService.js';
import { findImageById, listImagesByProject } from '../imageService.js';
import { findProjectById } from '../projectService.js';
import { findUserById } from '../userService.js';
import { env } from '../../config/env.js';
import type { Anomaly, AssessmentSummary } from '../../types/anomaly.js';
import type { ImageRecord } from '../../types/image.js';
import type { Project } from '../../types/project.js';
import type { User } from '../../types/user.js';

export interface ReportBuildData {
  project: Project;
  inspector: User;
  images: ImageRecord[];
  anomalies: Anomaly[];
  assessment: AssessmentSummary;
  company: {
    name: string;
    address: string;
    phone: string;
    website: string;
  };
  imageDataUrls: Map<string, string>;
}

async function loadImageDataUrl(storagePath: string): Promise<string | null> {
  try {
    const buffer = await readFile(storagePath);
    const mime = storagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function loadReportData(projectId: string, userId: string): Promise<ReportBuildData> {
  const project = await findProjectById(projectId);
  if (!project) throw new Error('Project not found');

  const inspector = await findUserById(userId);
  if (!inspector) throw new Error('User not found');

  const images = await listImagesByProject(projectId);
  const anomalies = await listAnomaliesByProject(projectId);
  const assessment =
    (await getProjectAssessment(projectId)) ?? {
      overallScore: 'A',
      autoOverallScore: 'A',
      roofLife: null,
      solarRisk: null,
      anomalyCount: anomalies.length,
      recommendedPlans: project.recommendedPlans ?? [],
      calculatedAt: new Date().toISOString(),
    };

  const imageDataUrls = new Map<string, string>();
  for (const image of images) {
    const row = await findImageById(projectId, image.id);
    if (row) {
      const dataUrl = await loadImageDataUrl(row.storage_path);
      if (dataUrl) imageDataUrls.set(image.id, dataUrl);
    }
  }

  return {
    project,
    inspector,
    images,
    anomalies,
    assessment,
    company: {
      name: env.companyName,
      address: env.companyAddress,
      phone: env.companyPhone,
      website: env.companyWebsite,
    },
    imageDataUrls,
  };
}

export function getInspectionLabel(code: string): string {
  return INSPECTION_TYPES.find((item) => item.code === code)?.label ?? code;
}

export function getAnomalyLabel(inspectionType: string, anomalyType: string): string {
  const master = INSPECTION_TYPES.find((item) => item.code === inspectionType);
  return master?.anomalyTypes.find((item) => item.code === anomalyType)?.label ?? anomalyType;
}

export function formatFindingNumber(num: number | null): string {
  if (!num) return '—';
  const chars = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  return chars[num - 1] ?? String(num);
}

export function gradeToJudgment(grade: string | null): string {
  if (grade === 'A' || grade === 'B') return '良好';
  if (grade === 'C') return '要観察';
  return '要対応';
}

export { SCORE_LABELS, TIMING_LABELS };
