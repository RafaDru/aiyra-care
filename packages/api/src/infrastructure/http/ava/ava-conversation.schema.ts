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

export const avaConversationPatchBodySchema = z.object({
  status: z.enum(['active', 'archived']).optional(),
})

const avaEntityPinSchema = z.discriminatedUnion('entityType', [
  z.object({ entityType: z.literal('exam'), entityId: z.string().uuid() }),
  z.object({ entityType: z.literal('exam_order'), entityId: z.string().uuid() }),
  z.object({ entityType: z.literal('exam_result_item'), entityId: z.string().uuid() }),
  z.object({ entityType: z.literal('exam_marker'), markerName: z.string().min(1).max(255) }),
])

export const avaContextPatchBodySchema = z.object({
  pin: z.object({
    pin: avaEntityPinSchema,
    patientId: z.string().uuid(),
    label: z.string().min(1).max(255).optional(),
    source: z.enum(['user', 'accelerator', 'auto', 'inferred']).optional(),
  }).optional(),
  unpin: avaEntityPinSchema.optional(),
})
