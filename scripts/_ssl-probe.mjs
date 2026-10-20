import pg from 'pg'

const base = process.env.DIRECT_URL
if (!base) throw new Error('no DIRECT_URL')
const u = new URL(base)
u.pathname = '/terramorph_test'

async function probe(label, connectionString, extra = {}) {
  const client = new pg.Client({ connectionString, ...extra })
  try {
    await client.connect()
    const r = await client.query('select 1 as ok')
    console.log(`PASS  ${label} ->`, r.rows[0].ok)
  } catch (e) {
    console.log(`FAIL  ${label} ->`, e.message)
  } finally {
    await client.end().catch(() => {})
  }
}

await probe('original (sslmode=require)', u.toString())

const libpq = new URL(u.toString())
libpq.searchParams.set('uselibpqcompat', 'true')
await probe('uselibpqcompat=true', libpq.toString())

const noVerify = new URL(u.toString())
noVerify.searchParams.set('sslmode', 'no-verify')
await probe('sslmode=no-verify', noVerify.toString())

await probe('ssl.rejectUnauthorized=false (sslmode stripped)', u.toString().replace(/[?&]sslmode=require/, ''), {
  ssl: { rejectUnauthorized: false },
})

await probe('ssl.rejectUnauthorized=false WITH sslmode=require kept', u.toString(), {
  ssl: { rejectUnauthorized: false },
})

// Inspect the chain the server presents.
{
  const stripped = u.toString().replace(/[?&]sslmode=require/, '')
  const client = new pg.Client({ connectionString: stripped, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const socket = client.connection.stream
  const cert = socket.getPeerCertificate(true)
  const seen = new Set()
  let node = cert
  console.log('--- certificate chain (leaf -> root) ---')
  while (node && node.subject && !seen.has(node.fingerprint)) {
    seen.add(node.fingerprint)
    console.log('  subject:', JSON.stringify(node.subject))
    console.log('  issuer :', JSON.stringify(node.issuer))
    node = node.issuerCertificate
  }
  await client.end().catch(() => {})
}
