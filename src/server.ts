import { buildApp } from './app.js'
import { config } from './config/config.js'
import { prisma } from './db/prisma.js'

const app = await buildApp()
try {
  await app.listen({ port: config.PORT, host: config.HOST })
} catch (error) {
  app.log.error(error)
  await prisma.$disconnect()
  process.exit(1)
}

const shutdown = async () => {
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
