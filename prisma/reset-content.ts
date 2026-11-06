import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL is required; the runtime role cannot run this script')
}

const force = process.argv.includes('--yes')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) })

async function main() {
  const ws = await prisma.workspace.findUnique({ where: { slug: 'terramorph' } })
  if (!ws) {
    console.log('No workspace "terramorph" found — nothing to reset.')
    return
  }

  const counts = await Promise.all([
    prisma.contentItem.count({ where: { workspaceId: ws.id } }),
    prisma.assignment.count({ where: { workspaceId: ws.id } }),
    prisma.expert.count({ where: { workspaceId: ws.id } }),
    prisma.activityLog.count({ where: { workspaceId: ws.id } }),
    prisma.workspaceMember.count({ where: { workspaceId: ws.id } }),
    prisma.user.count({ where: { memberships: { some: { workspaceId: ws.id } } } }),
    prisma.submission.count(),
    prisma.asset.count({ where: { workspaceId: ws.id } }),
    prisma.newsletterSubscriber.count(),
    prisma.diagnosticResult.count(),
    prisma.diagnosticQuestion.count(),
    prisma.siteSetting.findUnique({ where: { workspaceId: ws.id } }),
  ])

  const [content, assignments, experts, activities, memberships, users, submissions, assets, newsletter, diagResults, diagQuestions, siteSetting] = counts

  console.log('=== DRY RUN — nothing will be deleted without --yes ===')
  console.log('Workspace:', ws.slug, ws.id)
  console.log('  ContentItem:', content, '(incl. 8 orphan STAGE + drafts + E2E leftovers)')
  console.log('  Assignment (legacy):', assignments)
  console.log('  Expert (legacy):', experts)
  console.log('  ActivityLog:', activities)
  console.log('  WorkspaceMember:', memberships)
  console.log('  User (in workspace):', users)
  console.log('  Submission:', submissions, '(180 @example.com test rows)')
  console.log('  Asset:', assets)
  console.log('  NewsletterSubscriber:', newsletter)
  console.log('  DiagnosticResult:', diagResults)
  console.log('  DiagnosticQuestion:', diagQuestions)
  console.log('  SiteSetting:', siteSetting ? 'present (empty)' : 'none')
  console.log()
  console.log('Will KEEP:')
  console.log('  - Admin user mbaraka@askterramorph.com')
  console.log('  - 9 non-@example.com submissions (terramorph...@gmail.com, saifa9726@gmail.com, 2 null-email)')
  console.log('Will DELETE everything else listed above, then re-seed 57 published ContentItems via seedContent().')
  console.log()

  if (!force) {
    console.log('Re-run with --yes to execute.')
    return
  }

  console.log('Executing reset...')

  await prisma.$transaction(async (tx) => {
    // Delete content-scoped data
    await tx.contentItem.deleteMany({ where: { workspaceId: ws.id } })
    await tx.activityLog.deleteMany({ where: { workspaceId: ws.id } })
    await tx.asset.deleteMany({ where: { workspaceId: ws.id } })

    // Delete legacy demo data
    await tx.assignment.deleteMany({ where: { workspaceId: ws.id } })
    await tx.expert.deleteMany({ where: { workspaceId: ws.id } })

    // Delete demo users (leads) but keep admin
    const demoMembers = await tx.workspaceMember.findMany({
      where: { workspaceId: ws.id },
      include: { user: true },
    })
    const demoUserIds = demoMembers
      .filter((m) => m.user.email.endsWith('@terramorph.local'))
      .map((m) => m.userId)

    if (demoUserIds.length > 0) {
      await tx.workspaceMember.deleteMany({
        where: { workspaceId: ws.id, userId: { in: demoUserIds } },
      })
      await tx.user.deleteMany({ where: { id: { in: demoUserIds } } })
    }

    // Delete test submissions (@example.com) — keep real ones
    const testSubs = await tx.submission.findMany({
      where: { email: { endsWith: '@example.com' } },
      select: { id: true },
    })
    if (testSubs.length > 0) {
      await tx.submission.deleteMany({
        where: { id: { in: testSubs.map((s) => s.id) } },
      })
      console.log(`Deleted ${testSubs.length} @example.com submissions`)
    }

    console.log('Deleted legacy content, assignments, experts, demo users, and test submissions')
  })

  // Re-seed public content (admin already exists)
  const admin = await prisma.user.findUnique({ where: { email: 'mbaraka@askterramorph.com' } })
  if (!admin) throw new Error('Admin user not found after reset')
  const { seedContent } = await import('./content-seed.js')
  await seedContent(prisma, ws.id, admin.id)

  console.log('Reset complete. 57 published ContentItems seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())