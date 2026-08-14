import { z } from 'zod'

export const careReminderQuerySchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid().optional(),
  activeOnly: z.coerce.boolean().optional(),
})

export const createCareReminderSchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid().optional().nullable(),
  reminderKind: z.enum(['measurement', 'medication']),
  targetCode: z.string().max(64).optional().nullable(),
  medicationName: z.string().max(500).optional().nullable(),
  title: z.string().min(1).max(500),
  intervalMinutes: z.number().int().min(15).max(1440).default(240),
  nextFireAt: z.coerce.date().optional(),
  doseHint: z.string().max(200).optional().nullable(),
})

export const illnessPackSchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid(),
  vitalsIntervalMinutes: z.number().int().min(15).max(1440).optional(),
  medicationName: z.string().max(500).optional(),
  medicationIntervalMinutes: z.number().int().min(15).max(1440).optional(),
  doseHint: z.string().max(200).optional(),
})

export const careReminderParamsSchema = z.object({ id: z.string().uuid() })

export const snoozeBodySchema = z.object({
  minutes: z.number().int().min(5).max(480).default(30),
})

export const monitoringExportQuerySchema = z.object({
  patientId: z.string().uuid(),
  healthThreadId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})
