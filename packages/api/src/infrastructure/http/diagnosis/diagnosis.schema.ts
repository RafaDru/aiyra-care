import { z } from 'zod'

export const createDiagnosisSchema = z.object({
  medicalRecordId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  diagnosisCode: z.string().max(20).optional(),
  diagnosisName: z.string().min(1),
  description: z.string().optional(),
  isChronic: z.boolean().optional(),
  diagnosedDate: z.coerce.date().optional(),
  status: z.string().max(50).optional(),
})

export const updateDiagnosisSchema = createDiagnosisSchema.partial().omit({ patientId: true })

export const diagnosisParamsSchema = z.object({ id: z.string().uuid() })
export const diagnosisQuerySchema = z.object({ patientId: z.string().uuid().optional(), medicalRecordId: z.string().uuid().optional() })
