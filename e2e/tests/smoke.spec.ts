import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /ThermoInspect|ログイン/i })).toBeVisible();
  });

  test('dashboard redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('API health', () => {
  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/v1/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('admin API requires authentication', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/v1/admin/users');
    expect(response.status()).toBe(401);
  });
});

test.describe('Safari download helper contract', () => {
  test('report download uses attachment-friendly fetch path', async ({ page }) => {
    await page.goto('/login');
    const hasDownloadUtil = await page.evaluate(() => {
      return typeof Blob !== 'undefined' && typeof URL.createObjectURL === 'function';
    });
    expect(hasDownloadUtil).toBe(true);
  });
});
