// Locks in the least-privilege runtime role.
//
// The API's own integration tests run as the database owner, so they cannot
// detect an over-broad grant. This file connects as terramorph_app instead and
// asserts the exact privilege boundary the API depends on.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const TEST_DB = 'terramorph_test'
const PG_INSUFFICIENT_PRIVILEGE = '42501'
const OWNER_ROLE = process.env.DB_OWNER_ROLE ?? 'terramorph-backend_owner'

let app: PrismaClient

/** Postgres error code from a failed raw statement, or undefined if it succeeded. */
async function pgErrorCode(statement: string): Promise<string | undefined> {
  try {
    await app.$executeRawUnsafe(statement)
    return undefined
  } catch (error) {
    // Under the Prisma 7 driver adapter the SQLSTATE is nested inside the
    // adapter error; the pool client exposes it directly on meta.
    const meta = (error as {
      meta?: {
        code?: string
        driverAdapterError?: { cause?: { code?: string } }
      }
    }).meta
    return meta?.driverAdapterError?.cause?.code ?? meta?.code
  }
}

describe('least-privilege runtime role', () => {
  beforeAll(() => {
    const runtimeUrl = process.env.RUNTIME_DATABASE_URL
    if (!runtimeUrl) throw new Error('RUNTIME_DATABASE_URL was not captured by test/setup.ts')
    const url = new URL(runtimeUrl)
    url.pathname = `/${TEST_DB}`
    app = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) })
  })

  afterAll(async () => {
    await app.$disconnect()
  })

  it('connects as the unprivileged role, not the owner', async () => {
    const [who] = await app.$queryRawUnsafe<{ current_user: string; is_super: boolean }[]>(
      `SELECT current_user, usesuper AS is_super FROM pg_user WHERE usename = current_user`,
    )
    expect(who.current_user).toBe('terramorph_app')
    expect(who.is_super).toBe(false)
  })

  it('can read every table the dashboard needs', async () => {
    const rows = await app.$queryRawUnsafe<{ ok: boolean }[]>(
      `SELECT bool_and(ok) AS ok FROM (
         SELECT has_table_privilege(current_user, 'public."User"', 'SELECT')            AS ok
         UNION ALL SELECT has_table_privilege(current_user, 'public."Workspace"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."WorkspaceMember"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."Assignment"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."Expert"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."ActivityLog"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."Session"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."Submission"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."ContentItem"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."Asset"', 'SELECT')
         UNION ALL SELECT has_table_privilege(current_user, 'public."SiteSetting"', 'SELECT')
       ) t`,
    )
    expect(rows[0].ok).toBe(true)
  })

  it('may create and destroy sessions', async () => {
    // Checked as a privilege rather than a real insert: a real row also needs
    // valid user/workspace foreign keys, which is fixture setup, not privilege.
    const [row] = await app.$queryRawUnsafe<{ ins: boolean; del: boolean }[]>(
      `SELECT has_table_privilege(current_user, 'public."Session"', 'INSERT') AS ins,
              has_table_privilege(current_user, 'public."Session"', 'DELETE') AS del`,
    )
    expect(row.ins).toBe(true)
    expect(row.del).toBe(true)
  })

  it('may stamp only lastUsedAt on Session, never its token', async () => {
    const [row] = await app.$queryRawUnsafe<Record<string, boolean>[]>(
      `SELECT has_column_privilege(current_user, 'public."Session"', 'lastUsedAt', 'UPDATE') AS last_used,
              has_column_privilege(current_user, 'public."Session"', 'tokenHash', 'UPDATE')  AS token_hash`,
    )
    expect(row.last_used).toBe(true)
    expect(row.token_hash).toBe(false)
  })

  it('may update only the password columns on User', async () => {
    const [row] = await app.$queryRawUnsafe<Record<string, boolean>[]>(
      `SELECT has_column_privilege(current_user, 'public."User"', 'passwordHash', 'UPDATE') AS password,
              has_column_privilege(current_user, 'public."User"', 'updatedAt', 'UPDATE')    AS updated_at,
              has_column_privilege(current_user, 'public."User"', 'email', 'UPDATE')        AS email,
              has_column_privilege(current_user, 'public."User"', 'name', 'UPDATE')         AS name`,
    )
    expect(row.password).toBe(true)
    expect(row.updated_at).toBe(true)
    expect(row.email).toBe(false)
    expect(row.name).toBe(false)
  })

  it('cannot write to Expert', async () => {
    expect(await pgErrorCode(`INSERT INTO "Expert" ("id","workspaceId","name","email","sector","status","registeredAt") VALUES ('x','x','x','x','x','REGISTERED',now())`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
    expect(await pgErrorCode(`UPDATE "Expert" SET "sector" = 'tampered'`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
    expect(await pgErrorCode(`DELETE FROM "Expert"`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
  })

  it('cannot write to Assignment', async () => {
    expect(await pgErrorCode(`UPDATE "Assignment" SET "status" = 'BLOCKED'`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
    expect(await pgErrorCode(`DELETE FROM "Assignment"`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
  })

  it('may append activity but never rewrite or erase it', async () => {
    // CMS edits create audit rows at runtime, so INSERT is granted; history is
    // still immutable to the runtime role.
    const [row] = await app.$queryRawUnsafe<Record<string, boolean>[]>(
      `SELECT has_table_privilege(current_user, 'public."ActivityLog"', 'INSERT') AS ins`,
    )
    expect(row.ins).toBe(true)
    expect(await pgErrorCode(`UPDATE "ActivityLog" SET "message" = 'tampered'`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
    expect(await pgErrorCode(`DELETE FROM "ActivityLog"`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
  })

  it('may fully write content workspace tables', async () => {
    for (const table of ['ContentItem', 'Asset', 'SiteSetting']) {
      const [row] = await app.$queryRawUnsafe<Record<string, boolean>[]>(
        `SELECT has_table_privilege(current_user, 'public."' || $1 || '"', 'SELECT,INSERT,UPDATE,DELETE') AS ok`,
        table,
      )
      expect(row.ok, `${table} must allow the content workspace CRUD`).toBe(true)
    }
  })

  it('may only rewrite the role column on WorkspaceMember', async () => {
    const [row] = await app.$queryRawUnsafe<Record<string, boolean>[]>(
      `SELECT has_column_privilege(current_user, 'public."WorkspaceMember"', 'role', 'UPDATE')       AS role,
              has_column_privilege(current_user, 'public."WorkspaceMember"', 'userId', 'UPDATE')     AS user_id,
              has_table_privilege(current_user, 'public."WorkspaceMember"', 'INSERT')                AS member_insert`,
    )
    expect(row.role).toBe(true)
    expect(row.user_id).toBe(false)
    expect(row.member_insert).toBe(false)
  })

  it('may insert Submissions but never update or delete them', async () => {
    // The public site creates submissions at runtime, so INSERT must be allowed.
    expect(await pgErrorCode(`INSERT INTO "Submission" ("id","kind","status","email","createdAt","updatedAt") VALUES ('priv-check','CONTACT','NEW','a@b.co',now(),now())`)).toBeUndefined()
    expect(await pgErrorCode(`UPDATE "Submission" SET "status" = 'APPROVED'`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
    expect(await pgErrorCode(`DELETE FROM "Submission"`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
    // Clean up the row the runtime role is allowed to create (as owner).
    const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) })
    await owner.$executeRawUnsafe(`DELETE FROM "Submission" WHERE "id" = 'priv-check'`)
    await owner.$disconnect()
  })

  it('cannot inherit the owner role or hold grant options', async () => {
    const [row] = await app.$queryRawUnsafe<Record<string, boolean>[]>(
      `SELECT pg_has_role(current_user, $1, 'MEMBER')            AS member_of_owner,
              has_table_privilege(current_user, 'public."Expert"', 'SELECT WITH GRANT OPTION') AS expert_grant_option,
              has_table_privilege(current_user, 'public."Session"', 'INSERT WITH GRANT OPTION') AS session_grant_option`,
      OWNER_ROLE,
    )
    expect(row.member_of_owner).toBe(false)
    expect(row.expert_grant_option).toBe(false)
    expect(row.session_grant_option).toBe(false)
  })

  it('is not a superuser and cannot create roles or databases', async () => {
    const [row] = await app.$queryRawUnsafe<Record<string, boolean>[]>(
      `SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
       FROM pg_roles WHERE rolname = current_user`,
    )
    expect(row.rolsuper).toBe(false)
    expect(row.rolcreatedb).toBe(false)
    expect(row.rolcreaterole).toBe(false)
    expect(row.rolreplication).toBe(false)
    expect(row.rolbypassrls).toBe(false)
  })

  it('an escalation attempt changes nothing', async () => {
    // Postgres only warns when granting privileges you do not hold, so this
    // asserts the resulting privileges rather than expecting an error.
    const before = await app.$queryRawUnsafe<{ privileges: boolean }[]>(
      `SELECT has_table_privilege(current_user, 'public."Expert"', 'INSERT,UPDATE,DELETE') AS privileges
       FROM pg_class WHERE oid = 'public."Expert"'::regclass`,
    )
    await pgErrorCode(`GRANT ALL ON "Expert" TO "terramorph_app"`)
    const after = await app.$queryRawUnsafe<{ privileges: boolean }[]>(
      `SELECT has_table_privilege(current_user, 'public."Expert"', 'INSERT,UPDATE,DELETE') AS privileges
       FROM pg_class WHERE oid = 'public."Expert"'::regclass`,
    )
    expect(before[0].privileges).toBe(false)
    expect(after[0].privileges).toBe(false)
  })

  it('cannot change role or escalate at runtime', async () => {
    // A non-superuser cannot SET ROLE to anything it is not a member of.
    expect(await pgErrorCode(`SET ROLE "${OWNER_ROLE}"`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
    expect(await pgErrorCode(`SET SESSION AUTHORIZATION "${OWNER_ROLE}"`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
  })

  it('cannot create or drop tables in the public schema', async () => {
    expect(await pgErrorCode(`CREATE TABLE public."escalation_test" ("id" int)`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
    expect(await pgErrorCode(`DROP TABLE IF EXISTS public."Assignment"`)).toBe(PG_INSUFFICIENT_PRIVILEGE)
  })
})