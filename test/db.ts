import type { PrismaClient } from '../src/generated/prisma/client.js'

/*
 * Whole-schema reset for the integration suite.
 *
 * The test database is shared by every test file and lives on Neon, so it
 * survives between `npm test` runs. Leaving rows behind makes the next run fail
 * on unique constraints and foreign keys, so every reset truncates the whole
 * public schema in one statement: CASCADE covers the FK order and RESTART
 * IDENTITY resets sequences. `_prisma_migrations` is deliberately excluded so
 * Prisma never re-applies a migration the schema already has.
 *
 * Errors are not swallowed. A reset that silently does nothing is worse than a
 * failed run, because it poisons every later run instead of this one.
 */
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `

  if (tables.length === 0) return

  const targets = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${targets} RESTART IDENTITY CASCADE`)
}
