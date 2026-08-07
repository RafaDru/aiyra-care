import { z } from 'zod'

export const carePlaceSearchSchema = z.object({
  q: z.string().max(255).optional().default(''),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})
