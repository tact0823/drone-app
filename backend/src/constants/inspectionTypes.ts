import type { InspectionType } from '../types/project.js';

export interface AnomalyTypeMaster {
  code: string;
  label: string;
}

export interface InspectionTypeMaster {
  code: InspectionType;
  label: string;
  anomalyTypes: AnomalyTypeMaster[];
}

const ANOMALY_LABELS: Record<string, Record<string, string>> = {
  SOLAR_PANEL: {
    HOT_SPOT: 'ホットスポット',
    COLD_SPOT: 'コールドスポット',
    DELAMINATION: '層間剥離',
    CRACK: 'クラック',
    OTHER: 'その他',
  },
  EXTERIOR_WALL: {
    HOT_SPOT: '温度異常',
    MOISTURE: '水分侵入',
    INSULATION_DEFECT: '断熱不良',
    CRACK: 'クラック',
    OTHER: 'その他',
  },
  ROOF: {
    HOT_SPOT: '温度異常',
    MOISTURE: '雨漏り兆候',
    INSULATION_DEFECT: '断熱不良',
    DETERIORATION: '劣化',
    OTHER: 'その他',
  },
};

function types(inspectionType: InspectionType, codes: string[]): AnomalyTypeMaster[] {
  const labels = ANOMALY_LABELS[inspectionType];
  return codes.map((code) => ({ code, label: labels[code] ?? code }));
}

export const INSPECTION_TYPES: InspectionTypeMaster[] = [
  {
    code: 'SOLAR_PANEL',
    label: '太陽光パネル',
    anomalyTypes: types('SOLAR_PANEL', ['HOT_SPOT', 'COLD_SPOT', 'DELAMINATION', 'CRACK', 'OTHER']),
  },
  {
    code: 'EXTERIOR_WALL',
    label: '外壁',
    anomalyTypes: types('EXTERIOR_WALL', ['HOT_SPOT', 'MOISTURE', 'INSULATION_DEFECT', 'CRACK', 'OTHER']),
  },
  {
    code: 'ROOF',
    label: '屋根',
    anomalyTypes: types('ROOF', ['HOT_SPOT', 'MOISTURE', 'INSULATION_DEFECT', 'DETERIORATION', 'OTHER']),
  },
];

export const INSPECTION_TYPE_CODES = INSPECTION_TYPES.map((item) => item.code);

export function getInspectionTypeLabel(code: InspectionType): string {
  return INSPECTION_TYPES.find((item) => item.code === code)?.label ?? code;
}
