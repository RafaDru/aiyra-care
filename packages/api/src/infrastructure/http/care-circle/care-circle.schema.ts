import { z } from 'zod'

export const createCareCircleSchema = z.object({
  name: z.string().min(1).max(120),
})

export const updateCareCircleSchema = z.object({
  name: z.string().min(1).max(120),
})

export const careCircleParamsSchema = z.object({
  id: z.string().uuid(),
})

export const addCircleMemberSchema = z.object({
  accountId: z.string().uuid(),
  role: z.enum(['admin', 'member']).default('member'),
})

export const circleMemberParamsSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
})

export const linkPatientSchema = z.object({
  patientId: z.string().uuid(),
})

export const patientLinkParamsSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
})
