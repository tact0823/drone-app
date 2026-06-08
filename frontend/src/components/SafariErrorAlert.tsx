import { AUTH_ERROR_MESSAGES, isAuthErrorCode } from '../lib/authErrors';

interface SafariErrorAlertProps {
  errorCode: string | null;
}

export function SafariErrorAlert({ errorCode }: SafariErrorAlertProps) {
  if (!errorCode || !isAuthErrorCode(errorCode)) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {AUTH_ERROR_MESSAGES[errorCode]}
    </div>
  );
}
