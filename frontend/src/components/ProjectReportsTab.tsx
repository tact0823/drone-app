import { useEffect, useState } from 'react';
import type { ReportType } from '../lib/reportData';
import { REPORT_TYPE_OPTIONS } from '../lib/reportData';
import { downloadReportFile, generateReport, listReports } from '../lib/reportApi';
import type { ReportRecord } from '../lib/reportData';
import { useAuth } from '../hooks/useAuth';

interface ProjectReportsTabProps {
  projectId: string;
}

export function ProjectReportsTab({ projectId }: ProjectReportsTabProps) {
  const { csrfToken } = useAuth();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [reportType, setReportType] = useState<ReportType>('SALES');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const data = await listReports(projectId);
    setReports(data.reports);
  }

  useEffect(() => {
    refresh()
      .catch(() => setError('報告書一覧の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      await generateReport(projectId, reportType, csrfToken ?? undefined);
      await refresh();
    } catch {
      setError('PDF の生成に失敗しました。Puppeteer のセットアップを確認してください。');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(report: ReportRecord) {
    try {
      await downloadReportFile(projectId, report.id, report.filename);
    } catch {
      setError('ダウンロードに失敗しました');
    }
  }

  if (loading) return <p className="text-sm text-slate-500">読み込み中...</p>;

  return (
    <div>
      <h3 className="font-semibold text-slate-900">報告書生成</h3>
      <p className="mt-1 text-sm text-slate-500">種別を選択して PDF を生成します</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {REPORT_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setReportType(option.value)}
            className={`min-h-11 rounded-xl border p-4 text-left ${
              reportType === option.value
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="font-medium text-slate-900">{option.label}</p>
            <p className="mt-1 text-xs text-slate-500">{option.description}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="mt-4 min-h-11 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {generating ? 'PDF 生成中...' : '選択した種別で PDF 生成'}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <h3 className="mt-8 font-semibold text-slate-900">生成済み一覧</h3>
      {reports.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">まだ報告書がありません</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">📄 {report.filename}</p>
                <p className="text-xs text-slate-500">
                  {report.reportType} · {new Date(report.generatedAt).toLocaleString('ja-JP')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(report)}
                className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                ⬇ ダウンロード
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
