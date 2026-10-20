import 'dotenv/config'
import { PrismaClient, AssignmentStatus, WorkflowStage, ActivityType, ExpertStatus } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/security/passwords.js'

// Seeding writes columns the runtime role cannot touch (User.email, Expert rows,
// ActivityLog inserts), so it must run as the migration owner via DIRECT_URL.
// The runtime client (src/db/prisma.ts) uses DATABASE_URL, which is least-privilege.
if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL is required to seed; the runtime role cannot write seed data')
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) })

const assignments = [
  ['TM-25-031', 'Governorate investment map — phase II', 'Assiut Governorate', 'Public sector', 182, AssignmentStatus.ON_TRACK, WorkflowStage.G5, 'M. Baraka'],
  ['TM-25-034', 'TVET curricula re-tooling', 'GIZ programme', 'Development partners', 240, AssignmentStatus.ON_TRACK, WorkflowStage.G6, 'S. Fahmy'],
  ['TM-26-002', 'Blended-finance cooperative structure', 'Delta Impact Fund', 'NGOs', 96, AssignmentStatus.AT_RISK, WorkflowStage.G3, 'N. Adel'],
  ['TM-26-005', 'Investment climate action plan', 'Ministry of Planning', 'Public sector', 310, AssignmentStatus.ON_TRACK, WorkflowStage.G2, 'M. Baraka'],
  ['TM-26-009', 'SME export readiness diagnostic', 'Nile Foods Co.', 'Business', 38, AssignmentStatus.BLOCKED, WorkflowStage.G1, 'K. Samir'],
  ['TM-26-011', 'Teaming bid — regional LED framework', 'Landell Mills (prime)', 'Consultancies', 145, AssignmentStatus.AT_RISK, WorkflowStage.G4, 'S. Fahmy'],
  ['TM-26-014', 'Train-the-trainer certification', 'AAST Academy', 'Learning', 64, AssignmentStatus.ON_TRACK, WorkflowStage.G7, 'N. Adel'],
] as const

const experts = [
  ['Dr. Hanaa Soliman', 'hanaa.soliman@example.org', 'Education', 'Egypt', ExpertStatus.DEPLOYED],
  ['Prof. Marcus Adeyemi', 'marcus.adeyemi@example.org', 'Economics', 'Nigeria', ExpertStatus.VETTED],
  ['Dr. Leila Haddad', 'leila.haddad@example.org', 'Public health', 'Lebanon', ExpertStatus.MATCHED],
  ['Eng. Tariq Mansour', 'tariq.mansour@example.org', 'Renewable energy', 'Morocco', ExpertStatus.PROFILE_COMPLETE],
  ['Dr. Ingrid Bergman', 'ingrid.bergman@example.org', 'Labour markets', 'Sweden', ExpertStatus.REGISTERED],
  ['Dr. Kwame Mensah', 'kwame.mensah@example.org', 'Agribusiness', 'Ghana', ExpertStatus.VETTED],
] as const

const notes: ReadonlyArray<readonly [string, string]> = [
  ['TM-25-031', 'Client confirmed the phase II boundary; field schedule unchanged.'],
  ['TM-25-034', 'Curriculum review panel requested two additional modules.'],
  ['TM-26-002', 'Cooperative legal structure still awaiting board sign-off.'],
  ['TM-26-005', 'Ministry widened the scope to include the new governorates.'],
  ['TM-26-009', 'Escalated: export data from the partner has not arrived.'],
  ['TM-26-011', 'Prime contractor asked for a teaming agreement redline.'],
  ['TM-26-014', 'Certification cohort capped at 30 participants.'],
]

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password || password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be set to at least 12 characters before seeding')
  }
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@askterramorph.com').toLowerCase()
  const adminHash = await hashPassword(password)
  // Leads share SEED_LEAD_PASSWORD when provided; otherwise they fall back to
  // the admin password (development convenience only). In production, use a
  // distinct lead password so the admin credential is not handed to every lead.
  const leadPassword = process.env.SEED_LEAD_PASSWORD
  if (process.env.NODE_ENV === 'production' && !leadPassword) {
    console.warn(
      '[seed] WARNING: SEED_LEAD_PASSWORD is not set; seeded lead accounts reuse the admin password. Set it, or do not seed leads in production.',
    )
  }
  const sharedHash = leadPassword ? await hashPassword(leadPassword) : adminHash

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'terramorph' },
    update: {},
    create: { name: 'TerraMorph', slug: 'terramorph' },
  })

  // Each lead keeps their own identity; see sharedHash above for credentials.
  const leads = [...new Set(assignments.map((a) => a[7]))]
  const users = new Map<string, string>()

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

  for (const name of leads) {
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@terramorph.local`
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, passwordHash: sharedHash },
      create: { email, name, passwordHash: sharedHash },
    })
    users.set(name, user.id)
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: {},
      create: { workspaceId: workspace.id, userId: user.id, role: 'lead' },
    })
  }

  for (const [id, name, client, sector, value, status, stage, lead] of assignments) {
    const assignment = await prisma.assignment.upsert({
      where: { id },
      update: { name, client, sector, value, status, stage, leadId: users.get(lead)!, workspaceId: workspace.id },
      create: { id, name, client, sector, value, status, stage, leadId: users.get(lead)!, workspaceId: workspace.id },
    })
    // ActivityLog.workspaceId is required; activity is tenant data.
    const created = await prisma.activityLog.findFirst({
      where: { assignmentId: assignment.id, type: ActivityType.CREATED },
    })
    if (!created) {
      await prisma.activityLog.create({
        data: {
          workspaceId: workspace.id,
          assignmentId: assignment.id,
          type: ActivityType.CREATED,
          message: `Assignment seeded at ${stage}`,
          userId: users.get(lead)!,
        },
      })
    }
  }

  for (const [name, email, sector, country, status] of experts) {
    const vetted = status === ExpertStatus.VETTED || status === ExpertStatus.DEPLOYED
    await prisma.expert.upsert({
      where: { email },
      update: { name, sector, country, status, workspaceId: workspace.id, ...(vetted ? { vettedAt: new Date() } : {}) },
      create: { name, email, sector, country, status, workspaceId: workspace.id, ...(vetted ? { vettedAt: new Date() } : {}) },
    })
  }

  let notesCreated = 0
  for (const [assignmentId, message] of notes) {
    const existing = await prisma.activityLog.findFirst({
      where: { assignmentId, type: ActivityType.NOTE_ADDED, message },
    })
    if (existing) continue
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { workspaceId: true, leadId: true } })
    if (!assignment) continue
    await prisma.activityLog.create({
      data: {
        workspaceId: assignment.workspaceId,
        assignmentId,
        type: ActivityType.NOTE_ADDED,
        message,
        userId: assignment.leadId,
      },
    })
    notesCreated += 1
  }

  const [assignmentCount, expertCount, noteCount] = await Promise.all([
    prisma.assignment.count({ where: { workspaceId: workspace.id } }),
    prisma.expert.count({ where: { workspaceId: workspace.id } }),
    prisma.activityLog.count({ where: { workspaceId: workspace.id, type: ActivityType.NOTE_ADDED } }),
  ])
  console.log(
    `Seeded workspace "${workspace.slug}": ${assignmentCount} assignments, ${expertCount} experts, ${noteCount} notes (+${notesCreated} new).`,
  )
  console.log(`Sign in as ${adminEmail} with SEED_ADMIN_PASSWORD.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())