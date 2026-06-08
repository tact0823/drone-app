export type InspectionType = 'SOLAR_PANEL' | 'EXTERIOR_WALL' | 'ROOF';
export type ProjectStatus = 'draft' | 'completed';
export type OverallScore = 'A' | 'B' | 'C' | 'D' | 'E';
export type SolarRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ConstructionPlan {
  type: 'MINOR' | 'MODERATE' | 'MAJOR';
  title: string;
  summary: string;
  isRecommended: boolean;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  inspectionType: InspectionType;
  siteName: string;
  inspectionDate: string;
  location: string | null;
  equipment: string | null;
  weather: string | null;
  notes: string | null;
  clientName: string | null;
  structure: string | null;
  floors: string | null;
  buildingAge: string | null;
  roofMaterial: string | null;
  overallScore: OverallScore | null;
  autoOverallScore: OverallScore | null;
  roofLifeMin: number | null;
  roofLifeMax: number | null;
  solarRisk: SolarRisk | null;
  recommendedPlans: ConstructionPlan[] | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}
export interface ProjectListItem {
  id: string;
  title: string;
  inspectionType: InspectionType;
  siteName: string;
  inspectionDate: string;
  status: ProjectStatus;
  imageCount: number;
  anomalyCount: number;
  createdAt: string;
}

export interface CreateProjectInput {
  title: string;
  inspectionType: InspectionType;
  siteName: string;
  inspectionDate: string;
  clientName: string;
  location?: string;
  equipment?: string;
  weather?: string;
  notes?: string;
  structure?: string;
  floors?: string;
  buildingAge?: string;
  roofMaterial?: string;
}

export interface UpdateProjectInput {
  title?: string;
  inspectionType?: InspectionType;
  siteName?: string;
  inspectionDate?: string;
  clientName?: string;
  location?: string | null;
  equipment?: string | null;
  weather?: string | null;
  notes?: string | null;
  structure?: string | null;
  floors?: string | null;
  buildingAge?: string | null;
  roofMaterial?: string | null;
  status?: ProjectStatus;
}

export interface ValidationDetail {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  details: ValidationDetail[];

  constructor(details: ValidationDetail[]) {
    super('Validation failed');
    this.details = details;
  }
}
