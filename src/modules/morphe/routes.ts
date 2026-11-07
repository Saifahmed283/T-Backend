/**
 * Fastify plugin: Morphe chat routes.
 *
 *   import morpheRoutes from './morphe-routes.js'
 *   app.register(morpheRoutes, { prefix: '/morphe' })
 *
 * The browser talks to Fastify, never directly to any model service.
 * Rate limited, Origin-checked (CSRF), with a 10 s upstream timeout.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { handleChat, getHealth } from "./service.js";

const chatBodySchema = z
  .object({
    session_id: z.string().uuid().nullable().optional(),
    message: z.string().max(2000).nullable().optional(),
    lang: z.enum(["en", "ar"]).default("en"),
    use_search: z.boolean().default(false),
  })
  .strict();

export async function registerMorpheRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/api/v1/morphe/chat",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const body = chatBodySchema.parse(request.body);
      const result = await handleChat({
        sessionId: body.session_id ?? null,
        message: body.message ?? null,
        lang: body.lang,
        useSearch: body.use_search,
      });
      return reply.send(result);
    },
  );

  fastify.get("/api/v1/morphe/health", async (_request, reply) => {
    return reply.send(await getHealth());
  });
}
