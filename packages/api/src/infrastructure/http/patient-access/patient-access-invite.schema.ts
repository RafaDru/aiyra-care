import { z } from 'zod'

export const createInviteSchema = z.object({
  inviteeEmail: z.string().email().max(255),
  patientIds: z.array(z.string().uuid()).min(1),
  accessLevel: z.enum(['full', 'read_only']).optional(),
  membershipRole: z.enum(['guardian', 'caregiver']).optional(),
  careCircleId: z.string().uuid().optional(),
  circleRole: z.enum(['member', 'admin']).optional(),
  legitimacyAck: z.literal(true, {
    errorMap: () => ({ message: 'Confirme a legitimidade do convite' }),
  }),
})

export const inviteParamsSchema = z.object({
  id: z.string().uuid(),
})

export const inviteTokenParamsSchema = z.object({
  token: z.string().min(16).max(64),
})

export const acceptInviteSchema = z.object({
  token: z.string().min(16).max(64),
})
