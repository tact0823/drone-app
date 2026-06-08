export type OverallScore = 'A' | 'B' | 'C' | 'D' | 'E';
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
export type RecommendedTiming =
  | 'IMMEDIATE'
  | 'WITHIN_6_MONTHS'
  | 'WITHIN_1_YEAR'
  | 'WITHIN_3_YEARS'
  | 'MONITORING';

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
  checkContent: string | null;
  partName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnomalyInput {
  imageId: string;
  type: AnomalyType;
  comment?: string | null;
  markerX: number;
  markerY: number;
  markerW: number;
  markerH: number;
  severity: SeverityLevel;
  overallGrade?: OverallScore | null;
  partName?: string | null;
  direction?: string | null;
  checkContent?: string | null;
  memo?: string | null;
}

export interface UpdateAnomalyInput {
  type?: AnomalyType;
  comment?: string | null;
  markerX?: number;
  markerY?: number;
  markerW?: number;
  markerH?: number;
  severity?: SeverityLevel;
  overallGrade?: OverallScore | null;
  partName?: string | null;
  direction?: string | null;
  checkContent?: string | null;
}

export type SolarRisk = 'LOW' | 'MEDIUM' | 'HIGH';

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
