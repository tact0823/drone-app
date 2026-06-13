import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validateCsrf } from '../middleware/csrf.js';
import { loginRateLimiter } from '../middleware/loginRateLimit.js';
import { oauthRateLimiter } from '../middleware/oauthRateLimit.js';
import { authenticateWithEmailPassword, loginFailureMessage } from '../services/adminUserService.js';
import { logAuth, maskEmailForLog } from '../services/emailAuthLog.js';
import { validateLoginInput } from '../validators/authLogin.js';
import { recordAuditLog } from '../services/auditService.js';
import {
  OAUTH_STATE_COOKIE,
  classifyGoogleOAuthFailure,
  clearOAuthStateCookie,
  clearTokenCookie,
  createCsrfToken,
  createOAuthState,
  exchangeGoogleCodeWithSteps,
  extractGoogleOAuthError,
  getGoogleAuthUrl,
  getGoogleOAuthRedirectUri,
  logOAuthFailure,
  logOAuthStep,
  redirectToLogin,
  sanitizeGoogleErrorForClient,
  setOAuthStateCookie,
  setTokenCookie,
  signToken,
  toPublicUser,
} from '../services/authService.js';
import { findUserById, upsertUserFromGoogle } from '../services/userService.js';
import { env, isEmailLoginConfigured, isGoogleOAuthConfigured } from '../config/env.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, async (req, res) => {
  const validated = validateLoginInput(req.body);
  if ('code' in validated) {
    logAuth('login failed reason=validation_error');
    res.status(400).json({
      error: {
        code: validated.code,
        message: validated.message,
        reason: 'validation_error',
        details: validated.details,
      },
    });
    return;
  }

  logAuth(`login attempt email=${maskEmailForLog(validated.email)}`);
  const attempt = await authenticateWithEmailPassword(validated.email, validated.password);
  logAuth(`admin user found=${attempt.userFound}`);
  if (attempt.passwordMatch !== null) {
    logAuth(`password match=${attempt.passwordMatch}`);
  }

  if (!attempt.user) {
    logAuth(`login failed reason=${attempt.failureReason ?? 'unknown'}`);
    try {
      await recordAuditLog(req, {
        action: 'auth.login_failed',
        resourceType: 'user',
        details: { email: validated.email, reason: attempt.failureReason },
      });
    } catch (err) {
      logOAuthFailure('audit_log', err);
    }
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: loginFailureMessage(attempt.failureReason),
        reason: attempt.failureReason ?? 'unknown',
      },
    });
    return;
  }

  let token;
  try {
    token = signToken(attempt.user);
  } catch (err) {
    logOAuthFailure('jwt_create', err);
    logAuth('login failed reason=jwt_create');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create session',
        reason: 'jwt_create',
      },
    });
    return;
  }

  setTokenCookie(res, token);
  logAuth('cookie set');

  try {
    await recordAuditLog(req, {
      userId: attempt.user.id,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: attempt.user.id,
      details: { method: 'email' },
    });
  } catch (err) {
    logOAuthFailure('audit_log', err);
  }

  logAuth('login success');
  res.json({
    user: toPublicUser(attempt.user),
    csrfToken: createCsrfToken(attempt.user.id),
  });
});

authRouter.get('/google', oauthRateLimiter, (_req, res) => {
  if (!isGoogleOAuthConfigured()) {
    redirectToLogin(res, 'oauth_not_configured');
    return;
  }

  const state = createOAuthState();
  setOAuthStateCookie(res, state);
  const authUrl = getGoogleAuthUrl(state);
  logOAuthStep(`redirect google redirect_uri=${getGoogleOAuthRedirectUri()}`);
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
    redirectToLogin(res, 'oauth_failed', { reason: 'missing_code', step: 'missing_code' });
    return;
  }
  logOAuthStep('code received');
  logOAuthStep(`callback redirect_uri=${getGoogleOAuthRedirectUri()}`);

  if (!state || typeof state !== 'string' || state !== savedState) {
    logOAuthFailure('state_mismatch', new Error('oauth state mismatch'));
    redirectToLogin(res, 'oauth_failed', { reason: 'state_mismatch', step: 'state_mismatch' });
    return;
  }

  let profile;
  try {
    profile = await exchangeGoogleCodeWithSteps(code, logOAuthStep);
  } catch (err) {
    const { googleError, googleErrorDescription } = extractGoogleOAuthError(err);
    const reason = classifyGoogleOAuthFailure(googleError, googleErrorDescription);
    const publicGoogleError =
      reason === 'redirect_uri_mismatch' ||
      reason === 'invalid_client' ||
      reason === 'invalid_grant'
        ? reason
        : sanitizeGoogleErrorForClient(googleError);
    logOAuthFailure('token_exchange', err);
    redirectToLogin(res, 'oauth_failed', {
      step: 'token_exchange',
      reason,
      googleError: publicGoogleError,
    });
    return;
  }

  let user;
  try {
    user = await upsertUserFromGoogle(profile);
    logOAuthStep('user upsert success');
  } catch (err) {
    logOAuthFailure('user_upsert', err);
    redirectToLogin(res, 'oauth_failed', { reason: 'user_upsert', step: 'user_upsert' });
    return;
  }

  let token;
  try {
    token = signToken(user);
    logOAuthStep('jwt created');
  } catch (err) {
    logOAuthFailure('jwt_create', err);
    redirectToLogin(res, 'oauth_failed', { reason: 'jwt_create', step: 'jwt_create' });
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
    emailLoginEnabled: isEmailLoginConfigured(),
    googleOAuthEnabled: isGoogleOAuthConfigured(),
    callbackUrl: env.googleCallbackUrl || null,
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
