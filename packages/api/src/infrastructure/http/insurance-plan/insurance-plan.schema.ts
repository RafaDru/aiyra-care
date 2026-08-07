import { z } from 'zod'

export const planMembershipQuerySchema = z.object({
  patientId: z.string().uuid(),
})
