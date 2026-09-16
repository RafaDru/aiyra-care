import { z } from 'zod'

export const updateNotificationPreferencesSchema = z.object({
  syncEscalationEmail: z.boolean(),
})
