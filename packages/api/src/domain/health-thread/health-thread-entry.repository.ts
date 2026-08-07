import type { HealthThreadEntry } from './health-thread-entry.entity.js'

export interface HealthThreadEntryRepository {
  findByThreadId(threadId: string): Promise<HealthThreadEntry[]>
  save(entry: HealthThreadEntry): Promise<HealthThreadEntry>
}
