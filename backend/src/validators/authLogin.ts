const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  details: Array<{ field: string; message: string }>;
}

export function validateLoginInput(body: unknown): LoginInput | LoginValidationError {
  if (!body || typeof body !== 'object') {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: [{ field: 'email', message: 'Request body is required' }],
    };
  }

  const record = body as Record<string, unknown>;
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const password = typeof record.password === 'string' ? record.password : '';
  const details: Array<{ field: string; message: string }> = [];

  if (!email || !EMAIL_PATTERN.test(email)) {
    details.push({ field: 'email', message: 'Valid email is required' });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: 'password',
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  if (details.length > 0) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details,
    };
  }

  return { email, password };
}
