import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { RoleBadge } from '../components/RoleBadge';
import { useAuth } from '../hooks/useAuth';
import type { AdminProject, AdminUser, AuditLogRecord } from '../lib/adminApi';
import { listAdminProjects, listAdminUsers, listAuditLogs } from '../lib/adminApi';

type AdminTab = 'users' | 'projects' | 'audit';

export function AdminPage() {
  const { csrfToken } = useAuth();
  const [tab, setTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const token = csrfToken ?? undefined;

    const load =
      tab === 'users'
        ? listAdminUsers(token).then((data) => setUsers(data.users))
        : tab === 'projects'
          ? listAdminProjects(token).then((data) => setProjects(data.projects))
          : listAuditLogs(token).then((data) => setLogs(data.logs));

    load
      .catch(() => setError('データの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [tab, csrfToken]);

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'users', label: 'ユーザー一覧' },
    { id: 'projects', label: 'プロジェクト一覧' },
    { id: 'audit', label: '監査ログ' },
  ];

  return (
    <AppLayout>
      <h1 className="text-xl font-bold text-slate-900">管理者コンソール</h1>
      <p className="mt-1 text-sm text-slate-500">ユーザー・プロジェクト・監査ログの閲覧</p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-11 border-b-2 px-4 py-2 text-sm font-medium ${
              tab === item.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">読み込み中...</p>}

      {!loading && tab === 'users' && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">名前</th>
                <th className="px-4 py-3">メール</th>
                <th className="px-4 py-3">ロール</th>
                <th className="px-4 py-3">登録日</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'projects' && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">プロジェクト</th>
                <th className="px-4 py-3">現場</th>
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

      {!loading && tab === 'audit' && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">日時</th>
                <th className="px-4 py-3">ユーザー</th>
                <th className="px-4 py-3">操作</th>
                <th className="px-4 py-3">リソース</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-3">
                    {log.userName ?? '—'}
                    {log.userEmail && (
                      <span className="block text-xs text-slate-500">{log.userEmail}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3 text-xs">
                    {log.resourceType ?? '—'}
                    {log.resourceId && (
                      <span className="block text-slate-500">{log.resourceId.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{log.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
