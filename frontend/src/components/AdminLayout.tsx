import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/admin', label: 'ダッシュボード', end: true },
  { to: '/admin/customers', label: '顧客管理' },
  { to: '/admin/projects', label: '案件管理' },
  { to: '/admin/reports', label: '報告書管理' },
  { to: '/admin/users', label: 'ユーザー管理' },
  { to: '/admin/ai-settings', label: 'AI設定' },
];

export function AdminLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-bold text-slate-900">ThermoInspect 管理画面</p>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
          <NavLink
            to="/dashboard"
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            アプリに戻る
          </NavLink>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `min-h-11 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main>{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
