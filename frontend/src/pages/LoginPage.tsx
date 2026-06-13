import { Navigate, useSearchParams } from 'react-router-dom';
import { SafariErrorAlert } from '../components/SafariErrorAlert';
import { useAuth } from '../hooks/useAuth';
import { startGoogleLogin } from '../lib/api';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('error');
  const errorReason = searchParams.get('reason');
  const errorStep = searchParams.get('step');
  const googleError = searchParams.get('google_error');
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">ThermoInspect Report</h1>
        <p className="mt-2 text-sm text-slate-600">
          ドローン赤外線点検 — 営業支援型報告書 Web アプリ
        </p>

        <div className="mt-6">
          <SafariErrorAlert errorCode={errorCode} />
          {errorCode === 'oauth_failed' && (errorStep || errorReason || googleError) && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1">
              {errorStep && <p>失敗ステップ: {errorStep}</p>}
              {errorReason && errorReason !== errorStep && <p>原因: {errorReason}</p>}
              {googleError && <p>Google エラー: {googleError}</p>}
            </div>
          )}

          <button
            type="button"
            onClick={startGoogleLogin}
            className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
            style={{ WebkitAppearance: 'none' }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">
              G
            </span>
            Google でログイン
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            初回ログイン時にアカウントが自動作成されます
          </p>
        </div>
      </div>
    </div>
  );
}
