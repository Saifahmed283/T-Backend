// Prisma CLI configuration.
//
// Lives here rather than in package.json#prisma, which Prisma 6.19 warns is
// deprecated, and which Prisma 7 removed. `import 'dotenv/config'` is required
// because the CLI no longer loads .env implicitly once this file exists.
//
// In v7 the CLI reads the connection from datasource.url (the schema's own
// url/directUrl are gone): point it at DIRECT_URL so migrate/seed run as the
// owner role while the runtime client uses the least-privilege DATABASE_URL.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // process.env, not env(): env() throws during `prisma generate` when the
    // var is unset (e.g. typecheck-only CI jobs without a database).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})