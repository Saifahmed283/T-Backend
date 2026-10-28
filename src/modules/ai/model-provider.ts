export type ChatTurn = { role: 'user' | 'assistant'; text: string }

export type ModelRequest = {
  system: string
  history: ChatTurn[]
  userMessage: string
  maxOutputTokens: number
}

export type ModelResponse = {
  text: string
  model: string
  elapsedMs: number
}

export interface ModelProvider {
  generate(input: ModelRequest): Promise<ModelResponse>
}
