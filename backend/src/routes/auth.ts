import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateCsrf } from '../middleware/csrf.js';
import { oauthRateLimiter } from '../middleware/oauthRateLimit.js';
import { recordAuditLog } from '../services/auditService.js';
import {
  OAUTH_STATE_COOKIE,
  clearOAuthStateCookie,
  clearTokenCookie,
  createCsrfToken,
  createOAuthState,
  exchangeGoogleCode,
  getGoogleAuthUrl,
  redirectToLogin,
  setOAuthStateCookie,
  setTokenCookie,
  signToken,
  toPublicUser,
} from '../services/authService.js';
import { findUserById, upsertUserFromGoogle } from '../services/userService.js';
import { env, isGoogleOAuthConfigured } from '../config/env.js';

export const authRouter = Router();

authRouter.get('/google', oauthRateLimiter, (_req, res) => {
  if (!isGoogleOAuthConfigured()) {
    redirectToLogin(res, 'oauth_not_configured');
    return;
  }

  const state = createOAuthState();
  setOAuthStateCookie(res, state);
  res.redirect(getGoogleAuthUrl(state));
});

authRouter.get('/google/callback', oauthRateLimiter, async (req, res) => {
  const { code, state, error } = req.query;

  if (error === 'access_denied') {
    redirectToLogin(res, 'oauth_denied');
    return;
  }

  const savedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
  clearOAuthStateCookie(res);

  if (!code || typeof code !== 'string') {
    redirectToLogin(res, 'oauth_failed');
    return;
  }

  if (!state || typeof state !== 'string' || state !== savedState) {
    redirectToLogin(res, 'state_mismatch');
    return;
  }

  try {
    const profile = await exchangeGoogleCode(code);
    const user = await upsertUserFromGoogle(profile);
    const token = signToken(user);
    setTokenCookie(res, token);
    await recordAuditLog(req, {
      userId: user.id,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: user.id,
    });
    res.redirect(`${env.frontendUrl}/auth/callback`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    redirectToLogin(res, 'oauth_failed');
  }
});

authRouter.post('/logout', authenticate, validateCsrf, async (req, res) => {
  await recordAuditLog(req, { action: 'auth.logout', resourceType: 'user', resourceId: req.user!.id });
  clearTokenCookie(res);
  res.status(204).send();
});

authRouter.get('/config', (_req, res) => {
  res.json({
    googleOAuthEnabled: isGoogleOAuthConfigured(),
    callbackUrl: env.googleCallbackUrl,
  });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await findUserById(req.user!.id);
  if (!user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    return;
  }

  res.json({
    user: toPublicUser(user),
    csrfToken: createCsrfToken(user.id),
  });
});
