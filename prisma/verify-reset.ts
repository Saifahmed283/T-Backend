import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) })

async function main() {
  const ws = await p.workspace.findUnique({ where: { slug: 'terramorph' } })
  const out: Record<string, unknown> = {}
  out.content = await p.contentItem.count({ where: { workspaceId: ws!.id } })
  out.byKind = await p.contentItem.groupBy({ by: ['kind'], where: { workspaceId: ws!.id }, _count: true })
  out.assignments = await p.assignment.count({ where: { workspaceId: ws!.id } })
  out.experts = await p.expert.count({ where: { workspaceId: ws!.id } })
  out.activities = await p.activityLog.count({ where: { workspaceId: ws!.id } })
  out.members = await p.workspaceMember.count({ where: { workspaceId: ws!.id } })
  out.users = await p.user.count()
  out.submissions = await p.submission.count()
  console.log(JSON.stringify(out, null, 1))
}

main().finally(() => p.$disconnect())