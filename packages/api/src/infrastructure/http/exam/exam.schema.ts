import { z } from 'zod'

export const createExamSchema = z.object({
  patientId: z.string().uuid(),
  medicalRecordId: z.string().uuid().optional(),
  examType: z.string().min(1).max(100),
  examDate: z.coerce.date(),
  resultSummary: z.string().optional(),
  resultFileUrl: z.string().url().optional(),
  laboratory: z.string().max(255).optional(),
  notes: z.string().optional(),
  source: z.string().max(50).optional(),
})

export const updateExamSchema = createExamSchema.partial().omit({ patientId: true })

export const examParamsSchema = z.object({ id: z.string().uuid() })
export const examQuerySchema = z.object({ patientId: z.string().uuid().optional() })
