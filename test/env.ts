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
// CORS is irrelevant to inject()-based tests.
process.env.FRONTEND_ORIGIN = 'http://localhost:5173'