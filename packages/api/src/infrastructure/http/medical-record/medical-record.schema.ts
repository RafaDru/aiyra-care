import { z } from 'zod'

export const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid(),
  recordDate: z.coerce.date(),
  recordType: z.string().min(1).max(50),
  description: z.string().optional(),
  doctorName: z.string().max(255).optional(),
  doctorCrm: z.string().max(50).optional(),
  specialty: z.string().max(100).optional(),
  clinicName: z.string().max(255).optional(),
  notes: z.string().optional(),
})

export const updateMedicalRecordSchema = createMedicalRecordSchema.partial().omit({ patientId: true })

export const medicalRecordParamsSchema = z.object({ id: z.string().uuid() })
export const medicalRecordQuerySchema = z.object({ patientId: z.string().uuid().optional() })
