// Proves tenant isolation with a real second workspace over HTTP.
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/security/passwords.js'

const BASE = 'http://127.0.0.1:4000'
const owner = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })

async function login(email, password) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login ${email} failed: ${res.status} ${await res.text()}`)
  return res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
}

async function getJson(path, cookie) {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {} })
  return { status: res.status, body: await res.json().catch(() => null) }
}

const PW = 'TenantProbe-Password-1'

async function main() {
  // Fixture: a second tenant with one assignment that must never appear in tenant A.
  const wsB = await owner.workspace.upsert({
    where: { slug: 'probe-tenant' },
    update: {},
    create: { name: 'Probe Tenant', slug: 'probe-tenant' },
  })
  const emailB = 'probe@tenant-b.local'
  const userB = await owner.user.upsert({
    where: { email: emailB },
    update: { name: 'Probe User' },
    create: { email: emailB, name: 'Probe User' },
  })
  await owner.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: wsB.id, userId: userB.id } },
    update: {},
    create: { workspaceId: wsB.id, userId: userB.id, role: 'admin' },
  })
  const secretB = await owner.assignment.upsert({
    where: { id: 'PROBE-B-001' },
    update: {},
    create: {
      id: 'PROBE-B-001',
      name: 'CONFIDENTIAL tenant B engagement',
      client: 'Hidden Client Ltd',
      sector: 'Private',
      value: 999,
      status: 'BLOCKED',
      stage: 'G0',
      workspaceId: wsB.id,
      leadId: userB.id,
    },
  })

  // The probe user needs a password; reuse the app's own hashing rules.
  await owner.user.update({ where: { id: userB.id }, data: { passwordHash: await hashPassword(PW) } })

  const pwA = process.env.SEED_ADMIN_PASSWORD
  const cookieA = await login('portal@terramorph.local', pwA)
  const cookieB = await login(emailB, PW)

  let failures = 0
  const check = (label, ok, detail = '') => {
    console.log(`${ok ? 'PASS ' : 'FAIL '} ${label}${detail ? ' :: ' + detail : ''}`)
    if (!ok) failures += 1
  }

  // Tenant A must not see tenant B's data.
  const aList = await getJson('/api/v1/assignments?pageSize=100', cookieA)
  const aIds = aList.body.items.map((i) => i.id)
  check('tenant A list excludes tenant B assignment', !aIds.includes('PROBE-B-001'), aIds.join(','))
  check('tenant A cannot search into tenant B', !(await getJson('/api/v1/assignments?search=CONFIDENTIAL&pageSize=100', cookieA)).body.items.length)

  const aSummary = await getJson('/api/v1/dashboard/summary', cookieA)
  check('tenant A summary counts only its own work', aSummary.body.activeAssignments === 7, `got ${aSummary.body.activeAssignments}`)

  // Tenant B must see only its own data.
  const bList = await getJson('/api/v1/assignments?pageSize=100', cookieB)
  check('tenant B sees exactly its own assignment', bList.body.items.length === 1 && bList.body.items[0].id === 'PROBE-B-001')
  const bSummary = await getJson('/api/v1/dashboard/summary', cookieB)
  check('tenant B summary is 1', bSummary.body.activeAssignments === 1, `got ${bSummary.body.activeAssignments}`)
  check('tenant B value is 999', bSummary.body.contractValue === 999, `got ${bSummary.body.contractValue}`)

  // Cross-tenant read by id must be refused, not merely filtered from lists.
  const cross = await getJson('/api/v1/assignments/TM-25-031', cookieB)
  check("tenant B cannot read tenant A's assignment by id", cross.status === 404, `status ${cross.status}`)

  const crossFeed = await getJson('/api/v1/activity?limit=100', cookieB)
  const leaked = (crossFeed.body.items || []).filter((i) => (i.message || '').includes('Curriculum'))
  check('tenant B activity feed excludes tenant A entries', leaked.length === 0)

  // Fixture cleanup.
  await owner.assignment.delete({ where: { id: secretB.id } }).catch(() => {})
  await owner.workspace.delete({ where: { id: wsB.id } }).catch(() => {})
  await owner.user.delete({ where: { id: userB.id } }).catch(() => {})

  console.log(failures === 0 ? '\nAll tenancy checks passed.' : `\n${failures} tenancy check(s) FAILED.`)
  process.exitCode = failures === 0 ? 0 : 1
}

main()
  .catch((e) => { console.error('ERROR', e); process.exitCode = 1 })
  .finally(() => owner.$disconnect())