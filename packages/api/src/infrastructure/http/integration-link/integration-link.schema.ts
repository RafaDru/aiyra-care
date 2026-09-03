import { z } from 'zod'

/** Login do portal: e-mail (Unimed) ou CPF/usuário (Amil, Bradesco…). */
const portalLoginSchema = z.string().min(1).max(255)

export const createIntegrationLinkSchema = z.object({
  patientId: z.string().uuid(),
  portalType: z.enum(['unimed', 'amil', 'bradesco_saude', 'conectesus', 'mater_dei', 'hermes_pardini']),
  email: portalLoginSchema.optional(),
  password: z.string().min(1).optional(),
  cardNumber: z.string().optional(),
})

export const updateIntegrationLinkSchema = z.object({
  email: portalLoginSchema.optional(),
  password: z.string().min(1).optional(),
  cardNumber: z.string().optional(),
  active: z.boolean().optional(),
})

export const integrationLinkParamsSchema = z.object({ id: z.string().uuid() })
export const integrationLinkQuerySchema = z.object({ patientId: z.string().uuid() })

export const syncLinkQuerySchema = z.object({
  silent: z.coerce.boolean().optional(),
  force: z.coerce.boolean().optional(),
})

export const syncJobParamsSchema = z.object({ jobId: z.string().uuid() })

export const syncOtpBodySchema = z.object({
  code: z.string().min(4).max(16),
})
