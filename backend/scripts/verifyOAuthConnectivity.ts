/**
 * Google OAuth 疎通確認 — 設定 / ログインURL / callback ルート / DB ユーザー
 * Usage: npm run verify:oauth
 */
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { env, isGoogleOAuthConfigured } from '../src/config/env.js';
import { getPool } from '../src/db/pool.js';
import { signToken, verifyToken } from '../src/services/authService.js';

interface StepResult {
  step: string;
  ok: boolean;
  detail: string;
}

const results: StepResult[] = [];

function record(step: string, ok: boolean, detail: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${step}: ${detail}`);
}

function maskClientId(clientId: string): string {
  if (clientId.length <= 12) return '***';
  return `${clientId.slice(0, 8)}...${clientId.slice(-8)}`;
}

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

async function main() {
  console.log('\n=== Google OAuth Connectivity Test ===\n');

  record(
    '1. OAuth 設定',
    isGoogleOAuthConfigured(),
    isGoogleOAuthConfigured()
      ? `clientId=${maskClientId(env.googleClientId)}, callback=${env.googleCallbackUrl}`
      : 'GOOGLE_CLIENT_ID/SECRET が未設定',
  );

  if (!isGoogleOAuthConfigured()) {
    printSummary();
    process.exit(1);
  }

  await withServer(async (baseUrl) => {
    const configRes = await fetch(`${baseUrl}/api/v1/auth/config`);
    const config = (await configRes.json()) as {
      googleOAuthEnabled: boolean;
      callbackUrl: string;
    };
    record(
      '2. /auth/config',
      configRes.ok && config.googleOAuthEnabled && config.callbackUrl === env.googleCallbackUrl,
      JSON.stringify(config),
    );

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/google`, { redirect: 'manual' });
    const location = loginRes.headers.get('location') ?? '';
    const loginOk =
      loginRes.status === 302 &&
      location.includes('accounts.google.com') &&
      location.includes(encodeURIComponent(env.googleCallbackUrl));
    record(
      '3. ログインURL (/auth/google)',
      loginOk,
      loginOk
        ? `302 → Google (redirect_uri=${env.googleCallbackUrl})`
        : `status=${loginRes.status}, location=${location.slice(0, 120)}...`,
    );

    const callbackRes = await fetch(`${baseUrl}/api/v1/auth/google/callback`, {
      redirect: 'manual',
    });
    record(
      '4. callback ルート (code なし)',
      callbackRes.status === 302 && (callbackRes.headers.get('location') ?? '').includes('oauth_failed'),
      `302 → /login?error=oauth_failed (expected without code)`,
    );

    const deniedRes = await fetch(
      `${baseUrl}/api/v1/auth/google/callback?error=access_denied`,
      { redirect: 'manual' },
    );
    record(
      '4b. callback (access_denied)',
      (deniedRes.headers.get('location') ?? '').includes('oauth_denied'),
      '302 → /login?error=oauth_denied',
    );
  });

  const testUserId = 'oauth-verify-test-user';
  const token = signToken({ id: testUserId, role: 'operator' });
  const payload = verifyToken(token);
  record(
    '6. セッション (JWT)',
    payload.sub === testUserId && payload.role === 'operator',
    `sign/verify OK — sub=${payload.sub}, role=${payload.role}`,
  );

  try {
    const pool = getPool();
    const countResult = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
    const userCount = Number(countResult.rows[0]?.count ?? 0);
    record(
      '5. ユーザー (DB)',
      userCount >= 0,
      `${userCount} users in DB — 初回 Google ログイン後に 1 件増加（ブラウザ確認）`,
    );
    await pool.end();
  } catch (error) {
    record('5. ユーザー (DB)', false, String(error));
  }

  printSummary();

  if (results.some((item) => !item.ok)) {
    process.exit(1);
  }
}

function printSummary() {
  const passed = results.filter((item) => item.ok).length;
  console.log(`\n=== Summary: ${passed}/${results.length} passed ===\n`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
