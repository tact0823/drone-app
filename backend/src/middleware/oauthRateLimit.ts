import rateLimit from 'express-rate-limit';

export const oauthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many OAuth attempts. Please try again later.',
    },
  },
});
