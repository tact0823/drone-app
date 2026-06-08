import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../hooks/useAuth';
import type { AnomalyType, SeverityLevel } from '../lib/inspectionData';
import { imageFileUrl, SEVERITY_LABELS } from '../lib/inspectionData';
import { analyzeAnomalyWithAi, createAnomaly, listAnomalies } from '../lib/inspectionApi';
import { getInspectionTypes, getProject } from '../lib/projectApi';
import type { InspectionTypeOption } from '../lib/projects';

interface Marker {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function AnomalyRecordPage() {
  const { id: projectId, imageId } = useParams<{ id: string; imageId: string }>();
  const navigate = useNavigate();
  const { csrfToken } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const [inspectionTypes, setInspectionTypes] = useState<InspectionTypeOption[]>([]);
  const [inspectionType, setInspectionType] = useState<string>('SOLAR_PANEL');
  const [anomalyType, setAnomalyType] = useState<AnomalyType>('HOT_SPOT');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [checkContent, setCheckContent] = useState('');
  const [partName, setPartName] = useState('');
  const [direction, setDirection] = useState('');
  const [comment, setComment] = useState('');
  const [marker, setMarker] = useState<Marker | null>(null);
  const [drawing, setDrawing] = useState<Marker | null>(null);
  const [savedList, setSavedList] = useState<Array<{ type: string; comment: string | null }>>([]);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiSource, setAiSource] = useState<'llm' | 'template' | null>(null);
  const [commentTouched, setCommentTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoGenRequestId = useRef(0);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getInspectionTypes(), listAnomalies(projectId)]).then(
      ([projectData, typesData, anomaliesData]) => {
        setInspectionType(projectData.project.inspectionType);
        setInspectionTypes(typesData.inspectionTypes);
        setSavedList(
          anomaliesData.anomalies
            .filter((item) => item.imageId === imageId)
            .map((item) => ({ type: item.type, comment: item.comment ?? item.aiComment })),
        );
      },
    );
  }, [projectId, imageId]);

  const anomalyOptions =
    inspectionTypes.find((item) => item.code === inspectionType)?.anomalyTypes ?? [];

  function typeLabel(code: AnomalyType): string {
    return anomalyOptions.find((item) => item.code === code)?.label ?? code;
  }

  function pointerPosition(event: React.PointerEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown(event: React.PointerEvent) {
    const pos = pointerPosition(event);
    dragStart.current = pos;
    setDrawing({ x: pos.x, y: pos.y, w: 0.01, h: 0.01 });
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragStart.current) return;
    const pos = pointerPosition(event);
    const x = Math.min(dragStart.current.x, pos.x);
    const y = Math.min(dragStart.current.y, pos.y);
    const w = Math.max(0.01, Math.abs(pos.x - dragStart.current.x));
    const h = Math.max(0.01, Math.abs(pos.y - dragStart.current.y));
    setDrawing({ x, y, w, h });
  }

  function handlePointerUp() {
    if (drawing && drawing.w > 0.02 && drawing.h > 0.02) {
      setMarker(drawing);
    }
    dragStart.current = null;
    setDrawing(null);
  }

  async function fetchAiAnalysis(regenerate: boolean) {
    if (!projectId || !marker) return;

    const requestId = ++autoGenRequestId.current;
    if (regenerate) {
      setRegenerating(true);
    } else {
      setAutoGenerating(true);
    }

    try {
      const result = await analyzeAnomalyWithAi(
        projectId,
        {
          partName,
          direction,
          memo: partName,
          marker,
          regenerate,
        },
        csrfToken ?? undefined,
      );
      if (requestId !== autoGenRequestId.current) return;
      setAnomalyType(result.anomalyType);
      setSeverity(result.severity);
      setComment(result.comment);
      setCheckContent(result.checkContent ?? '');
      setAiGenerated(true);
      setAiSource(result.source);
      setCommentTouched(false);
    } catch {
      if (requestId === autoGenRequestId.current) {
        setError('AI 診断分析に失敗しました');
      }
    } finally {
      if (requestId === autoGenRequestId.current) {
        setRegenerating(false);
        setAutoGenerating(false);
      }
    }
  }

  useEffect(() => {
    if (!marker || commentTouched) return;

    const timer = window.setTimeout(() => {
      void fetchAiAnalysis(false);
    }, 700);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when context changes
  }, [projectId, marker, partName, direction, commentTouched]);

  async function handleRegenerate() {
    setError(null);
    await fetchAiAnalysis(true);
  }

  async function handleSave() {
    if (!projectId || !imageId || !marker) {
      setError('画像上に矩形マーカーを描画してください');
      return;
    }
    if (!comment.trim()) {
      setError('AI 診断が完了するまでお待ちください');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAnomaly(
        projectId,
        {
          imageId,
          type: anomalyType,
          markerX: marker.x,
          markerY: marker.y,
          markerW: marker.w,
          markerH: marker.h,
          severity,
          comment: comment || undefined,
          partName: partName || undefined,
          direction: direction || undefined,
          checkContent: checkContent || undefined,
          memo: partName || undefined,
        },
        csrfToken ?? undefined,
      );
      navigate(`/projects/${projectId}?tab=anomalies`);
    } catch {
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  const activeMarker = drawing ?? marker;
  const analyzing = autoGenerating || regenerating;

  return (
    <AppLayout>
      <Link
        to={`/projects/${projectId}?tab=images`}
        className="mb-4 inline-block text-sm text-blue-600 hover:underline"
      >
        ← 画像一覧へ
      </Link>
      <h1 className="text-xl font-bold text-slate-900">異常記録</h1>
      <p className="mt-1 text-sm text-slate-500">
        矩形マーカーを描画すると、AI が異常種別・重要度・診断所見を自動判定します
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div
          ref={containerRef}
          className="relative touch-none overflow-hidden rounded-xl border border-slate-200 bg-black"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {projectId && imageId && (
            <img
              src={imageFileUrl(projectId, imageId)}
              alt="Inspection"
              className="block w-full select-none"
              draggable={false}
            />
          )}
          {activeMarker && (
            <div
              className="pointer-events-none absolute border-2 border-red-500 bg-red-500/20"
              style={{
                left: `${activeMarker.x * 100}%`,
                top: `${activeMarker.y * 100}%`,
                width: `${activeMarker.w * 100}%`,
                height: `${activeMarker.h * 100}%`,
              }}
            />
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">AI 判定</p>
            {analyzing && (
              <p className="mt-2 text-sm text-slate-600">サーマル所見を分析しています...</p>
            )}
            {!analyzing && !marker && (
              <p className="mt-2 text-sm text-slate-500">マーカー描画後に AI が判定します</p>
            )}
            {!analyzing && marker && (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">異常種別</dt>
                  <dd className="font-medium text-slate-900">{typeLabel(anomalyType)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">重要度</dt>
                  <dd className="font-medium text-slate-900">{SEVERITY_LABELS[severity]}</dd>
                </div>
              </dl>
            )}
            {aiSource && !analyzing && (
              <p className="mt-2 text-xs text-slate-500">
                {aiSource === 'llm' ? 'LLM 分析' : 'テンプレート分析（LLM_API_KEY 未設定時）'}
              </p>
            )}
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">部位名</span>
            <input
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="屋根北面 / パネル列3 No.12"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">方位</span>
            <div className="mt-2 flex gap-2">
              {['N', 'E', 'S', 'W'].map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => setDirection(dir)}
                  className={`min-h-11 min-w-11 rounded-lg border ${
                    direction === dir
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-300'
                  }`}
                >
                  {dir}
                </button>
              ))}
            </div>
          </label>

          {checkContent && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">推奨確認項目（AI）</p>
              <p className="mt-1 text-slate-600">{checkContent}</p>
            </div>
          )}

          <label className="block text-sm">
            <span className="font-medium text-slate-700">診断所見（AI 自動生成）</span>
            <textarea
              value={comment}
              onChange={(e) => {
                setCommentTouched(true);
                setAiGenerated(false);
                setComment(e.target.value);
              }}
              rows={8}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed"
              placeholder={
                marker
                  ? analyzing
                    ? 'AI が異常種別・重要度・診断所見を分析しています...'
                    : '矩形を描画すると AI がプロ向け診断所見を生成します'
                  : '先に画像上で矩形マーカーを描画してください'
              }
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={analyzing || !marker}
                className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                {regenerating ? '再分析中...' : '🔄 再分析'}
              </button>
              {aiGenerated && !commentTouched && (
                <span className="text-xs text-emerald-600">AI 分析完了</span>
              )}
              {commentTouched && (
                <span className="text-xs text-slate-500">手動編集中 — 再分析で AI 文案に戻せます</span>
              )}
            </div>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || analyzing}
            className="min-h-11 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {savedList.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">この画像の記録済み異常</h2>
          <ul className="mt-3 space-y-2">
            {savedList.map((item, index) => (
              <li key={index} className="rounded-lg border border-slate-200 p-3 text-sm">
                {item.type} — {item.comment}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppLayout>
  );
}
