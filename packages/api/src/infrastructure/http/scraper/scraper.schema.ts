import { z } from 'zod'

export const scrapeSchema = z.object({
  cpf: z.string().min(11).max(14),
})

export const portalParamSchema = z.object({
  portal: z.enum(['conectesus']),
})
