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
  details?: Array<{ field: string; message: string }>;

  constructor(code: string, message: string, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const code = data?.error?.code ?? 'UNKNOWN';
    const message = data?.error?.message ?? 'Request failed';
    throw new ApiError(code, message, data?.error?.details);
  }

  return data as T;
}

export function getMe(): Promise<MeResponse> {
  return fetchApi<MeResponse>('/api/v1/auth/me');
}

export function logout(csrfToken?: string): Promise<void> {
  return fetchApi<void>('/api/v1/auth/logout', {
    method: 'POST',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
  });
}

export function startGoogleLogin(): void {
  window.location.href = '/api/v1/auth/google';
}
