import type { FastifyInstance } from 'fastify'
import { prisma } from '../../db/prisma.js'
import { registerActivityRoutes } from './activity.routes.js'
import { registerAssetRoutes } from './assets.routes.js'
import { registerAuthRoutes } from './auth.routes.js'
import { registerContentRoutes } from './content.routes.js'
import { registerDataRequestRoutes } from './data-requests.routes.js'
import { registerMarketingConsentRoutes } from './marketing-consent.routes.js'
import { registerMemberRoutes } from './members.routes.js'
import { registerPublicRoutes } from './public.routes.js'
import { registerSettingsRoutes } from './settings.routes.js'
import { registerSubmissionRoutes } from './submissions.routes.js'
import { registerTermsAcceptanceRoutes } from './terms-acceptance.routes.js'
import { registerMorpheRoutes } from '../../modules/morphe/routes.js'
import { registerMorpheAiRoutes } from '../../modules/morphe/morphe-ai-routes.js'

export async function registerRoutes(app: FastifyInstance) {
  // Root landing page: tells callers the backend is healthy and points them at
  // the real API surface under /api/v1.
  app.get(
    '/',
    { config: { rateLimit: { max: 60, timeWindow: '15 minutes' } } },
    async (_request, reply) => {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TerraMorph API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #f1f5f9;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 48px 40px;
      text-align: center;
      max-width: 560px;
      width: 92%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(16, 185, 129, 0.15);
      color: #86efac;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .dot {
      width: 8px;
      height: 8px;
      background: #86efac;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    h1 { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 12px; }
    p { color: #cbd5e1; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
    .api {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
    }
    .path {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: rgba(15, 23, 42, 0.6);
      color: #94a3b8;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
    }
    .path strong { color: #38bdf8; }
    .footer {
      font-size: 12px;
      color: #64748b;
      margin-top: 40px;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><div class="dot"></div> Backend running</div>
    <h1>TerraMorph API</h1>
    <p>The backend is <strong>healthy</strong> and ready to serve requests.</p>
    <div class="api">
      <span class="path">GET <strong>/api/v1</strong></span>
    </div>
    <div class="footer">TerraMorph &middot; <span id="year"></span></div>
  </div>
  <script>document.getElementById('year').textContent = new Date().getFullYear();</script>
</body>
</html>
      `.trim();
      return reply.type('text/html').send(html);
    },
  )

  // Liveness: is the process up? Never touches the database.
  app.get(
    '/health',
    { config: { rateLimit: { max: 60, timeWindow: '15 minutes' } } },
    async () => ({ status: 'ok', service: 'terramorph-api', timestamp: new Date().toISOString() }),
  )

  // Readiness: can the process actually serve traffic (database reachable)?
  app.get('/health/ready', { config: { rateLimit: { max: 30, timeWindow: '15 minutes' } } }, async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return reply.send({ status: 'ready', database: 'up', timestamp: new Date().toISOString() })
    } catch {
      return reply.status(503).send({ status: 'unavailable', database: 'down', timestamp: new Date().toISOString() })
    }
  })

  await registerAuthRoutes(app)
  await registerActivityRoutes(app)
  await registerSubmissionRoutes(app)
  await registerContentRoutes(app)
  await registerPublicRoutes(app)
  await registerAssetRoutes(app)
  await registerSettingsRoutes(app)
  await registerMemberRoutes(app)
  await registerDataRequestRoutes(app)
  await registerMarketingConsentRoutes(app)
  await registerTermsAcceptanceRoutes(app)
  await registerMorpheRoutes(app)
  // Registered as its own plugin, not called with the shared instance: the
  // plugin adds an onRequest auth hook, and calling it directly would apply
  // that hook to every sibling route (health, public content, Morphe chat).
  await app.register(registerMorpheAiRoutes)
}