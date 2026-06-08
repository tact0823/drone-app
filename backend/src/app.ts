import express from 'express';

import cookieParser from 'cookie-parser';

import { corsMiddleware } from './middleware/cors.js';
import { helmetMiddleware } from './middleware/helmet.js';

import { originCheck } from './middleware/originCheck.js';

import { apiRateLimiter } from './middleware/rateLimit.js';

import { adminRouter } from './routes/admin.js';

import { authRouter } from './routes/auth.js';

import { healthRouter } from './routes/health.js';

import { projectsRouter } from './routes/projects.js';



export function createApp() {

  const app = express();



  app.set('trust proxy', 1);

  app.use(helmetMiddleware());

  app.use(corsMiddleware());

  app.use(cookieParser());

  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', apiRateLimiter);

  app.use('/api/v1', originCheck);

  app.use('/api/v1', healthRouter);

  app.use('/api/v1/auth', authRouter);

  app.use('/api/v1/projects', projectsRouter);

  app.use('/api/v1/admin', adminRouter);



  app.use((_req, res) => {

    res.status(404).json({

      error: {

        code: 'NOT_FOUND',

        message: 'Resource not found',

      },

    });

  });



  app.use(

    (

      err: Error,

      _req: express.Request,

      res: express.Response,

      _next: express.NextFunction,

    ) => {

      console.error(err);

      res.status(500).json({

        error: {

          code: 'INTERNAL_ERROR',

          message: 'An unexpected error occurred',

        },

      });

    },

  );



  return app;

}


