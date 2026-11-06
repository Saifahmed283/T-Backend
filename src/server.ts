import { buildApp } from './app.js';
import { config } from './config/config.js';
import { prisma } from './db/prisma.js';
import { fatalLogFields } from './http/errors.js';
import { closeCache } from './lib/cache.js';
import { drainJobQueue } from './lib/job-queue.js';
// import { startContentScheduler, type ContentScheduler } from './modules/content/scheduler.js';

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test log to verify server is running
  app.log.info({ port: config.PORT, host: config.HOST }, 'Server started successfully, ready to accept connections');

  // Add a periodic log to verify server stays alive
  const keepAlive = setInterval(() => {
    app.log.debug('Server keep-alive tick');
  }, 30000);
  keepAlive.unref?.();

  // Scheduler disabled for debugging
  // let scheduler: ContentScheduler | undefined;
  // if (config.SCHEDULER_ENABLED) {
  //   scheduler = startContentScheduler({
  //     intervalMs: config.SCHEDULER_INTERVAL_MS,
  //     logger: app.log,
  //   });
  //   app.log.info({ intervalMs: config.SCHEDULER_INTERVAL_MS }, 'Scheduled publishing enabled');
  // }

  let shuttingDown = false;
  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Shutting down');
    clearInterval(keepAlive);
    // scheduler?.stop();
    // Let queued side effects (submission receipts, notices) finish before the
    // process exits; the drain is bounded so a stuck job cannot hang shutdown.
    await drainJobQueue();
    await app.close();
    await closeCache();
    await prisma.$disconnect();
    process.exit(exitCode);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  // Last-resort structured reporting. Request bodies and headers are never
  // included, and process-level failures do not leave the service half-alive.
  const fatal = (event: 'uncaught_exception' | 'unhandled_rejection', error: unknown) => {
    if (shuttingDown) return;
    console.error(JSON.stringify(fatalLogFields(event, error)));
    void shutdown(event, 1);
  };
  process.once('uncaughtException', (error) => fatal('uncaught_exception', error));
  process.once('unhandledRejection', (reason) => fatal('unhandled_rejection', reason));
}

main();
