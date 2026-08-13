import { z } from 'zod'
import { LEGAL_DOCUMENT_KINDS } from '../../../domain/legal-compliance/legal-document-kind.js'

export const legalKindParamSchema = z.object({
  kind: z.enum(LEGAL_DOCUMENT_KINDS),
})

export const acceptComplianceSchema = z.object({
  kinds: z.array(z.enum(LEGAL_DOCUMENT_KINDS)).optional(),
  documentIds: z.array(z.string().uuid()).optional(),
}).refine(
  (v) => !v.kinds?.length && !v.documentIds?.length ? true : true,
  { message: 'kinds ou documentIds opcionais — vazio aceita todos pendentes obrigatórios' },
)
