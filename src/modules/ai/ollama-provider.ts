import type { ModelProvider, ModelRequest, ModelResponse } from './model-provider.js'

export class OllamaProvider implements ModelProvider {
  constructor(
    private baseUrl: string,
    private model: string,
    private timeoutMs: number,
  ) {}

  async generate(input: ModelRequest): Promise<ModelResponse> {
    const start = Date.now()

    const messages = [
      { role: 'system', content: input.system },
      ...input.history.map((turn: any) => ({
        role: turn.role,
        content: turn.text,
      })),
      { role: 'user', content: input.userMessage },
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: input.maxOutputTokens,
          },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        const error = new Error(`Ollama request failed with status ${response.status}: ${text}`)
        ;(error as any).status = response.status
        throw error
      }

      const data = (await response.json()) as {
        message?: { content?: string }
        model?: string
      }

      const text = data.message?.content?.trim() || ''

      return {
        text,
        model: data.model || this.model,
        elapsedMs: Date.now() - start,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('Ollama request timed out')
        ;(timeoutError as any).status = 504
        throw timeoutError
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}
