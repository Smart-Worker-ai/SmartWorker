/**
 * Worker process entry point.
 * Starts all message send workers and the scheduler.
 */

import { logger } from '../utils/logger';
import { initializeProviders } from '../providers';
import { startWorkers } from './sendWorker';
import { startScheduler } from './scheduler';

async function main(): Promise<void> {
  logger.info('Starting SMS Gateway worker process...');

  initializeProviders();
  startWorkers();
  startScheduler();

  logger.info('Worker process ready');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Worker shutdown signal received');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.error('Worker process failed to start', { error: error.message });
  process.exit(1);
});
