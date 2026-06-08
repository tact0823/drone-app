export type InspectionType = 'SOLAR_PANEL' | 'EXTERIOR_WALL' | 'ROOF';
export type ProjectStatus = 'draft' | 'completed';

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

export interface AnomalyTypeOption {
  code: string;
  label: string;
}

export interface InspectionTypeOption {
  code: InspectionType;
  label: string;
  anomalyTypes: AnomalyTypeOption[];
}

export const INSPECTION_TYPE_META: Record<
  InspectionType,
  { label: string; icon: string }
> = {
  SOLAR_PANEL: { label: '太陽光パネル', icon: '☀' },
  EXTERIOR_WALL: { label: '外壁', icon: '🧱' },
  ROOF: { label: '屋根', icon: '🏠' },
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: '下書き',
  completed: '完了',
};

export interface CreateProjectPayload {
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

export interface UpdateProjectPayload {
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
