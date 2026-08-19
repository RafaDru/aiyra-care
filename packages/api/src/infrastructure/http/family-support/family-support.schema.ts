import { z } from 'zod'

export const familySupportQuerySchema = z.object({
  medicationName: z.string().max(200).optional(),
  healthThreadId: z.string().uuid().optional(),
})

export const familySupportParamsSchema = z.object({
  id: z.string().uuid(),
})
