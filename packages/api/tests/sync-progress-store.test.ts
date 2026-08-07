import { describe, it, expect } from 'vitest'
import { createJob, updateJob, getJob, removeJob } from '../src/infrastructure/scraper/sync-progress-store.js'

describe('sync-progress-store', () => {
  it('creates and retrieves a job', () => {
    const id = createJob()
    expect(id).toBeTruthy()
    const job = getJob(id)
    expect(job?.progress.status).toBe('running')
    expect(job?.progress.step).toBe('pending')
  })

  it('updates job progress', () => {
    const id = createJob()
    updateJob(id, { step: 'login', message: 'Logging in...', status: 'running' })
    const job = getJob(id)
    expect(job?.progress.step).toBe('login')
    expect(job?.progress.message).toBe('Logging in...')
  })

  it('updates job progress with result', () => {
    const id = createJob()
    updateJob(id, { step: 'done', message: 'Done', status: 'success' }, {
      exams: 3, medicalRecords: 1, authorizations: 2, authorizationItems: 17,
      updatedAuthorizations: 0, total: 6, authorizationDetails: [],
    })
    const job = getJob(id)
    expect(job?.result?.total).toBe(6)
    expect(job?.result?.authorizations).toBe(2)
  })

  it('preserves result when later progress omits it', () => {
    const id = createJob()
    updateJob(id, { step: 'done', message: 'Done', status: 'success' }, {
      exams: 1, medicalRecords: 0, authorizations: 0, authorizationItems: 0,
      updatedAuthorizations: 0, total: 1, authorizationDetails: [],
    })
    updateJob(id, { step: 'done', message: 'Still done', status: 'success' })
    expect(getJob(id)?.result?.total).toBe(1)
  })

  it('tracks per-step status for fetch substeps', () => {
    const id = createJob()
    updateJob(id, { step: 'fetch-exams', message: 'Buscando exames...', status: 'running' })
    updateJob(id, { step: 'fetch-exams', message: 'HTTP 500', status: 'failed' })
    const job = getJob(id)
    expect(job?.stepDetails['fetch-exams']?.status).toBe('failed')
    expect(job?.stepDetails['fetch-exams']?.message).toBe('HTTP 500')
  })

  it('stores warnings on result', () => {
    const id = createJob()
    updateJob(id, { step: 'done', message: 'Done', status: 'success' }, {
      exams: 0, medicalRecords: 1, authorizations: 0, authorizationItems: 0,
      updatedAuthorizations: 0, total: 1, authorizationDetails: [],
      warnings: ['Exames: erro 500'],
    })
    expect(getJob(id)?.result?.warnings).toEqual(['Exames: erro 500'])
  })

  it('returns undefined for unknown job', () => {
    expect(getJob('nonexistent')).toBeUndefined()
  })

  it('removes a job', () => {
    const id = createJob()
    removeJob(id)
    expect(getJob(id)).toBeUndefined()
  })
})
