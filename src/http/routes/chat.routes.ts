import type { FastifyInstance } from 'fastify'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { getAiProvider, PUBLIC_SYSTEM_INSTRUCTION } from '../../modules/ai/index.js'
import { config } from '../../config/config.js'

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().trim().min(1).max(1200),
      }),
    )
    .max(8)
    .default([]),
})

const SYSTEM_INSTRUCTION = PUBLIC_SYSTEM_INSTRUCTION

let geminiClient: GoogleGenAI | undefined

function getGeminiClient(apiKey: string): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey })
  }

  return geminiClient
}

export async function registerChatRoutes(app: FastifyInstance) {
  app.post(
    '/api/v1/public/chat',
    {
      config: {
        rateLimit: {
          max: config.AI_PUBLIC_RATE_LIMIT_MAX || 20,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const parsed = chatRequestSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_CHAT_REQUEST',
            message: 'Please enter a message of up to 1,200 characters.',
          },
        })
      }

      const { message, history } = parsed.data

      try {
        if (config.AI_PROVIDER === 'ollama') {
          try {
            const provider = getAiProvider()
            const result = await provider.generate({
              system: SYSTEM_INSTRUCTION,
              history: history.map((item: any) => ({
                role: item.role,
                text: item.text,
              })),
              userMessage: message,
              maxOutputTokens: config.AI_MAX_OUTPUT_TOKENS,
            })

            if (!result.text) {
              throw new Error('Empty response from Ollama')
            }

            return reply.send({ reply: result.text })
          } catch (ollamaError) {
            request.log.warn({ err: ollamaError }, 'Ollama failed, trying Gemini fallback')
            // Fall through to Gemini
          }
        }

        // Fallback to Gemini if configured
        const apiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY

        if (!apiKey) {
          request.log.error('No AI provider configured')
          return reply.status(503).send({
            error: {
              code: 'AI_NOT_CONFIGURED',
              message: 'The assistant is temporarily unavailable.',
            },
          })
        }

        try {
          const contents = [
            ...history.map((item: any) => ({
              role:
                item.role === 'assistant'
                  ? ('model' as const)
                  : ('user' as const),
              parts: [{ text: item.text }],
            })),
            {
              role: 'user' as const,
              parts: [{ text: message }],
            },
          ]

          const ai = getGeminiClient(apiKey)

          const result = await ai.models.generateContent({
            model: config.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash',
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.3,
              maxOutputTokens: config.AI_MAX_OUTPUT_TOKENS,
            },
          })

          const answer = result.text?.trim()

          if (!answer) {
            return reply.status(502).send({
              error: {
                code: 'EMPTY_AI_RESPONSE',
                message: 'Please try asking your question again.',
              },
            })
          }

          return reply.send({ reply: answer })
        } catch (geminiError) {
          request.log.warn({ err: geminiError }, 'Gemini failed')
          throw geminiError
        }
      } catch (error) {
        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number((error as { status?: unknown }).status)
            : undefined
        const errorMessage =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message)
            : String(error)

        request.log.warn(
          { providerStatus: status, errorMessage },
          'AI chat request failed',
        )

        if (status === 429) {
          return reply.status(429).send({
            error: {
              code: 'AI_RATE_LIMITED',
              message: 'The assistant is busy. Please try again shortly.',
            },
          })
        }

        if (status === 504) {
          return reply.status(504).send({
            error: {
              code: 'AI_TIMEOUT',
              message: 'The assistant took too long to respond. Please try again.',
            },
          })
        }

        return reply.status(502).send({
          error: {
            code: 'AI_UNAVAILABLE',
            message: 'The assistant is temporarily unavailable.',
          },
        })
      }
    },
  )
}
