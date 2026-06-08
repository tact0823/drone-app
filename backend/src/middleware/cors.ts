import cors from 'cors';
import type { CorsOptions } from 'cors';
import { env } from '../config/env.js';

const allowedOrigins: Record<string, string[]> = {
  development: ['http://localhost:5173'],
  production: [env.frontendUrl],
};

export function corsMiddleware() {
  const options: CorsOptions = {
    origin: (origin, callback) => {
      const envKey = env.isProduction ? 'production' : 'development';
      const allowed = allowedOrigins[envKey] ?? [];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  };

  return cors(options);
}
