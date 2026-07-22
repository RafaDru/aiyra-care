import { z } from 'zod'

const documentTypeEnum = z.enum(['prescription', 'exam', 'report', 'vaccine_card', 'other'])

export const createDocumentSchema = z.object({
  patientId: z.string().uuid(),
  documentType: documentTypeEnum,
  originalFilename: z.string().min(1).max(500),
  storagePath: z.string().min(1),
  fileSizeBytes: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  extractedText: z.string().optional(),
  ocrProcessed: z.boolean().optional(),
})

export const updateDocumentSchema = createDocumentSchema.partial().omit({ patientId: true })

export const documentParamsSchema = z.object({ id: z.string().uuid() })
export const documentQuerySchema = z.object({ patientId: z.string().uuid().optional(), documentType: documentTypeEnum.optional() })
