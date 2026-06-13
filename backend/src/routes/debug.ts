import { Router } from 'express';
import { env } from '../config/env.js';

export const debugRouter = Router();

const GOOGLE_CLIENT_ID_DOMAIN_SUFFIX = '.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET_PREFIX = 'GOCSPX-';

function getGoogleClientIdSuffix(clientId: string): string {
  return clientId.slice(-12);
}

debugRouter.get('/oauth-config', (_req, res) => {
  const { googleClientId, googleClientSecret, googleCallbackUrl, frontendUrl, nodeEnv } = env;

  res.json({
    googleClientIdExists: googleClientId.length > 0,
    googleClientIdLength: googleClientId.length,
    googleClientIdEndsWith: googleClientId.endsWith(GOOGLE_CLIENT_ID_DOMAIN_SUFFIX),
    googleClientIdSuffix: getGoogleClientIdSuffix(googleClientId),
    googleClientSecretExists: googleClientSecret.length > 0,
    googleClientSecretLength: googleClientSecret.length,
    googleClientSecretStartsWithGOCSPX: googleClientSecret.startsWith(GOOGLE_CLIENT_SECRET_PREFIX),
    googleCallbackUrl,
    frontendUrl,
    nodeEnv,
  });
});
