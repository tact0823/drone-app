import { useEffect, useState } from 'react';
import { listAdminProjects, listAdminUsers, listAuditLogs } from '../../lib/adminApi';

export function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, projects: 0, logs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAdminUsers(), listAdminProjects(), listAuditLogs()])
      .then(([users, projects, logs]) => {
        setStats({
          users: users.total,
          projects: projects.total,
          logs: logs.total,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">ダッシュボード</h1>
      <p className="mt-1 text-sm text-slate-500">管理対象の概要</p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">読み込み中...</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'ユーザー', value: stats.users },
            { label: '案件', value: stats.projects },
            { label: '監査ログ', value: stats.logs },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
