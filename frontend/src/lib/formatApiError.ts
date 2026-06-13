import { ApiError } from './api';

export function formatApiError(error: ApiError): string {
  const lines = [error.message];

  const meta: string[] = [];
  if (error.code && error.code !== 'HTTP_ERROR') {
    meta.push(`code: ${error.code}`);
  }
  if (error.reason) {
    meta.push(`reason: ${error.reason}`);
  }
  if (meta.length > 0) {
    lines.push(`(${meta.join(', ')})`);
  }

  if (error.details?.length) {
    for (const detail of error.details) {
      lines.push(`${detail.field}: ${detail.message}`);
    }
  }

  return lines.join('\n');
}

export function formatUnknownError(error: unknown): string {
  if (error instanceof ApiError) {
    return formatApiError(error);
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'API に接続できません。VITE_API_BASE_URL と CORS 設定を確認してください。';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'ログインに失敗しました。しばらくしてから再度お試しください。';
}
