// Tightens terramorph_app to least privilege, then verifies.
//
// Grants, derived from the queries the API actually issues:
//   Session          SELECT, INSERT, DELETE, UPDATE(lastUsedAt)
//                                                         (login creates, logout
//                                                          deletes, resolveSession
//                                                          slides idle timeout)
//   User              SELECT, UPDATE(passwordHash)
//   Assignment        SELECT
//   Expert            SELECT
//   ActivityLog       SELECT, INSERT             (content edits append audit rows)
//   Submission        SELECT, INSERT             (public site writes, admins read)
//   PasswordResetToken SELECT, INSERT, DELETE    (issue, consume, invalidate)
//   ContentItem       SELECT, INSERT, UPDATE, DELETE   (content workspace CRUD)
//   Asset             SELECT, INSERT, UPDATE, DELETE   (media library)
//   SiteSetting       SELECT, INSERT, UPDATE, DELETE   (website configuration)
//   Workspace         SELECT
//   WorkspaceMember   SELECT, UPDATE(role)       (admins promote/demote members)
//   _prisma_migrations SELECT                    (so migrate deploy works)
//   public enum types USAGE                     (Prisma binds enum parameters)
//
// Also clears the owner's default privileges so newly created tables do not
// silently inherit blanket DML again.
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

// Optional target database, e.g. `tsx scripts/tighten-privileges.ts terramorph_test`.
const targetDb = process.argv[2]
const datasourceUrl = (() => {
  if (!targetDb) return process.env.DIRECT_URL
  const url = new URL(process.env.DIRECT_URL!)
  url.pathname = `/${targetDb}`
  return url.toString()
})()

const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: datasourceUrl }) })

const APP = process.env.DB_APP_ROLE ?? 'terramorph_app'
const OWNER = process.env.DB_OWNER_ROLE ?? 'terramorph-backend_owner'

const SELECT_ONLY = ['"User"', '"Workspace"', '"WorkspaceMember"', '"Assignment"', '"Expert"', '"Submission"', '"_prisma_migrations"']
// Content workspace tables the runtime role fully owns (insert/update/delete).
const CMS_TABLES = ['"ContentItem"', '"Asset"', '"SiteSetting"']
// Reset tokens are read (findUnique), inserted (issue) and deleted (consume or
// invalidate), never updated.
const RESET_TABLES = ['"PasswordResetToken"']
// Session needs reads too: requireAuth loads the session row with findUnique.
const ALL_TABLES = [...SELECT_ONLY, '"Session"', '"ActivityLog"', ...RESET_TABLES, ...CMS_TABLES]
const READ_TABLES = [...SELECT_ONLY, '"Session"', '"ActivityLog"', ...RESET_TABLES, ...CMS_TABLES]

async function snapshot() {
  const rows = await owner.$queryRawUnsafe<{ table_name: string; privileges: string }[]>(
    `SELECT c.relname AS table_name,
            concat_ws(',', array_agg(DISTINCT a.privilege_type ORDER BY a.privilege_type)) AS privileges
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     CROSS JOIN LATERAL aclexplode(c.relacl) a
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.grantee = $1::regrole
     GROUP BY c.relname ORDER BY c.relname`,
    APP,
  )
  const map = new Map(rows.map((r) => [r.table_name, r.privileges || '(none)']))
  return ALL_TABLES.map((t) => t.replace(/"/g, '')).map((t) => `${t}: ${map.get(t) ?? '(none)'}`)
}

async function main() {
  console.log('BEFORE')
  for (const line of await snapshot()) console.log('  ' + line)

  const defaclBefore = await owner.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*)::bigint AS n FROM pg_default_acl WHERE defaclacl::text LIKE '%' || $1 || '%'`,
    APP,
  )
  console.log(`  default-ACL entries granting ${APP}: ${defaclBefore[0].n}`)

  await owner.$transaction(
    async (tx) => {
      const tables = ALL_TABLES.join(', ')
      const selects = READ_TABLES.join(', ')

      // Stop new tables from inheriting blanket DML from the owner.
      await tx.$executeRawUnsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE "${OWNER}" IN SCHEMA public REVOKE ALL ON TABLES FROM "${APP}"`,
      )
      await tx.$executeRawUnsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE "${OWNER}" IN SCHEMA public REVOKE ALL ON SEQUENCES FROM "${APP}"`,
      )

      // Remove the blanket grant, then re-grant only what the API needs.
      await tx.$executeRawUnsafe(`REVOKE ALL ON ${tables} FROM "${APP}"`)
      await tx.$executeRawUnsafe(`GRANT SELECT ON ${selects} TO "${APP}"`)
      await tx.$executeRawUnsafe(`GRANT INSERT, DELETE ON "Session" TO "${APP}"`)
      // resolveSession slides the idle window forward by stamping lastUsedAt.
      await tx.$executeRawUnsafe(`GRANT UPDATE ("lastUsedAt") ON "Session" TO "${APP}"`)
      // Public site submissions are inserts; admins read them. No UPDATE/DELETE.
      await tx.$executeRawUnsafe(`GRANT INSERT ON "Submission" TO "${APP}"`)
      // Content edits append audit rows; they are never updated or deleted.
      await tx.$executeRawUnsafe(`GRANT INSERT ON "ActivityLog" TO "${APP}"`)
      // Reset links: issue, consume and invalidate. No UPDATE, so a stored
      // digest cannot be re-pointed at another user.
      await tx.$executeRawUnsafe(`GRANT INSERT, DELETE ON "PasswordResetToken" TO "${APP}"`)
      // Admins promote/demote members by rewriting the role column only.
      await tx.$executeRawUnsafe(`GRANT UPDATE ("role") ON "WorkspaceMember" TO "${APP}"`)
      // Content workspace tables: full DML, updatedAt is written by @updatedAt.
      await tx.$executeRawUnsafe(`GRANT INSERT, UPDATE, DELETE ON ${CMS_TABLES.join(', ')} TO "${APP}"`)
      // Password change writes passwordHash; Prisma's @updatedAt also writes
      // updatedAt on every update, so both columns are required.
      await tx.$executeRawUnsafe(`GRANT UPDATE ("passwordHash", "updatedAt") ON "User" TO "${APP}"`)
      await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${APP}"`)

      // Enum parameter binding.
      await tx.$executeRawUnsafe(
        `DO $do$
         DECLARE t text;
         BEGIN
           FOR t IN SELECT c.relname FROM pg_class c
                     JOIN pg_namespace n ON n.oid = c.relnamespace
                     WHERE n.nspname = 'public' AND c.relkind IN ('r','e','S','v','m','f')
           LOOP
             EXECUTE format('GRANT USAGE ON TYPE public.%I TO %I', t, '${APP}');
           END LOOP;
         END
         $do$`,
      )
    },
    { timeout: 120_000, maxWait: 20_000 },
  )

  console.log('\nAFTER')
  for (const line of await snapshot()) console.log('  ' + line)

  const defaclAfter = await owner.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*)::bigint AS n FROM pg_default_acl WHERE defaclacl::text LIKE '%' || $1 || '%'`,
    APP,
  )
  console.log(`  default-ACL entries granting ${APP}: ${defaclAfter[0].n}`)

  const probe = await owner.$queryRawUnsafe<Record<string, boolean>[]>(
    `SELECT has_table_privilege($1,'public."User"','SELECT')                  AS user_select,
            has_table_privilege($1,'public."User"','UPDATE')                  AS user_update_full,
            has_column_privilege($1,'public."User"','passwordHash','UPDATE') AS user_update_password,
            has_column_privilege($1,'public."User"','updatedAt','UPDATE')    AS user_update_updatedat,
            has_column_privilege($1,'public."User"','email','UPDATE')        AS user_update_email,
            has_table_privilege($1,'public."Session"','INSERT')               AS session_insert,
            has_table_privilege($1,'public."Session"','DELETE')               AS session_delete,
            has_table_privilege($1,'public."Session"','SELECT')               AS session_select,
            has_column_privilege($1,'public."Session"','lastUsedAt','UPDATE') AS session_update_lastused,
            has_column_privilege($1,'public."Session"','tokenHash','UPDATE')  AS session_update_tokhash,
            has_table_privilege($1,'public."Submission"','SELECT')            AS submission_select,
            has_table_privilege($1,'public."Submission"','INSERT')            AS submission_insert,
            has_table_privilege($1,'public."Submission"','UPDATE')            AS submission_update,
            has_table_privilege($1,'public."Expert"','SELECT')                AS expert_select,
            has_table_privilege($1,'public."Expert"','INSERT')                AS expert_insert,
            has_table_privilege($1,'public."Assignment"','SELECT')            AS assignment_select,
            has_table_privilege($1,'public."Assignment"','UPDATE')            AS assignment_update,
            has_table_privilege($1,'public."ActivityLog"','SELECT')           AS activity_select,
            has_table_privilege($1,'public."ActivityLog"','INSERT')           AS activity_insert,
            has_table_privilege($1,'public."WorkspaceMember"','SELECT')       AS member_select,
            has_column_privilege($1,'public."WorkspaceMember"','role','UPDATE') AS member_update_role,
            has_table_privilege($1,'public."PasswordResetToken"','SELECT')     AS reset_select,
            has_table_privilege($1,'public."PasswordResetToken"','INSERT')     AS reset_insert,
            has_table_privilege($1,'public."PasswordResetToken"','DELETE')     AS reset_delete,
            has_table_privilege($1,'public."PasswordResetToken"','UPDATE')     AS reset_update,
            has_table_privilege($1,'public."ContentItem"','SELECT')           AS content_select,
            has_table_privilege($1,'public."ContentItem"','INSERT')           AS content_insert,
            has_table_privilege($1,'public."ContentItem"','UPDATE')           AS content_update,
            has_table_privilege($1,'public."ContentItem"','DELETE')           AS content_delete,
            has_table_privilege($1,'public."Asset"','INSERT')                 AS asset_insert,
            has_table_privilege($1,'public."SiteSetting"','UPDATE')           AS setting_update,
            COALESCE((SELECT has_schema_privilege($1,'legacy','USAGE')
                      FROM pg_namespace WHERE nspname='legacy'), false)       AS legacy_usage`,
    APP,
  )
  console.log('\nEFFECTIVE CAPABILITIES')
  for (const [k, v] of Object.entries(probe[0])) console.log(`  ${v ? 'yes' : 'NO '} ${k}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => owner.$disconnect())