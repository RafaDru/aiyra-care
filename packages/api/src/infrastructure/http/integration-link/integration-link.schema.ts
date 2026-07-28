import { z } from 'zod'

export const createIntegrationLinkSchema = z.object({
  patientId: z.string().uuid(),
  portalType: z.enum(['unimed', 'amil', 'bradesco_saude', 'conectesus']),
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  cardNumber: z.string().optional(),
})

export const updateIntegrationLinkSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  cardNumber: z.string().optional(),
  active: z.boolean().optional(),
})

export const integrationLinkParamsSchema = z.object({ id: z.string().uuid() })
export const integrationLinkQuerySchema = z.object({ patientId: z.string().uuid() })
