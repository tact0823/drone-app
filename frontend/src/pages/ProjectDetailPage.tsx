import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { InspectionTypeSelector } from '../components/InspectionTypeSelector';
import { ProjectAnomaliesTab } from '../components/ProjectAnomaliesTab';
import { ProjectImagesTab } from '../components/ProjectImagesTab';
import { ProjectReportsTab } from '../components/ProjectReportsTab';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { deleteProject, getProject, updateProject } from '../lib/projectApi';
import type { InspectionType, Project, ProjectStatus } from '../lib/projects';
import { INSPECTION_TYPE_META } from '../lib/projects';

type Tab = 'overview' | 'images' | 'anomalies' | 'reports';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '概要' },
  { id: 'images', label: '画像' },
  { id: 'anomalies', label: '異常' },
  { id: 'reports', label: '報告書' },
];

function OverviewView({ project }: { project: Project }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="text-xs text-slate-500">依頼者名</dt>
        <dd className="text-sm text-slate-900">{project.clientName ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">点検現場</dt>
        <dd className="text-sm text-slate-900">{project.siteName}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">点検日</dt>
        <dd className="text-sm text-slate-900">{project.inspectionDate}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">場所</dt>
        <dd className="text-sm text-slate-900">{project.location ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">使用機材</dt>
        <dd className="text-sm text-slate-900">{project.equipment ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">天候</dt>
        <dd className="text-sm text-slate-900">{project.weather ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">構造</dt>
        <dd className="text-sm text-slate-900">{project.structure ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs text-slate-500">築年数</dt>
        <dd className="text-sm text-slate-900">{project.buildingAge ?? '—'}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-slate-500">所見</dt>
        <dd className="whitespace-pre-wrap text-sm text-slate-900">{project.notes ?? '—'}</dd>
      </div>
    </dl>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { csrfToken } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabParam = searchParams.get('tab');
  const initialTab: Tab =
    tabParam === 'images' || tabParam === 'anomalies' || tabParam === 'reports'
      ? tabParam
      : 'overview';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [editing, setEditing] = useState(false);
  const [inspectionType, setInspectionType] = useState<InspectionType>('SOLAR_PANEL');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProject(id)
      .then((data) => {
        setProject(data.project);
        setInspectionType(data.project.inspectionType);
      })
      .catch(() => setError('プロジェクトの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !project) return;

    const form = new FormData(event.currentTarget);
    setFieldErrors({});
    setSaving(true);

    try {
      const { project: updated } = await updateProject(
        id,
        {
          title: String(form.get('title') ?? ''),
          inspectionType,
          clientName: String(form.get('clientName') ?? ''),
          siteName: String(form.get('siteName') ?? ''),
          inspectionDate: String(form.get('inspectionDate') ?? ''),
          location: String(form.get('location') ?? '') || null,
          equipment: String(form.get('equipment') ?? '') || null,
          weather: String(form.get('weather') ?? '') || null,
          structure: String(form.get('structure') ?? '') || null,
          buildingAge: String(form.get('buildingAge') ?? '') || null,
          notes: String(form.get('notes') ?? '') || null,
          status: form.get('status') as ProjectStatus,
        },
        csrfToken ?? undefined,
      );
      setProject(updated);
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const errors: Record<string, string> = {};
        for (const detail of err.details) {
          errors[detail.field] = detail.message;
        }
        setFieldErrors(errors);
      } else {
        setError('更新に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteProject(id, csrfToken ?? undefined);
      navigate('/dashboard');
    } catch {
      setError('削除に失敗しました');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-slate-500">読み込み中...</p>
      </AppLayout>
    );
  }

  if (error && !project) {
    return (
      <AppLayout>
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-blue-600">
          ← ダッシュボードへ
        </Link>
      </AppLayout>
    );
  }

  if (!project) return null;

  const meta = INSPECTION_TYPE_META[project.inspectionType];

  return (
    <AppLayout>
      <Link to="/dashboard" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← 戻る
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {meta.icon} {meta.label}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 whitespace-nowrap px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {activeTab === 'overview' && !editing && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <OverviewView project={project} />
              {id && <AssessmentPanel projectId={id} inspectionType={project.inspectionType} />}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                編集
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="min-h-11 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          </>
        )}

        {activeTab === 'overview' && editing && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <InspectionTypeSelector
              value={inspectionType}
              onChange={setInspectionType}
              error={fieldErrors.inspectionType}
            />
            <label className="block text-sm">
              <span className="font-medium text-slate-700">プロジェクト名</span>
              <input name="title" defaultValue={project.title} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">依頼者名</span>
              <input name="clientName" defaultValue={project.clientName ?? ''} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">点検現場名</span>
              <input name="siteName" defaultValue={project.siteName} className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">点検日</span>
              <input
                name="inspectionDate"
                type="date"
                defaultValue={project.inspectionDate}
                className={inputClass}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">場所</span>
                <input name="location" defaultValue={project.location ?? ''} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">天候</span>
                <input name="weather" defaultValue={project.weather ?? ''} className={inputClass} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">使用機材</span>
              <input name="equipment" defaultValue={project.equipment ?? ''} className={inputClass} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">構造</span>
                <input name="structure" defaultValue={project.structure ?? ''} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">築年数</span>
                <input name="buildingAge" defaultValue={project.buildingAge ?? ''} className={inputClass} />
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">所見</span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={project.notes ?? ''}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">ステータス</span>
              <select name="status" defaultValue={project.status} className={inputClass}>
                <option value="draft">下書き</option>
                <option value="completed">完了</option>
              </select>
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}

        {activeTab === 'images' && id && <ProjectImagesTab projectId={id} />}
        {activeTab === 'anomalies' && id && <ProjectAnomaliesTab projectId={id} />}
        {activeTab === 'reports' && id && <ProjectReportsTab projectId={id} />}
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        title={project.title}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleting}
      />
    </AppLayout>
  );
}
