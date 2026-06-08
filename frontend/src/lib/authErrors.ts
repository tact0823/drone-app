export type AuthErrorCode =
  | 'oauth_denied'
  | 'oauth_failed'
  | 'oauth_not_configured'
  | 'cookie_blocked'
  | 'session_expired'
  | 'state_mismatch';

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  oauth_denied:
    'Google ログインがキャンセルされました。もう一度お試しください。',
  oauth_failed:
    'ログインに失敗しました。しばらく待ってから再度お試しください。',
  oauth_not_configured:
    'Google OAuth が未設定です。管理者に GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET の設定を依頼してください。',
  cookie_blocked:
    'Safari のプライバシー設定によりログインできませんでした。Safari の設定 > プライバシー > 「サイト越えトラッキングを防ぐ」をオフにするか、Chrome をお試しください。',
  session_expired: 'セッションの有効期限が切れました。再度ログインしてください。',
  state_mismatch:
    'セキュリティエラーが発生しました。もう一度ログインしてください。',
};

export function isAuthErrorCode(value: string | null): value is AuthErrorCode {
  return value !== null && value in AUTH_ERROR_MESSAGES;
}
