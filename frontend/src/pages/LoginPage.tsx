import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { SafariErrorAlert } from '../components/SafariErrorAlert';
import { useAuth } from '../hooks/useAuth';
import { ApiError, loginWithEmail } from '../lib/api';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorCode = searchParams.get('error');
  const errorReason = searchParams.get('reason');
  const errorStep = searchParams.get('step');
  const googleError = searchParams.get('google_error');
  const { user, loading, refresh } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await loginWithEmail(email.trim(), password);
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('ログインに失敗しました。しばらくしてから再度お試しください。');
      }
    } finally {
      setSubmitting(false);
    }
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
            <div className="mb-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {errorStep && <p>失敗ステップ: {errorStep}</p>}
              {errorReason && errorReason !== errorStep && <p>原因: {errorReason}</p>}
              {googleError && <p>Google エラー: {googleError}</p>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'ログイン中…' : 'ログイン'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">または</span>
            </div>
          </div>

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-400"
            style={{ WebkitAppearance: 'none' }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-400">
              G
            </span>
            Google でログイン（現在調整中）
          </button>
        </div>
      </div>
    </div>
  );
}
