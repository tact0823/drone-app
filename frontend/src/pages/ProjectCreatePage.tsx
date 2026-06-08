import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { InspectionTypeSelector } from '../components/InspectionTypeSelector';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { createProject } from '../lib/projectApi';
import type { InspectionType } from '../lib/projects';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const { csrfToken } = useAuth();
  const [inspectionType, setInspectionType] = useState<InspectionType | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    if (!inspectionType) {
      setFieldErrors({ inspectionType: '点検種別を選択してください' });
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      const { project } = await createProject(
        {
          title: String(form.get('title') ?? ''),
          inspectionType,
          clientName: String(form.get('clientName') ?? ''),
          siteName: String(form.get('siteName') ?? ''),
          inspectionDate: String(form.get('inspectionDate') ?? ''),
          structure: String(form.get('structure') ?? '') || undefined,
          buildingAge: String(form.get('buildingAge') ?? '') || undefined,
          location: String(form.get('location') ?? '') || undefined,
          equipment: String(form.get('equipment') ?? '') || undefined,
          weather: String(form.get('weather') ?? '') || undefined,
        },
        csrfToken ?? undefined,
      );
      navigate(`/projects/${project.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const errors: Record<string, string> = {};
        for (const detail of err.details) {
          errors[detail.field] = detail.message;
        }
        setFieldErrors(errors);
      } else {
        setSubmitError('プロジェクトの作成に失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <Link to="/dashboard" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← 戻る
      </Link>
      <h1 className="text-xl font-bold text-slate-900">新規プロジェクト</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <InspectionTypeSelector
          value={inspectionType}
          onChange={setInspectionType}
          error={fieldErrors.inspectionType}
        />

        <label className="block text-sm">
          <span className="font-medium text-slate-700">
            プロジェクト名 <span className="text-red-500">*</span>
          </span>
          <input name="title" className={inputClass} />
          {fieldErrors.title && <span className="mt-1 block text-red-600">{fieldErrors.title}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">
            依頼者名 <span className="text-red-500">*</span>
          </span>
          <input name="clientName" placeholder="○○様" className={inputClass} />
          {fieldErrors.clientName && (
            <span className="mt-1 block text-red-600">{fieldErrors.clientName}</span>
          )}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">
            点検現場名 <span className="text-red-500">*</span>
          </span>
          <input name="siteName" className={inputClass} />
          {fieldErrors.siteName && (
            <span className="mt-1 block text-red-600">{fieldErrors.siteName}</span>
          )}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">
            点検日 <span className="text-red-500">*</span>
          </span>
          <input name="inspectionDate" type="date" className={inputClass} />
          {fieldErrors.inspectionDate && (
            <span className="mt-1 block text-red-600">{fieldErrors.inspectionDate}</span>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">構造</span>
            <input name="structure" placeholder="木造" className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">築年数</span>
            <input name="buildingAge" placeholder="築15年" className={inputClass} />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">場所</span>
          <input name="location" className={inputClass} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">使用機材</span>
            <input name="equipment" placeholder="DJI Mavic 3T" className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">天候</span>
            <input name="weather" placeholder="晴れ" className={inputClass} />
          </label>
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '作成中...' : '作成'}
        </button>
      </form>
    </AppLayout>
  );
}
