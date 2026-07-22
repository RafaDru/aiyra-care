import { z } from 'zod'

const numericPositive = z.number().positive().max(999.99).optional()

export const createGrowthRecordSchema = z.object({
  patientId: z.string().uuid(),
  recordDate: z.coerce.date(),
  weightKg: numericPositive,
  heightCm: numericPositive,
  headCircumferenceCm: numericPositive,
  bmi: numericPositive,
  percentileWeight: numericPositive,
  percentileHeight: numericPositive,
  notes: z.string().optional(),
})

export const updateGrowthRecordSchema = createGrowthRecordSchema.partial().omit({ patientId: true })

export const growthRecordParamsSchema = z.object({ id: z.string().uuid() })
export const growthRecordQuerySchema = z.object({ patientId: z.string().uuid().optional() })
