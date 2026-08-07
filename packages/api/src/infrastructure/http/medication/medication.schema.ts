import { z } from 'zod'

export const createMedicationSchema = z.object({
  patientId: z.string().uuid(),
  medicalRecordId: z.string().uuid().optional(),
  genericName: z.string().min(1).max(255),
  brandName: z.string().max(255).optional(),
  dosage: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
  route: z.string().max(50).optional(),
  duration: z.string().max(100).optional(),
  startDate: z.coerce.date().optional(),
  startedAt: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  endDateIsProjected: z.boolean().optional(),
  prescribingDoctor: z.string().max(255).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const updateMedicationSchema = createMedicationSchema.partial().omit({ patientId: true })

export const medicationParamsSchema = z.object({ id: z.string().uuid() })
export const medicationQuerySchema = z.object({ patientId: z.string().uuid().optional(), isActive: z.coerce.boolean().optional() })
