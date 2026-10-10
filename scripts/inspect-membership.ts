// Reports role membership, which can grant privileges without any table ACL.
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const owner = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })

async function main() {
  const rows = await owner.$queryRawUnsafe<
    { member: string; inherited_role: string; admin_option: boolean; inherit_option: boolean }
  >(
    `SELECT m.rolname AS member, g.rolname AS inherited_role, a.admin_option, a.inherit_option
     FROM pg_auth_members a
     JOIN pg_roles m ON m.oid = a.member
     JOIN pg_roles g ON g.oid = a.roleid
     WHERE m.rolname NOT LIKE 'pg\\_%' OR g.rolname NOT LIKE 'pg\\_%'
     ORDER BY m.rolname, g.rolname`,
  )

  console.log('all role memberships in this database:')
  for (const r of rows) {
    console.log(`  member=${r.member}  ->  inherits ${r.inherited_role}  (inherit=${r.inherit_option}, admin=${r.admin_option})`)
  }

  const app = await owner.$queryRawUnsafe<{ rolname: string; rolinherit: boolean }[]>(
    `SELECT rolname, rolinherit FROM pg_roles WHERE rolname = 'terramorph_app'`,
  )
  console.log('\nterramorph_app:', JSON.stringify(app[0]))
  console.log('rolinherit=true means it silently receives every privilege of any role it is a member of.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => owner.$disconnect())