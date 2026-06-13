import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loginFailureMessage } from '../services/adminUserService.js';

describe('loginFailureMessage', () => {
  it('returns specific messages per failure reason', () => {
    assert.match(loginFailureMessage('password_mismatch'), /パスワードが一致しません/);
    assert.match(loginFailureMessage('user_not_found'), /ユーザーが見つかりません/);
    assert.match(loginFailureMessage('no_password_hash'), /メールログインが有効化されていません/);
  });
});
