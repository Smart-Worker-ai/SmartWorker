import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const server = app.listen(env.port, () => {
  console.log(`Workers Portal backend listening on port ${env.port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully`);

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
  process.exit(1);
});