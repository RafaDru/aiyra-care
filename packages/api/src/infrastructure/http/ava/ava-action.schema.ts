import { z } from 'zod'

export const avaContextSuggestionsParamsSchema = z.object({
  id: z.string().min(1),
})

export const avaActionExecuteSchema = z.object({
  type: z.enum(['integration_sync', 'clinical_export', 'hygiene_merge', 'hygiene_dismiss']),
  payload: z.record(z.unknown()),
})
