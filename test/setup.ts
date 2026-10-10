import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const TEST_DB = 'terramorph_test'

function testDatabaseUrl(): string {
  const owner = process.env.DIRECT_URL
  if (!owner) throw new Error('DIRECT_URL is required to derive the test database URL')
  const url = new URL(owner)
  url.pathname = `/${TEST_DB}`
  return url.toString()
}

export async function setup() {
  // Preserve the real runtime URL (the least-privilege role) before the owner
  // URL replaces DATABASE_URL below, so privilege tests can connect to the test
  // database as that same role.
  if (!process.env.RUNTIME_DATABASE_URL) process.env.RUNTIME_DATABASE_URL = process.env.DATABASE_URL

  const url = testDatabaseUrl()
  process.env.DATABASE_URL = url
  process.env.DIRECT_URL = url

  // Invoke the Prisma CLI through node directly: `npx` is not resolvable from a
  // spawned process on Windows, where only `npx.cmd` is on PATH.
  const prismaCli = join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js')
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: 'inherit',
  })
}

export async function teardown() {
  const { prisma } = await import('../src/prisma.js')
  await prisma.$disconnect()
}