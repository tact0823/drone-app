import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidEmail } from '../validators/email.js';

describe('isValidEmail', () => {
  it('accepts common valid addresses', () => {
    assert.equal(isValidEmail('t.lupinlll@gmail.com'), true);
    assert.equal(isValidEmail('test.user+1@gmail.com'), true);
    assert.equal(isValidEmail('user_name@test.co.jp'), true);
  });

  it('rejects invalid addresses', () => {
    assert.equal(isValidEmail('@gmail.com'), false);
    assert.equal(isValidEmail('test@'), false);
    assert.equal(isValidEmail('test@@gmail.com'), false);
    assert.equal(isValidEmail('.user@gmail.com'), false);
    assert.equal(isValidEmail('user@gmail..com'), false);
  });
});
