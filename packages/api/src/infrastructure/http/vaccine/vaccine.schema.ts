import { z } from 'zod'

export const createVaccineSchema = z.object({
  patientId: z.string().uuid(),
  vaccineName: z.string().min(1).max(255),
  doseNumber: z.number().int().positive().optional(),
  batchNumber: z.string().max(100).optional(),
  applicationDate: z.coerce.date(),
  nextDoseDate: z.coerce.date().optional(),
  appliedBy: z.string().max(255).optional(),
  clinic: z.string().max(255).optional(),
  notes: z.string().optional(),
  source: z.string().max(50).optional(),
})

export const updateVaccineSchema = createVaccineSchema.partial().omit({ patientId: true })

export const vaccineParamsSchema = z.object({ id: z.string().uuid() })
export const vaccineQuerySchema = z.object({ patientId: z.string().uuid().optional() })
