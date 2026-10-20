// Reports the runtime role's actual privileges. Read-only.
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) })

async function main() {
  const role = 'terramorph_app'

  const exists = await owner.$queryRawUnsafe<{ rolname: string; rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean }[]>(
    `SELECT rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1`,
    role,
  )
  if (!exists.length) throw new Error(`role ${role} does not exist`)
  console.log('role:', JSON.stringify(exists[0]))

  const schemas = await owner.$queryRawUnsafe<{ nspname: string; has_schema: boolean }[]>(
    `SELECT nspname, has_schema_privilege($1, nspname, 'USAGE') AS has_schema
     FROM pg_namespace WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema' ORDER BY nspname`,
    role,
  )
  console.log('\nschema USAGE:')
  for (const s of schemas) console.log(`  ${s.has_schema ? 'yes' : 'NO '} ${s.nspname}`)

  const tableGrants = await owner.$queryRawUnsafe<{ table_name: string; priv: string }[]>(
    `SELECT c.relname AS table_name, unnest(c.relacl)::text AS priv
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname`,
  )
  console.log('\nper-table ACL (public schema, app role):')
  for (const t of tableGrants) {
    const appEntries = (t.priv.match(new RegExp(`${role}=[^/]*/g`, 'g')) ?? []).join(' ')
    console.log(`  ${appEntries || '(owner/default only)'} ${t.table_name}`)
  }

  const defaults = await owner.$queryRawUnsafe<{ defaclrole: string; defaclnamespace: string; defaclobjtype: string; defaclacl: string }[]>(
    `SELECT d.defaclrole::regrole::text AS defaclrole, n.nspname AS defaclnamespace,
            CASE d.defaclobjtype WHEN 'r' THEN 'table' WHEN 'S' THEN 'sequence' ELSE d.defaclobjtype::text END AS defaclobjtype,
            d.defaclacl::text AS defaclacl
     FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace`,
  )
  console.log('\ndefault privileges (what NEW tables inherit):')
  for (const d of defaults) {
    console.log(`  role=${d.defaclrole} schema=${d.defaclnamespace ?? 'global'} type=${d.defaclobjtype}`)
    const appEntries = (d.defaclacl.match(new RegExp(`${role}=[^/]*/g`, 'g')) ?? []).join(' ')
    if (appEntries) console.log(`    app role -> ${appEntries}`)
  }

  // What the app can actually reach right now.
  const probe = await owner.$queryRawUnsafe<{ can_select_user: boolean; can_write_expert: boolean; can_read_legacy: boolean }[]>(
    `SELECT has_table_privilege($1, 'public."User"', 'SELECT') AS can_select_user,
            has_table_privilege($1, 'public."Expert"', 'INSERT,UPDATE,DELETE') AS can_write_expert,
            has_schema_privilege($1, 'legacy', 'USAGE') AS can_read_legacy`,
    role,
  )
  console.log('\neffective capability probe:')
  console.log(' ', JSON.stringify(probe[0]))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => owner.$disconnect())