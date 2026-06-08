import type {
  AnomalyType,
  OverallScore,
  RecommendedTiming,
  SeverityLevel,
} from '../types/anomaly.js';

const GRADE_MATRIX: Record<AnomalyType, Record<SeverityLevel, OverallScore>> = {
  HOT_SPOT: { low: 'C', medium: 'D', high: 'E' },
  COLD_SPOT: { low: 'C', medium: 'D', high: 'E' },
  DELAMINATION: { low: 'C', medium: 'D', high: 'E' },
  CRACK: { low: 'B', medium: 'C', high: 'D' },
  MOISTURE: { low: 'B', medium: 'C', high: 'D' },
  INSULATION_DEFECT: { low: 'B', medium: 'C', high: 'D' },
  DETERIORATION: { low: 'B', medium: 'C', high: 'D' },
  OTHER: { low: 'B', medium: 'C', high: 'C' },
};

const GRADE_WEIGHT: Record<OverallScore, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

const TIMING_MAP: Record<OverallScore, RecommendedTiming> = {
  A: 'MONITORING',
  B: 'WITHIN_3_YEARS',
  C: 'WITHIN_1_YEAR',
  D: 'WITHIN_6_MONTHS',
  E: 'IMMEDIATE',
};

const STARS_MAP: Record<OverallScore, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

export function autoGrade(type: AnomalyType, severity: SeverityLevel): OverallScore {
  return GRADE_MATRIX[type]?.[severity] ?? 'C';
}

export function calculateUrgency(grade: OverallScore): {
  stars: number;
  timing: RecommendedTiming;
} {
  return { stars: STARS_MAP[grade], timing: TIMING_MAP[grade] };
}

export interface AnomalyForScoring {
  type: AnomalyType;
  overallGrade: OverallScore | null;
  autoOverallGrade: OverallScore | null;
  urgencyStars: number | null;
  recommendedTiming: RecommendedTiming | null;
}

function effectiveGrade(anomaly: AnomalyForScoring): OverallScore {
  return anomaly.overallGrade ?? anomaly.autoOverallGrade ?? 'B';
}

export function calculateOverallScore(anomalies: AnomalyForScoring[]): OverallScore {
  if (anomalies.length === 0) return 'A';

  let score = anomalies.reduce((worst, anomaly) => {
    const grade = effectiveGrade(anomaly);
    return GRADE_WEIGHT[grade] > GRADE_WEIGHT[worst] ? grade : worst;
  }, effectiveGrade(anomalies[0]));

  const urgentCount = anomalies.filter((a) => (a.urgencyStars ?? 0) >= 4).length;
  const emergencyCount = anomalies.filter((a) => a.recommendedTiming === 'IMMEDIATE').length;

  if (emergencyCount >= 1) score = 'E';
  else if (urgentCount >= 2 && GRADE_WEIGHT[score] < GRADE_WEIGHT.D) score = 'D';
  else if (urgentCount >= 1 && GRADE_WEIGHT[score] < GRADE_WEIGHT.C) score = 'C';

  return score;
}

export function parseBuildingAge(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function estimateRoofLife(
  roofMaterial: string | null | undefined,
  buildingAge: string | null | undefined,
  anomalies: AnomalyForScoring[],
): { min: number; max: number } {
  const BASE_LIFE: Record<string, number> = {
    スレート: 30,
    金属: 40,
    アスファルト: 20,
    未知: 25,
  };
  const base = BASE_LIFE[roofMaterial ?? '未知'] ?? 25;
  const age = parseBuildingAge(buildingAge);

  const roofAnomalies = anomalies.filter((a) =>
    ['MOISTURE', 'CRACK', 'DETERIORATION', 'INSULATION_DEFECT'].includes(a.type),
  );

  let penalty = 0;
  for (const anomaly of roofAnomalies) {
    const grade = effectiveGrade(anomaly);
    penalty += { A: 0, B: 1, C: 3, D: 5, E: 8 }[grade];
  }

  const remaining = Math.max(0, base - age - penalty);
  return { min: Math.max(0, remaining - 3), max: remaining };
}

export function calculateSolarRisk(anomalies: AnomalyForScoring[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  const solar = anomalies.filter((a) =>
    ['HOT_SPOT', 'COLD_SPOT', 'DELAMINATION'].includes(a.type),
  );
  if (solar.length === 0) return 'LOW';

  const hasE = solar.some((a) => effectiveGrade(a) === 'E');
  const dCount = solar.filter((a) => effectiveGrade(a) === 'D').length;
  const cCount = solar.filter((a) => effectiveGrade(a) === 'C').length;
  const hasHotSpotDelamination =
    solar.some((a) => a.type === 'HOT_SPOT') && solar.some((a) => a.type === 'DELAMINATION');

  if (hasE || dCount >= 2 || hasHotSpotDelamination) return 'HIGH';
  if (dCount >= 1 || cCount >= 1) return 'MEDIUM';
  return 'LOW';
}

export function buildRecommendedPlans(
  overallScore: OverallScore,
  anomalies: AnomalyForScoring[],
  inspectionType: string,
): Array<{ type: 'MINOR' | 'MODERATE' | 'MAJOR'; title: string; summary: string; isRecommended: boolean }> {
  const count = anomalies.length;
  const recommended =
    overallScore === 'E' || overallScore === 'D'
      ? 'MAJOR'
      : overallScore === 'C'
        ? 'MODERATE'
        : 'MINOR';

  const context =
    inspectionType === 'SOLAR_PANEL'
      ? '太陽光パネル'
      : inspectionType === 'ROOF'
        ? '屋根'
        : '外壁';

  const plans = [
    {
      type: 'MINOR' as const,
      title: '簡易補修',
      summary: `${context}の軽微な劣化に対し、部分補修・清掃・シーリング等の局所対応を実施します（異常 ${count} 件）。`,
    },
    {
      type: 'MODERATE' as const,
      title: '中規模改修',
      summary: `${context}の劣化進行部位に対し、部分葺き替え・防水補修・パネル交換等の計画的改修を推奨します（異常 ${count} 件）。`,
    },
    {
      type: 'MAJOR' as const,
      title: '大規模改修',
      summary: `${context}全体の性能回復のため、全面改修・大規模防水工事・パネル全面交換等を検討してください（異常 ${count} 件）。`,
    },
  ];

  return plans.map((plan) => ({ ...plan, isRecommended: plan.type === recommended }));
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
