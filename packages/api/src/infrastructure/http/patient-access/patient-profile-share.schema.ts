import { z } from 'zod'

export const createProfileShareSchema = z.object({
  patientId: z.string().uuid(),
  targetAccountEmail: z.string().email(),
  legitimacyAck: z.literal(true),
})

export const acceptProfileShareSchema = z.object({
  token: z.string().min(16),
  circleId: z.string().uuid(),
})

export const acceptProfileShareByIdSchema = z.object({
  circleId: z.string().uuid(),
})

export const profileShareParamsSchema = z.object({
  id: z.string().uuid(),
})

export const profileShareTokenParamsSchema = z.object({
  token: z.string().min(16),
})
