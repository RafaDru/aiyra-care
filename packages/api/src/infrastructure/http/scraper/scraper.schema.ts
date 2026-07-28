import { z } from 'zod'

export const scrapeSchema = z.object({
  cpf: z.string().min(11).max(14).optional(),
  email: z.string().email().optional(),
  /** Required for insurance portals; ConecteSUS uses gov.br interactive login. */
  password: z.string().optional(),
  birthDate: z.string().optional(),
  insuranceMembershipNumber: z.string().optional(),
})

export const portalParamSchema = z.object({
  portal: z.enum(['conectesus', 'unimed', 'amil', 'bradesco_saude']),
})
