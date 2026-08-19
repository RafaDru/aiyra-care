import { z } from 'zod'

export const examOrderQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
})

export const examOrderParamsSchema = z.object({
  id: z.string().uuid(),
})
