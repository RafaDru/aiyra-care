import { describe, it, expect, beforeEach } from 'vitest'
import type { SyncResult } from '../src/infrastructure/scraper/sync-progress-store.js'
import type { SyncNoveltySummary } from '../src/domain/sync-job/sync-job.entity.js'
import { SyncJob as SyncJobEntity } from '../src/domain/sync-job/sync-job.entity.js'
import type { SyncJobPgRepository } from '../src/infrastructure/persistence/sync-job.pg.repository.js'
import { createJob, updateJob, getJob, removeJob, bindSyncJobPersistence } from '../src/infrastructure/scraper/sync-progress-store.js'

class FakeSyncJobRepo implements Pick<SyncJobPgRepository, 'save' | 'updateProgress' | 'findById'> {
  private rows = new Map<string, ReturnType<SyncJobEntity['toJSON']>>

  async save(job: SyncJobEntity): Promise<SyncJobEntity> {
    this.rows.set(job.id, job.toJSON())
    return job
  }

  async updateProgress(args: {
    id: string
    step: string
    message: string
    status: 'pending' | 'running' | 'success' | 'failed'
    stepDetails: Record<string, { status: string; message: string }>
    result?: SyncResult
    novelty?: SyncNoveltySummary
    error?: string
    finishedAt?: Date
  }): Promise<void> {
    const prev = this.rows.get(args.id)
    if (!prev) return
    const terminalIncoming = args.status === 'success' || args.status === 'failed'
    if (!terminalIncoming && (prev.status === 'success' || prev.status === 'failed')) {
      return
    }
    this.rows.set(args.id, {
      ...prev,
      step: args.step,
      message: args.message,
      status: args.status,
      stepDetails: args.stepDetails,
      result: args.result ?? prev.result,
      novelty: args.novelty ?? prev.novelty,
      error: args.status === 'failed' ? (args.error ?? args.message) : terminalIncoming ? null : prev.error,
      finishedAt: terminalIncoming ? (args.finishedAt ?? new Date()) : prev.finishedAt,
      updatedAt: new Date(),
    })
  }

  async findById(id: string): Promise<SyncJobEntity | null> {
    const row = this.rows.get(id)
    return row ? SyncJobEntity.restore(row) : null
  }
}

describe('sync-progress-store', () => {
  beforeEach(() => {
    bindSyncJobPersistence(new FakeSyncJobRepo() as SyncJobPgRepository)
  })

  it('createJob stores scheduled trigger in PG', async () => {
    const repo = new FakeSyncJobRepo()
    bindSyncJobPersistence(repo as SyncJobPgRepository)
    const id = await createJob('unimed', 'test-link-id', { trigger: 'scheduled' })
    const entity = await repo.findById(id)
    expect(entity?.toJSON().trigger).toBe('scheduled')
  })

  it('creates and retrieves a job from PG', async () => {
    const id = await createJob('unimed', 'link-1')
    expect(id).toBeTruthy()
    const job = await getJob(id)
    expect(job?.progress.status).toBe('running')
    expect(job?.progress.step).toBe('pending')
  })

  it('updates job progress', async () => {
    const id = await createJob('unimed', 'link-1')
    await updateJob(id, { step: 'login', message: 'Logging in...', status: 'running' })
    const job = await getJob(id)
    expect(job?.progress.step).toBe('login')
    expect(job?.progress.message).toBe('Logging in...')
  })

  it('updates job progress with result', async () => {
    const id = await createJob('unimed', 'link-1')
    await updateJob(id, { step: 'done', message: 'Done', status: 'success' }, {
      exams: 3, medicalRecords: 1, authorizations: 2, authorizationItems: 17,
      updatedAuthorizations: 0, total: 6, authorizationDetails: [],
    })
    const job = await getJob(id)
    expect(job?.result?.total).toBe(6)
    expect(job?.result?.authorizations).toBe(2)
  })

  it('preserves result when later progress omits it', async () => {
    const id = await createJob('unimed', 'link-1')
    await updateJob(id, { step: 'done', message: 'Done', status: 'success' }, {
      exams: 1, medicalRecords: 0, authorizations: 0, authorizationItems: 0,
      updatedAuthorizations: 0, total: 1, authorizationDetails: [],
    })
    await updateJob(id, { step: 'done', message: 'Still done', status: 'success' })
    expect((await getJob(id))?.result?.total).toBe(1)
  })

  it('tracks per-step status for fetch substeps', async () => {
    const id = await createJob('unimed', 'link-1')
    await updateJob(id, { step: 'fetch-exams', message: 'Buscando exames...', status: 'running' })
    await updateJob(id, { step: 'fetch-exams', message: 'HTTP 500', status: 'failed' })
    const job = await getJob(id)
    expect(job?.stepDetails['fetch-exams']?.status).toBe('failed')
    expect(job?.stepDetails['fetch-exams']?.message).toBe('HTTP 500')
  })

  it('stores warnings on result', async () => {
    const id = await createJob('unimed', 'link-1')
    await updateJob(id, { step: 'done', message: 'Done', status: 'success' }, {
      exams: 0, medicalRecords: 1, authorizations: 0, authorizationItems: 0,
      updatedAuthorizations: 0, total: 1, authorizationDetails: [],
      warnings: ['Exames: erro 500'],
    })
    expect((await getJob(id))?.result?.warnings).toEqual(['Exames: erro 500'])
  })

  it('marks login success when fetch substeps start', async () => {
    const id = await createJob('unimed', 'link-1')
    await updateJob(id, { step: 'login', message: 'Autenticando...', status: 'running' })
    await updateJob(id, { step: 'fetch-exams', message: 'Buscando exames...', status: 'running' })
    const job = await getJob(id)
    expect(job?.stepDetails.login?.status).toBe('success')
    expect(job?.stepDetails['fetch-exams']?.status).toBe('running')
  })

  it('keeps final login message when login succeeds before fetch', async () => {
    const id = await createJob('hermes_pardini', 'link-1')
    await updateJob(id, { step: 'login', message: 'Autenticando no Hermes Pardini…', status: 'running' })
    await updateJob(id, {
      step: 'login',
      message: '[[fleury_otp_in_app]] Digite o código recebido',
      status: 'success',
    })
    await updateJob(id, { step: 'fetch-exams', message: 'Buscando...', status: 'running' })
    const job = await getJob(id)
    expect(job?.stepDetails.login?.message).toContain('fleury_otp_in_app')
    expect(job?.stepDetails.login?.status).toBe('success')
  })

  it('does not downgrade terminal job when late progress arrives', async () => {
    const id = await createJob('amil', 'link-1')
    await updateJob(id, { step: 'done', message: 'Sincronização Amil concluída', status: 'success' }, {
      exams: 0, medicalRecords: 0, authorizations: 0, authorizationItems: 0,
      updatedAuthorizations: 0, total: 0, authorizationDetails: [],
    })
    await updateJob(id, { step: 'fetch-autorizacoes', message: 'Guias...', status: 'running' })
    const job = await getJob(id)
    expect(job?.progress.step).toBe('done')
    expect(job?.progress.status).toBe('success')
  })

  it('returns undefined for unknown job', async () => {
    expect(await getJob('nonexistent')).toBeUndefined()
  })

  it('removeJob keeps persisted state', async () => {
    const id = await createJob('unimed', 'link-1')
    await updateJob(id, { step: 'done', message: 'Done', status: 'success' })
    removeJob(id)
    expect((await getJob(id))?.progress.step).toBe('done')
  })
})
