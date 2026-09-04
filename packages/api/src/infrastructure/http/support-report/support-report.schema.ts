import { z } from 'zod'

export const supportReportCategorySchema = z.enum([
  'technical_bug',
  'incorrect_data',
  'ux_confusion',
  'other',
])

export const createSupportReportBodySchema = z.object({
  category: supportReportCategorySchema,
  description: z.string().max(2000).optional(),
  route: z.string().max(256).optional(),
  sessionId: z.string().max(64).optional(),
  patientId: z.string().uuid().optional(),
  consentTechnical: z.boolean(),
  consentScreenshot: z.boolean(),
  consentProfileAccess: z.boolean(),
  screenshotData: z.string().max(600_000).optional(),
  appVersion: z.string().max(64).optional(),
  userAgent: z.string().max(256).optional(),
  clientContext: z.record(z.unknown()).optional(),
})
