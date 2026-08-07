import type { HealthThread, HealthThreadStatus } from './health-thread.entity.js'

export type HealthThreadFilter = {
  patientId?: string
  status?: HealthThreadStatus
  activeOnly?: boolean
}

export interface HealthThreadRepository {
  findById(id: string): Promise<HealthThread | null>
  findAll(filter?: HealthThreadFilter): Promise<HealthThread[]>
  save(thread: HealthThread): Promise<HealthThread>
  update(thread: HealthThread): Promise<HealthThread>
  delete(id: string): Promise<void>
}
