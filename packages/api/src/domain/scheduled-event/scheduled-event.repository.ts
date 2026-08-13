import type { ScheduledEvent } from './scheduled-event.entity.js'

export type ScheduledEventFilter = {
  patientId?: string
  healthThreadId?: string
  status?: string
  from?: Date
  to?: Date
}

export interface ScheduledEventRepository {
  findById(id: string): Promise<ScheduledEvent | null>
  findByExternalUid(patientId: string, externalUid: string): Promise<ScheduledEvent | null>
  findFuzzyDuplicate(patientId: string, title: string, scheduledAt: Date): Promise<ScheduledEvent | null>
  findAll(filter?: ScheduledEventFilter): Promise<ScheduledEvent[]>
  save(event: ScheduledEvent): Promise<ScheduledEvent>
  update(event: ScheduledEvent): Promise<ScheduledEvent>
  delete(id: string): Promise<void>
}
