import { z } from 'zod'

const recordBase = {
  externalKey: z.string().nullable().optional(),
  raw: z.record(z.unknown()).nullable().optional(),
  beneficiaryKey: z.string().nullable().optional(),
  beneficiaryName: z.string().nullable().optional(),
}

export const canonicalRecordSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('authorization'),
    ...recordBase,
    solicitationNumber: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    classification: z.string().nullable().optional(),
    doctorName: z.string().nullable().optional(),
    requestedAt: z.string().nullable().optional(),
    validUntil: z.string().nullable().optional(),
    items: z.array(z.object({ type: z.literal('authorization_item'), ...recordBase })).optional(),
  }),
  z.object({ type: z.literal('authorization_item'), ...recordBase, parentExternalKey: z.string().nullable().optional() }),
  z.object({
    type: z.literal('exam'),
    ...recordBase,
    name: z.string(),
    performedAt: z.string().nullable().optional(),
    laboratory: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal('medical_record'),
    ...recordBase,
    recordType: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal('immunization'),
    ...recordBase,
    vaccineName: z.string(),
    administeredAt: z.string().nullable().optional(),
  }),
  z.object({ type: z.literal('coverage'), ...recordBase, planName: z.string().nullable().optional() }),
  z.object({ type: z.literal('coverage_membership'), ...recordBase, memberNumber: z.string().nullable().optional() }),
  z.object({
    type: z.literal('beneficiary'),
    ...recordBase,
    name: z.string(),
    marcaOtica: z.string().nullable().optional(),
    cpf: z.string().nullable().optional(),
  }),
  z.object({ type: z.literal('document_reference'), ...recordBase, url: z.string().nullable().optional() }),
])

export const canonicalSyncBatchSchema = z.object({
  batchId: z.string().uuid(),
  connectionId: z.string().uuid(),
  connectorId: z.string(),
  jobId: z.string().uuid(),
  tenantRef: z.string().nullable().optional(),
  startedAt: z.string(),
  finishedAt: z.string().nullable().optional(),
  status: z.enum(['completed', 'failed', 'partial']),
  records: z.array(canonicalRecordSchema),
  stats: z.record(z.number()),
  warnings: z.array(z.string()).optional(),
})
