import { describe, expect, it, vi } from 'vitest'
import {
  PlatformDefectService,
  PlatformDefectTransitionError,
} from '../src/application/ops/platform-defect.service.js'
import type { PlatformDefectPgRepository } from '../src/infrastructure/persistence/platform-defect.pg.repository.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'

function defect(overrides: Partial<PlatformDefectRecord> = {}): PlatformDefectRecord {
  return {
    id: 'd1',
    title: 'Bug',
    status: 'open',
    fingerprint: null,
    impact: null,
    applications: [],
    ownerSubject: null,
    triageSummary: null,
    triageArtifactPath: null,
    branchName: null,
    prUrl: null,
    prBatchId: null,
    firstSeenAt: new Date().toISOString(),
    fixStartedAt: null,
    readyForPrAt: null,
    fixedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('PlatformDefectService', () => {
  it('rejects illegal status transition with 409 code', async () => {
    const repo = {
      findById: vi.fn(async () => defect({ status: 'open' })),
      updateStatus: vi.fn(),
    } as unknown as PlatformDefectPgRepository

    const svc = new PlatformDefectService(repo)
    await expect(svc.transition('d1', 'ready_for_pr')).rejects.toMatchObject({
      code: 'invalid_transition',
    })
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })

  it('allows open → in_fix → ready_for_pr', async () => {
    let status: PlatformDefectRecord['status'] = 'open'
    const repo = {
      findById: vi.fn(async () => defect({ status })),
      updateStatus: vi.fn(async (_id: string, next: PlatformDefectRecord['status']) => {
        status = next
        return defect({ status })
      }),
    } as unknown as PlatformDefectPgRepository

    const svc = new PlatformDefectService(repo)
    await svc.startFix('d1')
    await svc.transition('d1', 'ready_for_pr', { branchName: 'cursor/fix' })
    expect(status).toBe('ready_for_pr')
  })

  it('dedups createFromTriage by fingerprint', async () => {
    const existing = defect({ id: 'existing', fingerprint: 'fp-1' })
    const repo = {
      findOpenByFingerprint: vi.fn(async () => existing),
      insert: vi.fn(),
      linkIncident: vi.fn(),
    } as unknown as PlatformDefectPgRepository

    const svc = new PlatformDefectService(repo)
    const result = await svc.createFromTriage(
      { title: 'Dup', fingerprint: 'fp-1' },
      'inc-1',
      'agent_triage',
    )
    expect(result.id).toBe('existing')
    expect(repo.insert).not.toHaveBeenCalled()
    expect(repo.linkIncident).toHaveBeenCalledWith('existing', 'inc-1', 'agent_triage')
  })

  it('throws not_found when defect missing', async () => {
    const repo = {
      findById: vi.fn(async () => null),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectService(repo)
    await expect(svc.startFix('missing')).rejects.toBeInstanceOf(PlatformDefectTransitionError)
  })
})
