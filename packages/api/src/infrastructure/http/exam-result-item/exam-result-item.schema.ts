import { z } from 'zod'

export const createExamResultItemSchema = z.object({
  examId: z.string().uuid(),
  patientId: z.string().uuid(),
  markerName: z.string().min(1).max(255),
  technicalName: z.string().max(255).optional(),
  numericValue: z.number().optional(),
  displayValue: z.string().min(1).max(100),
  unit: z.string().max(50).optional(),
  referenceRange: z.string().max(255).optional(),
  status: z.enum(['normal', 'altered', 'critical']).optional(),
  collectedAt: z.coerce.date(),
})

export const createExamResultItemBatchSchema = z.object({
  items: z.array(createExamResultItemSchema).min(1).max(200),
})

export const patientMarkersQuerySchema = z.object({
  patientId: z.string().uuid(),
  markerName: z.string().optional(),
})

export const patientMarkersParamsSchema = z.object({
  patientId: z.string().uuid(),
})

export const examMarkersParamsSchema = z.object({
  examId: z.string().uuid(),
})
