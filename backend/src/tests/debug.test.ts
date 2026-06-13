process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-security-tests';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5173/api/v1/auth/google/callback';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApp } from '../app.js';
import { env } from '../config/env.js';

async function withServer(handler: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : env.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await handler(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('Debug routes', () => {
  it('GET /debug/oauth-config returns safe OAuth metadata only', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/debug/oauth-config`);
      assert.equal(response.status, 200);
      const body = (await response.json()) as Record<string, unknown>;
      const serialized = JSON.stringify(body);

      assert.equal(body.googleClientIdExists, true);
      assert.equal(typeof body.googleClientIdLength, 'number');
      assert.equal(typeof body.googleClientIdEndsWith, 'boolean');
      assert.equal(body.googleClientSecretExists, true);
      assert.equal(typeof body.googleClientSecretLength, 'number');
      assert.equal(typeof body.googleClientSecretStartsWithGOCSPX, 'boolean');
      assert.equal(body.googleCallbackUrl, env.googleCallbackUrl);
      assert.equal(body.frontendUrl, env.frontendUrl);
      assert.match(String(body.nodeEnv), /^(development|production|test)$/);

      assert.doesNotMatch(serialized, /GOCSPX-[A-Za-z0-9_-]+/);
      assert.doesNotMatch(serialized, /apps\.googleusercontent\.com/);
      assert.doesNotMatch(serialized, /sk-proj-/);
    });
  });
});
