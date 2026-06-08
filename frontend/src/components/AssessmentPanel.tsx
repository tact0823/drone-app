import { useEffect, useState } from 'react';
import type { AssessmentSummary } from '../lib/inspectionData';
import { SOLAR_RISK_LABELS } from '../lib/inspectionData';
import type { InspectionType } from '../lib/projects';
import { getAssessment, recalculateAssessment } from '../lib/inspectionApi';
import { useAuth } from '../hooks/useAuth';
import { OverallScoreBadge } from './OverallScoreBadge';

interface AssessmentPanelProps {
  projectId: string;
  inspectionType: InspectionType;
}

export function AssessmentPanel({ projectId, inspectionType }: AssessmentPanelProps) {
  const { csrfToken } = useAuth();
  const [assessment, setAssessment] = useState<AssessmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    getAssessment(projectId)
      .then(setAssessment)
      .catch(() => setAssessment(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const data = await recalculateAssessment(projectId, csrfToken ?? undefined);
      setAssessment(data);
    } finally {
      setRecalculating(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">評価を読み込み中...</p>;
  if (!assessment) return null;

  const recommended = assessment.recommendedPlans.find((plan) => plan.isRecommended);

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
      <h3 className="font-semibold text-slate-900">営業支援評価</h3>
      <div className="mt-4 space-y-4">
        {assessment.overallScore && (
          <div>
            <p className="text-xs text-slate-500">総合評価</p>
            <OverallScoreBadge score={assessment.overallScore} size="lg" />
            {assessment.autoOverallScore && (
              <p className="mt-1 text-xs text-slate-500">
                自動算出: {assessment.autoOverallScore}
              </p>
            )}
          </div>
        )}

        {assessment.roofLife && (inspectionType === 'ROOF' || inspectionType === 'EXTERIOR_WALL') && (
          <div>
            <p className="text-xs text-slate-500">屋根残寿命</p>
            <p className="text-sm font-medium text-slate-900">
              {assessment.roofLife.min}〜{assessment.roofLife.max} 年
            </p>
          </div>
        )}

        {assessment.solarRisk && inspectionType === 'SOLAR_PANEL' && (
          <div>
            <p className="text-xs text-slate-500">発電リスク</p>
            <p className="text-sm font-medium text-slate-900">
              {SOLAR_RISK_LABELS[assessment.solarRisk]}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs text-slate-500">異常件数</p>
          <p className="text-sm font-medium text-slate-900">{assessment.anomalyCount} 件</p>
        </div>

        {recommended && (
          <div>
            <p className="text-xs text-slate-500">推奨プラン</p>
            <p className="text-sm font-medium text-blue-700">● {recommended.title}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {recalculating ? '再算出中...' : '評価を再算出'}
        </button>
      </div>
    </div>
  );
}
