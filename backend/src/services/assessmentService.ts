import { getPool } from '../db/pool.js';
import type { InspectionType } from '../types/project.js';
import type { AnomalyType, AssessmentSummary, OverallScore, RecommendedTiming } from '../types/anomaly.js';
import {
  buildRecommendedPlans,
  calculateOverallScore,
  calculateSolarRisk,
  estimateRoofLife,
  type AnomalyForScoring,
} from './assessmentEngine.js';
import { findProjectById } from './projectService.js';

interface AnomalyScoreRow {
  type: AnomalyType;
  overall_grade: OverallScore | null;
  auto_overall_grade: OverallScore | null;
  urgency_stars: number | null;
  recommended_timing: RecommendedTiming | null;
}

async function loadAnomaliesForScoring(projectId: string): Promise<AnomalyForScoring[]> {
  const result = await getPool().query<AnomalyScoreRow>(
    `SELECT type, overall_grade, auto_overall_grade, urgency_stars, recommended_timing
     FROM anomalies WHERE project_id = $1`,
    [projectId],
  );
  return result.rows.map((row) => ({
    type: row.type,
    overallGrade: row.overall_grade,
    autoOverallGrade: row.auto_overall_grade,
    urgencyStars: row.urgency_stars,
    recommendedTiming: row.recommended_timing,
  }));
}

export async function recalculateProjectAssessment(
  projectId: string,
  inspectionType?: InspectionType,
): Promise<AssessmentSummary> {
  const project = await findProjectById(projectId);
  if (!project) throw new Error('Project not found');

  const type = inspectionType ?? project.inspectionType;
  const scoring = await loadAnomaliesForScoring(projectId);
  const autoOverallScore = calculateOverallScore(scoring);
  const recommendedPlans = buildRecommendedPlans(autoOverallScore, scoring, type);

  let roofLife: { min: number; max: number } | null = null;
  if (type === 'ROOF' || type === 'EXTERIOR_WALL') {
    roofLife = estimateRoofLife(project.roofMaterial, project.buildingAge, scoring);
  }

  let solarRisk: 'LOW' | 'MEDIUM' | 'HIGH' | null = null;
  if (type === 'SOLAR_PANEL') {
    solarRisk = calculateSolarRisk(scoring);
  }

  await getPool().query(
    `UPDATE projects SET
       auto_overall_score = $1,
       overall_score = COALESCE(overall_score, $1),
       roof_life_min = $2,
       roof_life_max = $3,
       solar_risk = $4,
       recommended_plans = $5,
       updated_at = NOW()
     WHERE id = $6`,
    [
      autoOverallScore,
      roofLife?.min ?? null,
      roofLife?.max ?? null,
      solarRisk,
      JSON.stringify(recommendedPlans),
      projectId,
    ],
  );

  const updated = await findProjectById(projectId);
  return {
    overallScore: updated?.overallScore ?? autoOverallScore,
    autoOverallScore,
    roofLife,
    solarRisk,
    anomalyCount: scoring.length,
    recommendedPlans,
    calculatedAt: new Date().toISOString(),
  };
}

export async function getProjectAssessment(projectId: string): Promise<AssessmentSummary | null> {
  const project = await findProjectById(projectId);
  if (!project) return null;

  const scoring = await loadAnomaliesForScoring(projectId);
  const autoOverallScore =
    project.autoOverallScore ?? calculateOverallScore(scoring);

  return {
    overallScore: project.overallScore ?? autoOverallScore,
    autoOverallScore,
    roofLife:
      project.roofLifeMin !== null && project.roofLifeMax !== null
        ? { min: project.roofLifeMin, max: project.roofLifeMax }
        : null,
    solarRisk: project.solarRisk,
    anomalyCount: scoring.length,
    recommendedPlans: project.recommendedPlans ?? [],
    calculatedAt: project.updatedAt,
  };
}
