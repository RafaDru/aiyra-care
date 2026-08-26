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
  /** Pin de entidade — bloco REGISTRO EM FOCO no prompt (aceleradores G1). */
  entityPin: z.discriminatedUnion('entityType', [
    z.object({ entityType: z.literal('exam'), entityId: z.string().uuid() }),
    z.object({ entityType: z.literal('exam_order'), entityId: z.string().uuid() }),
    z.object({ entityType: z.literal('exam_result_item'), entityId: z.string().uuid() }),
    z.object({ entityType: z.literal('exam_marker'), markerName: z.string().min(1).max(255) }),
  ]).optional(),
  /** Emite eventos SSE de atividade (ferramentas + reflexão) durante o turno. */
  streamActivity: z.boolean().optional(),
})
