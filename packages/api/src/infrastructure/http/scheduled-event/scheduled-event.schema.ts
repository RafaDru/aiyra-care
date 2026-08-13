import { z } from 'zod'

const kindSchema = z.enum(['appointment', 'reminder', 'task'])
const statusSchema = z.enum(['planned', 'done', 'cancelled'])

export const createScheduledEventSchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  scheduledAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  kind: kindSchema.optional(),
  status: statusSchema.optional(),
})

export const updateScheduledEventSchema = createScheduledEventSchema
  .partial()
  .omit({ patientId: true })

export const scheduledEventParamsSchema = z.object({ id: z.string().uuid() })

export const scheduledEventQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
  healthThreadId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export const importIcsSchema = z.object({
  patientId: z.string().uuid(),
  ics: z.string().min(10).max(2_000_000),
  sourceLabel: z.string().max(200).optional(),
})
