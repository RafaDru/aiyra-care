import { z } from 'zod'
import { CLINICAL_ENTITY_TYPES } from '../../../domain/clinical-link/clinical-entity-type.js'

const clinicalEntityTypeSchema = z.enum(CLINICAL_ENTITY_TYPES)

export const patientIdParamsSchema = z.object({
  patientId: z.string().uuid(),
})

export const clinicalLinkParamsSchema = z.object({
  id: z.string().uuid(),
})

export const createClinicalLinkSchema = z.object({
  fromEntityType: clinicalEntityTypeSchema,
  fromEntityId: z.string().uuid(),
  toEntityType: clinicalEntityTypeSchema,
  toEntityId: z.string().uuid(),
  relationCode: z.string().min(1).max(40),
  label: z.string().max(255).optional().nullable(),
  healthThreadId: z.string().uuid().optional().nullable(),
})

export const clinicalLinkQuerySchema = z.object({
  entityType: clinicalEntityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
})

export const relationTypeQuerySchema = z.object({
  fromEntityType: z.string().optional(),
  toEntityType: z.string().optional(),
})

export const threadFlowParamsSchema = z.object({
  id: z.string().uuid(),
})
