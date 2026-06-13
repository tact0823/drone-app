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
  exchangeGoogleCodeWithSteps,
  getGoogleAuthUrl,
  logOAuthFailure,
  logOAuthStep,
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
  const authUrl = getGoogleAuthUrl(state);
  logOAuthStep(`redirect google configured_callback=${env.googleCallbackUrl}`);
  res.redirect(authUrl);
});

authRouter.get('/google/callback', oauthRateLimiter, async (req, res) => {
  logOAuthStep('callback reached');

  const { code, state, error } = req.query;

  if (error === 'access_denied') {
    redirectToLogin(res, 'oauth_denied');
    return;
  }

  const savedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
  clearOAuthStateCookie(res);

  if (!code || typeof code !== 'string') {
    logOAuthFailure('missing_code', new Error('authorization code missing'));
    redirectToLogin(res, 'oauth_failed', 'missing_code');
    return;
  }
  logOAuthStep('code received');
  logOAuthStep(`callback configured_redirect_uri=${env.googleCallbackUrl}`);

  if (!state || typeof state !== 'string' || state !== savedState) {
    logOAuthFailure('state_mismatch', new Error('oauth state mismatch'));
    redirectToLogin(res, 'oauth_failed', 'state_mismatch');
    return;
  }

  let profile;
  try {
    profile = await exchangeGoogleCodeWithSteps(code, logOAuthStep);
  } catch (err) {
    logOAuthFailure('token_exchange', err);
    redirectToLogin(res, 'oauth_failed', 'token_exchange');
    return;
  }

  let user;
  try {
    user = await upsertUserFromGoogle(profile);
    logOAuthStep('user upsert success');
  } catch (err) {
    logOAuthFailure('user_upsert', err);
    redirectToLogin(res, 'oauth_failed', 'user_upsert');
    return;
  }

  let token;
  try {
    token = signToken(user);
    logOAuthStep('jwt created');
  } catch (err) {
    logOAuthFailure('jwt_create', err);
    redirectToLogin(res, 'oauth_failed', 'jwt_create');
    return;
  }

  setTokenCookie(res, token);
  logOAuthStep('cookie set');

  try {
    await recordAuditLog(req, {
      userId: user.id,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: user.id,
    });
  } catch (err) {
    logOAuthFailure('audit_log', err);
  }

  logOAuthStep('redirect auth callback');
  res.redirect(`${env.frontendUrl}/auth/callback`);
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
