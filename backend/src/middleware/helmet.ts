import helmet from 'helmet';
import { env } from '../config/env.js';

export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: env.isProduction ? undefined : false,
  });
}
