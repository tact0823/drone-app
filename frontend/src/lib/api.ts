export type UserRole = 'operator' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
}

export interface MeResponse {
  user: User;
  csrfToken: string;
}

export class ApiError extends Error {
  code: string;
  reason?: string;
  details?: Array<{ field: string; message: string }>;

  constructor(
    code: string,
    message: string,
    details?: Array<{ field: string; message: string }>,
    reason?: string,
  ) {
    super(message);
    this.code = code;
    this.reason = reason;
    this.details = details;
  }
}

const MISSING_API_BASE_URL_MESSAGE =
  'VITE_API_BASE_URL が未設定です。Vercel Environment Variables に Railway バックエンド URL を設定してください（例: https://drone-app-production-54a7.up.railway.app）';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function getConfiguredApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL;
  return value ? normalizeBaseUrl(value) : '';
}

/** Railway / ローカルバックエンド origin（OAuth 開始など） */
export function resolveApiBaseUrl(): string {
  const configured = getConfiguredApiBaseUrl();

  if (import.meta.env.DEV) {
    return configured || 'http://localhost:3000';
  }

  if (!configured) {
    throw new Error(MISSING_API_BASE_URL_MESSAGE);
  }

  return configured;
}

/** API リクエスト URL（本番は Railway 直、ローカル dev は Vite プロキシ可） */
export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (import.meta.env.DEV && !getConfiguredApiBaseUrl()) {
    return normalizedPath;
  }

  return `${resolveApiBaseUrl()}${normalizedPath}`;
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const code = data?.error?.code ?? 'HTTP_ERROR';
    const message =
      data?.error?.message ?? `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    throw new ApiError(code, message, data?.error?.details, data?.error?.reason);
  }

  return data as T;
}

export function getMe(): Promise<MeResponse> {
  return fetchApi<MeResponse>('/api/v1/auth/me');
}

export function loginWithEmail(email: string, password: string): Promise<MeResponse> {
  return fetchApi<MeResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout(csrfToken?: string): Promise<void> {
  return fetchApi<void>('/api/v1/auth/logout', {
    method: 'POST',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
  });
}

export function startGoogleLogin(): void {
  try {
    window.location.href = `${resolveApiBaseUrl()}/api/v1/auth/google`;
  } catch (error) {
    const message = error instanceof Error ? error.message : MISSING_API_BASE_URL_MESSAGE;
    window.alert(message);
  }
}
