// Ground-truth privilege report using aclexplode, plus raw default-ACL text.
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const owner = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })
const ROLE = 'terramorph_app'

async function main() {
  console.log(`=== explicit grants for ${ROLE} on public tables (aclexplode) ===`)
  const grants = await owner.$queryRawUnsafe<{ table_name: string; privilege: string; grantor: string }[]>(
    `SELECT c.relname AS table_name, a.privilege_type AS privilege, a.grantee::regrole::text AS grantor
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     CROSS JOIN LATERAL aclexplode(c.relacl) a
     WHERE n.nspname = 'public' AND c.relkind = 'r'
       AND a.grantee = $1::regrole
     ORDER BY c.relname, a.privilege_type`,
    ROLE,
  )
  if (!grants.length) console.log('  (none)')
  for (const g of grants) console.log(`  ${g.table_name.padEnd(18)} ${g.privilege.padEnd(10)} from ${g.grantor}`)

  console.log(`\n=== raw relacl text for a few tables ===`)
  const acls = await owner.$queryRawUnsafe<{ relname: string; relacl: string }[]>(
    `SELECT c.relname, c.relacl::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN ('Expert','User','Session','Assignment') ORDER BY c.relname`,
  )
  for (const a of acls) console.log(`  ${a.relname}: ${a.relacl}`)

  console.log(`\n=== raw defaclacl text ===`)
  const d = await owner.$queryRawUnsafe<{ defaclrole: string; nsp: string; objtype: string; acl: string }[]>(
    `SELECT d.defaclrole::regrole::text AS defaclrole, coalesce(n.nspname,'global') AS nsp,
            CASE d.defaclobjtype WHEN 'r' THEN 'table' ELSE d.defaclobjtype::text END AS objtype,
            d.defaclacl::text AS acl
     FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace`,
  )
  for (const r of d) console.log(`  role=${r.defaclrole} schema=${r.nsp} type=${r.objtype}\n    ${r.acl}`)

  console.log(`\n=== does the ACL text mention the role anywhere? ===`)
  const mention = await owner.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*)::bigint AS n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'public' AND c.relacl::text LIKE '%' || $1 || '%'`,
    ROLE,
  )
  console.log(`  ${mention[0].n} public tables mention ${ROLE} in relacl`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => owner.$disconnect())