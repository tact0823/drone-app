import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateLoginInput } from '../validators/authLogin.js';

describe('validateLoginInput', () => {
  it('accepts valid email and password', () => {
    const result = validateLoginInput({
      email: 'Admin@Example.com',
      password: 'securepass',
    });
    assert.ok(!('code' in result));
    if ('code' in result) return;
    assert.equal(result.email, 'admin@example.com');
    assert.equal(result.password, 'securepass');
  });

  it('rejects invalid email', () => {
    const result = validateLoginInput({ email: 'not-an-email', password: 'securepass' });
    assert.ok('code' in result);
    assert.equal(result.code, 'VALIDATION_ERROR');
  });

  it('rejects short password', () => {
    const result = validateLoginInput({ email: 'admin@example.com', password: 'short' });
    assert.ok('code' in result);
    assert.equal(result.code, 'VALIDATION_ERROR');
  });

  it('rejects missing body', () => {
    const result = validateLoginInput(null);
    assert.ok('code' in result);
    assert.equal(result.code, 'VALIDATION_ERROR');
  });
});
