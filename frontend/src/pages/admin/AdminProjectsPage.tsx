import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { AdminProject } from '../../lib/adminApi';
import { listAdminProjects } from '../../lib/adminApi';

export function AdminProjectsPage() {
  const { csrfToken } = useAuth();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminProjects(csrfToken ?? undefined)
      .then((data) => setProjects(data.projects))
      .catch(() => setError('案件一覧の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [csrfToken]);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">案件管理</h1>
      <p className="mt-1 text-sm text-slate-500">全ユーザーの案件一覧</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">読み込み中...</p>}

      {!loading && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">プロジェクト</th>
                <th className="px-4 py-3">現場</th>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">所有者</th>
                <th className="px-4 py-3">画像/異常</th>
                <th className="px-4 py-3">作成日</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{project.title}</td>
                  <td className="px-4 py-3">{project.siteName}</td>
                  <td className="px-4 py-3">{project.inspectionType}</td>
                  <td className="px-4 py-3">
                    {project.ownerName}
                    <span className="block text-xs text-slate-500">{project.ownerEmail}</span>
                  </td>
                  <td className="px-4 py-3">
                    {project.imageCount} / {project.anomalyCount}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(project.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
