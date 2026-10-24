import { buildApp } from './app.js';
import { config } from './config/config.js';
import { prisma } from './db/prisma.js';

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();