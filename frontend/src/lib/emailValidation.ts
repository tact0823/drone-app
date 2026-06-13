const LOCAL_PART_PATTERN = /^[a-zA-Z0-9._+-]+$/;
const DOMAIN_PART_PATTERN = /^[a-zA-Z0-9.-]+$/;

/** Validates common RFC-style email addresses used in practice. */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) {
    return false;
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [local, domain] = parts;
  if (!local || !domain) {
    return false;
  }

  if (
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !LOCAL_PART_PATTERN.test(local)
  ) {
    return false;
  }

  if (
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..') ||
    !DOMAIN_PART_PATTERN.test(domain)
  ) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2 || labels.some((label) => label.length === 0)) {
    return false;
  }

  const tld = labels[labels.length - 1]!;
  return tld.length >= 2;
}
