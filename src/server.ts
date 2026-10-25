import { buildApp } from './app.js';
import { config } from './config/config.js';
import { prisma } from './db/prisma.js';
import { fatalLogFields } from './http/errors.js';
import { startContentScheduler, type ContentScheduler } from './modules/content/scheduler.js';

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }

  let scheduler: ContentScheduler | undefined;
  if (config.SCHEDULER_ENABLED) {
    scheduler = startContentScheduler({
      intervalMs: config.SCHEDULER_INTERVAL_MS,
      logger: app.log,
    });
    app.log.info({ intervalMs: config.SCHEDULER_INTERVAL_MS }, 'Scheduled publishing enabled');
  }

  let shuttingDown = false;
  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Shutting down');
    scheduler?.stop();
    await app.close();
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
