import { z } from 'zod'

export const avaConversationListQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
})

export const avaConversationCreateBodySchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
})

export const avaConversationParamsSchema = z.object({
  conversationId: z.string().uuid(),
})
