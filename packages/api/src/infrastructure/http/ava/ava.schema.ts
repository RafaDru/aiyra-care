import { z } from 'zod'

export const avaChatParamsSchema = z.object({
  id: z.string().uuid(),
})

export const avaChatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  healthThreadId: z.string().uuid().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).max(12).optional(),
  /** Aceita Zen DeepSeek Free — dados podem ser usados para melhorar o modelo (OpenCode). */
  allowLlmDataSharing: z.boolean().optional(),
})
