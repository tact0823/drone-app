import { useEffect, useState } from 'react';
import { RoleBadge } from '../../components/RoleBadge';
import { useAuth } from '../../hooks/useAuth';
import type { AdminUser } from '../../lib/adminApi';
import { listAdminUsers } from '../../lib/adminApi';

export function AdminUsersPage() {
  const { csrfToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminUsers(csrfToken ?? undefined)
      .then((data) => setUsers(data.users))
      .catch(() => setError('ユーザー一覧の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [csrfToken]);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">ユーザー管理</h1>
      <p className="mt-1 text-sm text-slate-500">登録ユーザーとロール</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">読み込み中...</p>}

      {!loading && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
    </div>
  );
}
