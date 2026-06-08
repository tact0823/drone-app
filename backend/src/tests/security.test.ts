process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-security-tests';

import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';
import { createCsrfToken, verifyCsrfToken } from '../services/authService.js';

describe('CSRF token', () => {
  it('validates a freshly issued token', () => {
    const userId = 'user-123';
    const token = createCsrfToken(userId);
    assert.equal(verifyCsrfToken(userId, token), true);
  });

  it('rejects tampered token', () => {
    const userId = 'user-123';
    const token = createCsrfToken(userId);
    assert.equal(verifyCsrfToken(userId, `${token}x`), false);
    assert.equal(verifyCsrfToken('other-user', token), false);
  });

  it('rejects malformed token', () => {
    assert.equal(verifyCsrfToken('user', 'invalid'), false);
  });

  it('uses HMAC signature contract', () => {
    const userId = 'user-abc';
    const token = createCsrfToken(userId);
    const [nonce, signature] = token.split('.');
    const expected = createHmac('sha256', process.env.JWT_SECRET!)
      .update(`${userId}:${nonce}`)
      .digest('hex');
    assert.equal(signature, expected);
  });
});
