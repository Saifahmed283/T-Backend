// Prisma CLI configuration.
//
// Lives here rather than in package.json#prisma, which Prisma 6.19 warns is
// deprecated. `import 'dotenv/config'` is required because the CLI no longer
// loads .env implicitly once this file exists.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})