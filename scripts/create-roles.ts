// Creates the least-privilege runtime login role, idempotently.
//
// Roles are cluster-wide, so one run covers every database on the project, but
// grants are per-database: follow with `npm run db:privileges` (and
// `npm run db:privileges -- <db>` for extra databases such as terramorph_test).
//
// The password must match DB_APP_PASSWORD in .env, which DATABASE_URL embeds
// for the runtime connection. Re-running syncs the role password to .env.
//
// Runs as the migration/owner role from DIRECT_URL. On Supabase that is the
// cluster superuser `postgres` (set DB_OWNER_ROLE=postgres to match); on Neon
// it is the dedicated owner role.
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const APP = process.env.DB_APP_ROLE ?? 'terramorph_app'
const password = process.env.DB_APP_PASSWORD

const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) })

function literal(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

async function main() {
  if (!password) throw new Error('DB_APP_PASSWORD is not set in .env')

  const [{ n }] = await owner.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*)::bigint AS n FROM pg_roles WHERE rolname = $1`,
    APP,
  )

  if (n === 0n) {
    await owner.$executeRawUnsafe(`CREATE ROLE "${APP}" LOGIN PASSWORD ${literal(password)}`)
    console.log(`created login role ${APP}`)
  } else {
    await owner.$executeRawUnsafe(`ALTER ROLE "${APP}" LOGIN PASSWORD ${literal(password)}`)
    console.log(`login role ${APP} already existed; password synced to DB_APP_PASSWORD`)
  }

  const [verify] = await owner.$queryRawUnsafe<{ rolcanlogin: boolean; rolsuper: boolean; rolcreatedb: boolean }[]>(
    `SELECT rolcanlogin, rolsuper, rolcreatedb FROM pg_roles WHERE rolname = $1`,
    APP,
  )
  console.log(`  login=${verify.rolcanlogin} superuser=${verify.rolsuper} createdb=${verify.rolcreatedb}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => owner.$disconnect())
