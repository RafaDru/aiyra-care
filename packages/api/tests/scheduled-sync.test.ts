import { describe, it, expect, beforeEach } from 'vitest'
import { IntegrationLink } from '../src/domain/integration-link/integration-link.entity.js'
import { IntegrationLinkSyncService } from '../src/application/integration-link/integration-link-sync.service.js'
import type { IntegrationLinkRepository } from '../src/domain/integration-link/integration-link.repository.js'
import type { SyncJobPgRepository } from '../src/infrastructure/persistence/sync-job.pg.repository.js'
import { SyncJob } from '../src/domain/sync-job/sync-job.entity.js'

class FakeLinkRepo implements Pick<IntegrationLinkRepository, 'findSyncableActive' | 'update'> {
  links: IntegrationLink[] = []

  async findSyncableActive() {
    return this.links
  }

  async update(link: IntegrationLink) {
    return link
  }
}

class FakeSyncJobRepo implements Pick<SyncJobPgRepository, 'save' | 'updateProgress' | 'findById' | 'findActiveByLinkId' | 'findLastCompletedByLinkId'> {
  private jobs = new Map<string, ReturnType<SyncJob['toJSON']>>

  async save(job: SyncJob) {
    this.jobs.set(job.id, job.toJSON())
    return job
  }

  async updateProgress(args: {
    id: string
    step: string
    message: string
    status: 'pending' | 'running' | 'success' | 'failed'
    stepDetails: Record<string, { status: string; message: string }>
  }) {
    const prev = this.jobs.get(args.id)
    if (!prev) return
    this.jobs.set(args.id, { ...prev, step: args.step, message: args.message, status: args.status, stepDetails: args.stepDetails })
  }

  async findById(id: string) {
    const row = this.jobs.get(id)
    return row ? SyncJob.restore(row) : null
  }

  async findActiveByLinkId(_linkId: string) {
    return null
  }

  async findLastCompletedByLinkId(_linkId: string) {
    return null
  }
}

describe('IntegrationLinkSyncService scheduled sync', () => {
  const pool = {} as import('pg').Pool
  let linkRepo: FakeLinkRepo
  let service: IntegrationLinkSyncService

  beforeEach(() => {
    linkRepo = new FakeLinkRepo()
    const jobRepo = new FakeSyncJobRepo()
    service = new IntegrationLinkSyncService(pool, linkRepo as IntegrationLinkRepository, jobRepo as SyncJobPgRepository)
  })

  it('requestSync skips silent sync without persisted session', async () => {
    const link = IntegrationLink.create({
      patientId: 'p1',
      portalType: 'amil',
      email: 'a@b.com',
      encryptedPassword: 'enc',
      active: true,
    })
    const result = await service.requestSync(link, { silent: true, background: false })
    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('session_required')
  })

  it('runScheduledBatch reports session_required for eligible links without session', async () => {
    linkRepo.links = [
      IntegrationLink.create({
        patientId: 'p1',
        portalType: 'amil',
        email: 'a@b.com',
        encryptedPassword: 'enc',
        active: true,
      }),
    ]
    const report = await service.runScheduledBatch()
    expect(report.candidates).toBe(1)
    expect(report.skipped).toBe(1)
    expect(report.items[0].reason).toBe('session_required')
  })
})
