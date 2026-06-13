export function maskEmailForLog(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0) {
    return '***';
  }
  return `***${normalized.slice(at)}`;
}

export function logAuth(message: string): void {
  console.log(`[auth] ${message}`);
}
