import { z } from 'zod'

export const directoryQuerySchema = z.object({
  category: z.string().optional(),
  scope: z.string().optional(),
  stateCode: z.string().length(2).optional(),
})

export const contactQuerySchema = z.object({
  patientId: z.string().uuid(),
})

export const createContactSchema = z.object({
  patientId: z.string().uuid(),
  name: z.string().min(1).max(200),
  phone: z.string().min(3).max(40),
  phoneAlt: z.string().max(40).optional().nullable(),
  relationship: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().optional(),
})

export const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().min(3).max(40).optional(),
  phoneAlt: z.string().max(40).optional().nullable(),
  relationship: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().optional(),
})

export const contactParamsSchema = z.object({ id: z.string().uuid() })
