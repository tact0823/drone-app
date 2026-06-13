process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-security-tests';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.example';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApp } from '../app.js';
import { env, isEmailLoginConfigured, isGoogleOAuthConfigured } from '../config/env.js';
import { createOAuthState, getGoogleAuthUrl } from '../services/authService.js';

async function withServer(
  handler: (baseUrl: string) => Promise<void>,
): Promise<void> {
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

describe('Google OAuth configuration', () => {
  it('detects configured OAuth credentials', () => {
    assert.equal(isGoogleOAuthConfigured(), true);
  });

  it('uses GOOGLE_CALLBACK_URL from environment', () => {
    assert.equal(
      env.googleCallbackUrl,
      'http://localhost:5173/api/v1/auth/google/callback',
    );
  });

  it('builds Google authorization URL with state', () => {
    const state = createOAuthState();
    const url = getGoogleAuthUrl(state);
    assert.match(url, /^https:\/\/accounts\.google\.com\//);
    assert.match(url, /client_id=/);
    assert.match(url, new RegExp(`state=${state}`));
  });
});

describe('Auth routes', () => {
  it('GET /auth/config returns auth status', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/config`);
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        emailLoginEnabled: boolean;
        googleOAuthEnabled: boolean;
        callbackUrl: string;
      };
      assert.equal(body.emailLoginEnabled, isEmailLoginConfigured());
      assert.equal(body.googleOAuthEnabled, true);
      assert.equal(body.callbackUrl, env.googleCallbackUrl);
    });
  });

  it('POST /auth/login rejects invalid input', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'bad', password: 'x' }),
      });
      assert.equal(response.status, 400);
      const body = (await response.json()) as { error: { code: string } };
      assert.equal(body.error.code, 'VALIDATION_ERROR');
    });
  });

  it('POST /auth/login rejects wrong credentials with reason', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nobody@example.com',
          password: 'wrong-password-123',
        }),
      });
      assert.equal(response.status, 401);
      const body = (await response.json()) as { error: { code: string; reason: string; message: string } };
      assert.equal(body.error.code, 'UNAUTHORIZED');
      assert.ok(body.error.reason);
      assert.ok(body.error.message.length > 0);
    });
  });

  it('GET /auth/google redirects to Google', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/google`, { redirect: 'manual' });
      assert.equal(response.status, 302);
      const location = response.headers.get('location') ?? '';
      assert.match(location, /accounts\.google\.com/);
      assert.match(response.headers.get('set-cookie') ?? '', /oauth_state=/);
    });
  });

  it('GET /auth/google/callback rejects missing code', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/auth/google/callback`, {
        redirect: 'manual',
      });
      assert.equal(response.status, 302);
      const location = response.headers.get('location') ?? '';
      assert.match(location, /\/login\?error=oauth_failed/);
    });
  });

  it('GET /auth/google/callback rejects state mismatch', async () => {
    await withServer(async (baseUrl) => {
      const start = await fetch(`${baseUrl}/api/v1/auth/google`, { redirect: 'manual' });
      const cookie = start.headers.get('set-cookie') ?? '';

      const response = await fetch(
        `${baseUrl}/api/v1/auth/google/callback?code=fake-code&state=wrong-state`,
        {
          redirect: 'manual',
          headers: { cookie },
        },
      );
      assert.equal(response.status, 302);
      const location = response.headers.get('location') ?? '';
      assert.match(location, /\/login\?error=oauth_failed/);
      assert.match(location, /reason=state_mismatch/);
    });
  });

  it('GET /auth/google/callback handles access_denied', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/api/v1/auth/google/callback?error=access_denied`,
        { redirect: 'manual' },
      );
      assert.equal(response.status, 302);
      const location = response.headers.get('location') ?? '';
      assert.match(location, /\/login\?error=oauth_denied/);
    });
  });
});
