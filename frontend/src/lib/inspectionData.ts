export type ImageType = 'OVERVIEW' | 'VISIBLE' | 'INFRARED';

export interface ImageRecord {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  imageType: ImageType;
  pairId: string | null;
  direction: string | null;
  createdAt: string;
}

export type AnomalyType =
  | 'HOT_SPOT'
  | 'COLD_SPOT'
  | 'DELAMINATION'
  | 'CRACK'
  | 'MOISTURE'
  | 'INSULATION_DEFECT'
  | 'DETERIORATION'
  | 'OTHER';

export type SeverityLevel = 'low' | 'medium' | 'high';
export type OverallScore = 'A' | 'B' | 'C' | 'D' | 'E';
export type RecommendedTiming =
  | 'IMMEDIATE'
  | 'WITHIN_6_MONTHS'
  | 'WITHIN_1_YEAR'
  | 'WITHIN_3_YEARS'
  | 'MONITORING';
export type SolarRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Anomaly {
  id: string;
  projectId: string;
  imageId: string;
  type: AnomalyType;
  comment: string | null;
  aiComment: string | null;
  markerX: number;
  markerY: number;
  markerW: number;
  markerH: number;
  severity: SeverityLevel;
  findingNumber: number | null;
  overallGrade: OverallScore | null;
  autoOverallGrade: OverallScore | null;
  urgencyStars: number | null;
  recommendedTiming: RecommendedTiming | null;
  direction: string | null;
  partName: string | null;
  createdAt: string;
}

export interface ConstructionPlan {
  type: 'MINOR' | 'MODERATE' | 'MAJOR';
  title: string;
  summary: string;
  isRecommended: boolean;
}

export interface AssessmentSummary {
  overallScore: OverallScore | null;
  autoOverallScore: OverallScore | null;
  roofLife: { min: number; max: number } | null;
  solarRisk: SolarRisk | null;
  anomalyCount: number;
  recommendedPlans: ConstructionPlan[];
  calculatedAt: string;
}

export const SCORE_LABELS: Record<OverallScore, string> = {
  A: '正常',
  B: '軽度劣化',
  C: '要点検',
  D: '要修繕',
  E: '緊急',
};

export const TIMING_LABELS: Record<RecommendedTiming, string> = {
  IMMEDIATE: '即時',
  WITHIN_6_MONTHS: '6か月以内',
  WITHIN_1_YEAR: '1年以内',
  WITHIN_3_YEARS: '3年以内',
  MONITORING: '経過観察',
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const SOLAR_RISK_LABELS: Record<SolarRisk, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

export function imageFileUrl(projectId: string, imageId: string): string {
  return `/api/v1/projects/${projectId}/images/${imageId}/file`;
}
