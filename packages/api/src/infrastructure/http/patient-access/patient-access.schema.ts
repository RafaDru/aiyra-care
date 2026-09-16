import { z } from 'zod'

export const patientAccessParamsSchema = z.object({
  id: z.string().uuid(),
})

export const grantParamsSchema = z.object({
  id: z.string().uuid(),
  grantId: z.string().uuid(),
})

export const createGrantSchema = z.object({
  accountId: z.string().uuid(),
  accessLevel: z.enum(['full', 'read_only']).optional(),
  membershipRole: z.enum(['guardian', 'caregiver']).optional(),
})
