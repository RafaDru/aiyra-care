import {
  HealthThread,
  ACTIVE_HEALTH_THREAD_STATUSES,
  type HealthThreadProps,
  type HealthThreadStatus,
} from '../../domain/health-thread/health-thread.entity.js'
import type { HealthThreadRepository, HealthThreadFilter } from '../../domain/health-thread/health-thread.repository.js'
import type { HealthThreadLink } from '../../domain/health-thread/health-thread-link.entity.js'
import { NotFoundError } from '../../domain/errors.js'

const CLOSED_STATUSES: HealthThreadStatus[] = ['resolved', 'ruled_out', 'converted']

export interface HealthThreadGraphSync {
  scheduleThread(thread: HealthThread): void
  scheduleLink(thread: HealthThread, link: HealthThreadLink): void
}

export class HealthThreadService {
  constructor(
    private readonly repo: HealthThreadRepository,
    private readonly graphSync?: HealthThreadGraphSync,
  ) {}

  async create(data: HealthThreadProps) {
    const thread = HealthThread.create(data)
    const saved = await this.repo.save(thread)
    this.graphSync?.scheduleThread(saved)
    return saved
  }

  async findById(id: string) {
    const thread = await this.repo.findById(id)
    if (!thread) throw new NotFoundError('HealthThread', id)
    return thread
  }

  async findAll(filter?: HealthThreadFilter) {
    return this.repo.findAll(filter)
  }

  async findActiveForPatient(patientId: string) {
    return this.repo.findAll({ patientId, activeOnly: true })
  }

  async update(id: string, data: Partial<HealthThreadProps>) {
    const existing = await this.findById(id)
    const merged = { ...existing.toJSON(), ...data, updatedAt: new Date() }
    if (data.status && CLOSED_STATUSES.includes(data.status) && !merged.endedAt) {
      merged.endedAt = new Date()
    }
    const updated = HealthThread.restore(merged)
    const saved = await this.repo.update(updated)
    this.graphSync?.scheduleThread(saved)
    return saved
  }

  async close(id: string, status: HealthThreadStatus) {
    return this.update(id, { status, endedAt: new Date() })
  }

  async delete(id: string) {
    await this.findById(id)
    await this.repo.delete(id)
  }

  isActiveStatus(status: HealthThreadStatus): boolean {
    return ACTIVE_HEALTH_THREAD_STATUSES.includes(status)
  }
}
