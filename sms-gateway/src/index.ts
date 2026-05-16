/**
 * SMS Gateway API — main application entry point.
 * Sets up Express with all middleware, routes, and graceful shutdown.
 */

import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { config } from './config';
import { logger } from './utils/logger';
import { runMigrations, closeDb } from './models/database';
import { closeRedis } from './models/redis';
import { initializeProviders } from './providers';
import { closeQueues } from './queue';

import { hmacAuth } from './api/middleware/auth';
import { errorHandler, correlationId } from './api/middleware/errorHandler';
import otpRoutes from './api/routes/otp';
import messageRoutes from './api/routes/messages';
import webhookRoutes from './api/routes/webhooks';
import healthRoutes from './api/routes/health';

async function main(): Promise<void> {
  logger.info('Starting SMS Gateway API...');

  // Run database migrations
  await runMigrations();

  // Initialize SMS providers
  initializeProviders();

  // Create Express app
  const app = express();

  // Global middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(correlationId);

  // Request logging (skip health checks in production)
  app.use(morgan('short', {
    skip: (req) => config.isProduction && req.path.startsWith('/health'),
    stream: { write: (msg: string) => logger.info(msg.trim()) },
  }));

  // Public routes (no auth)
  app.use('/', healthRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);

  // Authenticated routes
  app.use('/api/v1/otp', hmacAuth, otpRoutes);
  app.use('/api/v1/messages', hmacAuth, messageRoutes);

  // Error handler (must be last)
  app.use(errorHandler);

  // Start server
  const server = app.listen(config.server.port, () => {
    logger.info(`SMS Gateway API running on port ${config.server.port}`);
    logger.info(`Environment: ${config.env}`);
    logger.info(`Health check: ${config.server.baseUrl}/health`);
    logger.info(`Metrics: ${config.server.baseUrl}/metrics`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — starting graceful shutdown`);

    server.close(async () => {
      logger.info('HTTP server closed');
      await closeQueues();
      await closeRedis();
      await closeDb();
      logger.info('All connections closed — exiting');
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

main().catch((error) => {
  logger.error('Failed to start SMS Gateway API', { error: error.message });
  process.exit(1);
});
