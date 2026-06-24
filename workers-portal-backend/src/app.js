import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';

import { v1Router } from './routes/v1/index.js';
import { apiErrorHandler } from './middlewares/error-handler.js';

function createApp() {
  const app = express();

  app.use(helmet());
  // Mobile apps (Flutter/Android) don't send Origin headers — allow all origins in production
  const corsOrigin = env.corsOrigins.includes('*') ? true : env.corsOrigins;
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/', (_request, response) => {
    response.json({
      service: 'workers-portal-backend',
      status: 'ok',
      environment: env.nodeEnv
    });
  });

  app.get('/health', (_request, response) => {
    response.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api/v1', v1Router);
  app.use(apiErrorHandler);

  return app;
}

export { createApp };
