import { z } from 'zod'

export const organizationKindSchema = z.enum(['clinic', 'lab', 'pharmacy', 'plan', 'other'])
export const organizationMemberRoleSchema = z.enum(['admin', 'clinician', 'read_only'])

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(255),
  kind: organizationKindSchema.default('other'),
})

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  kind: organizationKindSchema.optional(),
})

export const organizationParamsSchema = z.object({
  id: z.string().uuid(),
})

export const addMemberSchema = z.object({
  accountId: z.string().uuid(),
  role: organizationMemberRoleSchema.default('read_only'),
})

export const updateMemberSchema = z.object({
  role: organizationMemberRoleSchema,
})

export const memberParamsSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
})
