import 'dotenv/config'

// Runs inside each worker before any application module is imported, so every
// value `config` reads is already in place.
const TEST_DB = 'terramorph_test'

if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL must be set so the test database URL can be derived')
}

const testUrl = new URL(process.env.DIRECT_URL)
testUrl.pathname = `/${TEST_DB}`
process.env.DATABASE_URL = testUrl.toString()
process.env.DIRECT_URL = testUrl.toString()

process.env.NODE_ENV = 'test'
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-0000'
process.env.SEED_ADMIN_PASSWORD = 'Test-Admin-Password-123'
process.env.SEED_ADMIN_EMAIL = 'admin@test.local'
// CORS is irrelevant to inject()-based tests, but reset links are built from it.
process.env.FRONTEND_ORIGIN = 'http://localhost:5173'
// Mail is disabled by default everywhere else; the suite enables the in-memory
// provider so it can assert on admin notices, receipts and reset links.
process.env.EMAIL_ENABLED = 'true'
process.env.EMAIL_PROVIDER = 'memory'
process.env.ADMIN_NOTIFICATION_EMAIL = 'ops@test.local'