/**
 * Fastify plugin: Morphe AI routes - proxies to the Python AI service.
 *
 *   import morpheAiRoutes from './morphe-ai-routes.js'
 *   app.register(morpheAiRoutes, { prefix: '/morphe-ai' })
 *
 * The browser talks to Fastify, which proxies to the Python AI service
 * over the internal network. Set MORPHE_AI_SERVICE_URL in your environment.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";

const MORPHE_AI_URL = process.env.MORPHE_AI_SERVICE_URL || 'http://127.0.0.1:8009';

// Request schemas
const chatBodySchema = z
  .object({
    session_id: z.string().uuid().optional(),
    message: z.string().min(1).max(4000),
    lang: z.enum(["en", "ar"]).default("en"),
    mode: z.enum(["chat", "intake"]).default("chat"),
    stream: z.boolean().default(true),
    use_search: z.boolean().default(false),
    temperature: z.coerce.number().min(0).max(2).default(0.7),
    max_tokens: z.coerce.number().int().min(1).max(4000).default(2000),
  })
  .strict();

const searchBodySchema = z
  .object({
    query: z.string().min(1).max(500),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .strict();

export async function registerMorpheAiRoutes(fastify: FastifyInstance) {  // Health check
  fastify.get("/api/v1/morphe-ai/health", async (_request, reply) => {
    try {
      const res = await fetch(`${MORPHE_AI_URL}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      const data = await res.json();
      return reply.send(data);
    } catch {
      return reply.code(502).send({ status: "unreachable", service: "morphe-ai" });
    }
  });

  // Chat (non-streaming)
  fastify.post(
    "/api/v1/morphe-ai/chat",
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

      try {
        const res = await fetch(`${MORPHE_AI_URL}/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            session_id: body.session_id ?? null,
            message: body.message,
            lang: body.lang,
            mode: body.mode,
            stream: false,
            use_search: body.use_search,
            temperature: body.temperature,
            max_tokens: body.max_tokens,
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) {
          fastify.log.error({ status: res.status }, 'Morphe AI chat error');
          return reply.code(502).send({ error: 'Morphe AI is temporarily unavailable' });
        }

        const data = await res.json();
        return reply.send(data);
      } catch (err) {
        fastify.log.error({ err }, 'Failed to reach Morphe AI service');
        return reply.code(502).send({ error: 'Morphe AI is temporarily unavailable' });
      }
    },
  );

  // Chat (streaming)
  fastify.post(
    "/api/v1/morphe-ai/chat/stream",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const body = chatBodySchema.parse(request.body);

      try {
        const res = await fetch(`${MORPHE_AI_URL}/chat/stream`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            session_id: body.session_id ?? null,
            message: body.message,
            lang: body.lang,
            mode: body.mode,
            stream: true,
            use_search: body.use_search,
            temperature: body.temperature,
            max_tokens: body.max_tokens,
          }),
          signal: AbortSignal.timeout(60_000),
        });

        if (!res.ok) {
          fastify.log.error({ status: res.status }, 'Morphe AI stream error');
          return reply.code(502).send({ error: 'Morphe AI is temporarily unavailable' });
        }

        // Stream the response back to the client
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        const reader = res.body?.getReader();
        if (!reader) {
          return reply.code(502).send({ error: 'Morphe AI stream unavailable' });
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          reply.raw.write(value);
        }
        reply.raw.end();
      } catch (err) {
        fastify.log.error({ err }, 'Failed to stream from Morphe AI service');
        if (!reply.raw.writableEnded) {
          return reply.code(502).send({ error: 'Morphe AI is temporarily unavailable' });
        }
      }
    },
  );

  // Web search
  fastify.post(
    "/api/v1/morphe-ai/search",
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const body = searchBodySchema.parse(request.body);

      try {
        const res = await fetch(`${MORPHE_AI_URL}/search`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: body.query, limit: body.limit }),
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          return reply.code(502).send({ error: 'Search service unavailable' });
        }

        const data = await res.json();
        return reply.send(data);
      } catch {
        return reply.code(502).send({ error: 'Search service unavailable' });
      }
    },
  );

  // File upload
  fastify.post(
    "/api/v1/morphe-ai/upload",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedExts = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json', '.png', '.jpg', '.jpeg'];
      const ext = data.filename.toLowerCase().endsWith('.') 
        ? '' 
        : '.' + data.filename.split('.').pop()?.toLowerCase();
      
      if (!allowedExts.includes(ext)) {
        return reply.code(400).send({ error: `File type ${ext} not allowed` });
      }

      // Validate size (10MB max)
      const MAX_SIZE = 10 * 1024 * 1024;
      let totalSize = 0;
      const chunks: Buffer[] = [];

      for await (const chunk of data.file) {
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE) {
          return reply.code(400).send({ error: 'File too large. Max 10MB' });
        }
        chunks.push(Buffer.from(chunk));
      }

      const fileBuffer = Buffer.concat(chunks);

      try {
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: data.mimetype });
        formData.append('file', blob, data.filename);
        const body = request.body as { session_id?: string };
        if (body.session_id) {
          formData.append('session_id', body.session_id);
        }

        const res = await fetch(`${MORPHE_AI_URL}/upload`, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) {
          return reply.code(502).send({ error: 'Upload service unavailable' });
        }

        const uploadData = await res.json();
        return reply.send(uploadData);
      } catch {
        return reply.code(502).send({ error: 'Upload service unavailable' });
      }
    },
  );

  // Session management
  fastify.get("/api/v1/morphe-ai/session/:id", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const res = await fetch(`${MORPHE_AI_URL}/session/${params.id}`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return reply.code(404).send({ error: 'Session not found' });
      const data = await res.json();
      return reply.send(data);
    } catch {
      return reply.code(502).send({ error: 'Session service unavailable' });
    }
  });

  fastify.delete("/api/v1/morphe-ai/session/:id", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const res = await fetch(`${MORPHE_AI_URL}/session/${params.id}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(5_000),
      });
      return reply.send({ deleted: true });
    } catch {
      return reply.code(502).send({ error: 'Session service unavailable' });
    }
  });

  // Voice options
  fastify.get("/api/v1/morphe-ai/voices", async (_request, reply) => {
    try {
      const res = await fetch(`${MORPHE_AI_URL}/voices`, {
        signal: AbortSignal.timeout(5_000),
      });
      const data = await res.json();
      return reply.send(data);
    } catch {
      return reply.send({
        stt_available: true,
        tts_available: true,
        providers: { stt: "browser", tts: "browser" },
        languages: ["en", "ar"],
      });
    }
  });
}
