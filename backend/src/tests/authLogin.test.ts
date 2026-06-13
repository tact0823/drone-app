import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateLoginInput } from '../validators/authLogin.js';

describe('validateLoginInput', () => {
  it('accepts valid email and password', () => {
    const result = validateLoginInput({
      email: 't.lupinlll@gmail.com',
      password: 'securepass',
    });
    assert.ok(!('code' in result));
    if ('code' in result) return;
    assert.equal(result.email, 't.lupinlll@gmail.com');
    assert.equal(result.password, 'securepass');
  });

  it('accepts plus-addressed email', () => {
    const result = validateLoginInput({
      email: 'test.user+1@gmail.com',
      password: 'securepass',
    });
    assert.ok(!('code' in result));
  });

  it('rejects invalid email', () => {
    for (const email of ['not-an-email', '@gmail.com', 'test@', 'test@@gmail.com']) {
      const result = validateLoginInput({ email, password: 'securepass' });
      assert.ok('code' in result);
      assert.equal(result.code, 'VALIDATION_ERROR');
    }
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
