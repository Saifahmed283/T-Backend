import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/security/passwords.js'
import { seedContent } from './content-seed.js'

// Seeding writes columns the runtime role cannot touch (User.email, ActivityLog inserts),
// so it must run as the migration owner via DIRECT_URL.
// The runtime client (src/db/prisma.ts) uses DATABASE_URL, which is least-privilege.
if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL is required to seed; the runtime role cannot write seed data')
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) })

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password || password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be set to at least 12 characters before seeding')
  }
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@askterramorph.com').toLowerCase()
  const adminHash = await hashPassword(password)

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'terramorph' },
    update: {},
    create: { name: 'TerraMorph', slug: 'terramorph' },
  })

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash },
    create: { email: adminEmail, name: 'Platform Admin', passwordHash: adminHash },
  })
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: admin.id } },
    update: { role: 'admin' },
    create: { workspaceId: workspace.id, userId: admin.id, role: 'admin' },
  })

  // Public-site content: every collection the marketing site reads through
  // /api/v1/public/content. Published immediately so the CMS is not empty on a
  // fresh install; editors can revise or unpublish from the dashboard.
  const contentCounts = await seedContent(prisma, workspace.id, admin.id)

  const contentTotal = Object.values(contentCounts).reduce((sum, count) => sum + count, 0)
  console.log(`Seeded workspace "${workspace.slug}": admin user only (no legacy demo data).`)
  console.log(
    `Seeded ${contentTotal} published content items: ${Object.entries(contentCounts)
      .map(([id, count]) => `${id} ${count}`)
      .join(', ')}.`,
  )
  console.log(`Sign in as ${adminEmail} with SEED_ADMIN_PASSWORD.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())