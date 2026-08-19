import { z } from 'zod'

export const hygieneListQuerySchema = z.object({
  patientId: z.string().uuid().optional(),
})

export const hygieneCandidateParamsSchema = z.object({
  id: z.string().uuid(),
})

export const hygieneResolveBodySchema = z.object({
  decision: z.enum(['same_entity', 'distinct', 'dismissed']),
})
