import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

import type { Anomaly } from '../lib/inspectionData';

import { TIMING_LABELS } from '../lib/inspectionData';

import { listAnomalies, regenerateSavedAnomalyComment } from '../lib/inspectionApi';

import { getInspectionTypes } from '../lib/projectApi';

import type { InspectionTypeOption } from '../lib/projects';

import { UrgencyStars } from './UrgencyStars';

import { OverallScoreBadge } from './OverallScoreBadge';



interface ProjectAnomaliesTabProps {

  projectId: string;

}



export function ProjectAnomaliesTab({ projectId }: ProjectAnomaliesTabProps) {

  const { csrfToken } = useAuth();

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  const [types, setTypes] = useState<InspectionTypeOption[]>([]);

  const [loading, setLoading] = useState(true);

  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);



  async function refresh() {

    const [anomalyData, typeData] = await Promise.all([

      listAnomalies(projectId),

      getInspectionTypes(),

    ]);

    setAnomalies(anomalyData.anomalies);

    setTypes(typeData.inspectionTypes);

  }



  useEffect(() => {

    refresh()

      .catch(() => setError('異常一覧の取得に失敗しました'))

      .finally(() => setLoading(false));

  }, [projectId]);



  function typeLabel(code: string): string {

    for (const group of types) {

      const found = group.anomalyTypes.find((item) => item.code === code);

      if (found) return found.label;

    }

    return code;

  }



  async function handleRegenerate(anomalyId: string) {

    setRegeneratingId(anomalyId);

    setError(null);

    try {

      const result = await regenerateSavedAnomalyComment(

        projectId,

        anomalyId,

        csrfToken ?? undefined,

      );

      setAnomalies((prev) =>

        prev.map((item) => (item.id === anomalyId ? result.anomaly : item)),

      );

    } catch {

      setError('AI 再分析に失敗しました');

    } finally {

      setRegeneratingId(null);

    }

  }



  if (loading) return <p className="text-sm text-slate-500">読み込み中...</p>;



  if (anomalies.length === 0) {

    return (

      <p className="text-sm text-slate-500">

        異常記録がありません。画像タブから画像をアップロードし、異常記録を追加してください。

      </p>

    );

  }



  return (

    <div className="space-y-3">

      {error && <p className="text-sm text-red-600">{error}</p>}

      {anomalies.map((anomaly) => (

        <div

          key={anomaly.id}

          className="rounded-xl border border-slate-200 bg-white p-4"

        >

          <div className="flex flex-wrap items-center gap-3">

            <span className="text-sm font-semibold text-slate-900">

              #{anomaly.findingNumber ?? '—'} {typeLabel(anomaly.type)}

            </span>

            {anomaly.overallGrade && <OverallScoreBadge score={anomaly.overallGrade} />}

            {anomaly.urgencyStars && <UrgencyStars stars={anomaly.urgencyStars} />}

          </div>

          <p className="mt-2 text-sm text-slate-700">{anomaly.comment ?? anomaly.aiComment}</p>

          {anomaly.recommendedTiming && (

            <p className="mt-1 text-xs text-slate-500">

              推奨対応: {TIMING_LABELS[anomaly.recommendedTiming]}

            </p>

          )}

          <div className="mt-3 flex flex-wrap gap-3">

            <button

              type="button"

              onClick={() => handleRegenerate(anomaly.id)}

              disabled={regeneratingId === anomaly.id}

              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"

            >

              {regeneratingId === anomaly.id ? '再分析中...' : '🔄 AI 再分析'}

            </button>

            <Link

              to={`/projects/${projectId}/anomalies/record/${anomaly.imageId}`}

              className="inline-flex min-h-11 items-center text-sm text-blue-600 hover:underline"

            >

              画像で確認 →

            </Link>

          </div>

        </div>

      ))}

    </div>

  );

}


