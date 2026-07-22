import { z } from 'zod'

export const createAllergySchema = z.object({
  patientId: z.string().uuid(),
  allergen: z.string().min(1).max(255),
  reaction: z.string().optional(),
  severity: z.string().max(50).optional(),
  diagnosedDate: z.coerce.date().optional(),
  notes: z.string().optional(),
})

export const updateAllergySchema = createAllergySchema.partial().omit({ patientId: true })

export const allergyParamsSchema = z.object({ id: z.string().uuid() })
export const allergyQuerySchema = z.object({ patientId: z.string().uuid().optional() })
