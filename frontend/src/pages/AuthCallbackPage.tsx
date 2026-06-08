import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AuthCallbackPage() {
  const { user, refresh } = useAuth();
  const [failed, setFailed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    refresh()
      .then(() => setChecked(true))
      .catch(() => setFailed(true));
  }, [refresh]);

  if (failed) {
    return <Navigate to="/login?error=cookie_blocked" replace />;
  }

  if ((checked && user) || user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">ログイン処理中...</p>
    </div>
  );
}
