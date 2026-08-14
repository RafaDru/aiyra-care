import type { CareReminder } from './care-reminder.entity.js'

export type CareReminderFilter = {
  patientId?: string
  healthThreadId?: string
  activeOnly?: boolean
  pendingOnly?: boolean
}

export interface CareReminderRepository {
  findById(id: string): Promise<CareReminder | null>
  findAll(filter?: CareReminderFilter): Promise<CareReminder[]>
  save(reminder: CareReminder): Promise<CareReminder>
  update(reminder: CareReminder): Promise<CareReminder>
  delete(id: string): Promise<void>
}
