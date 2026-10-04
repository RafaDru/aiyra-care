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
    referenceCode: 'DEF-000099',
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
    mergedPrUrl: null,
    mergedAt: null,
    fixedVia: null,
    prBatchId: null,
    firstSeenAt: new Date().toISOString(),
    fixStartedAt: null,
    lastFixDispatchSentAt: null,
    readyForPrAt: null,
    fixedAt: null,
    lastFailureKind: null,
    lastFailureSummary: null,
    lastCorrectionFailureDetails: null,
    correctionFailedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('PlatformDefectService', () => {
  it('rejects PATCH transition directly to in_fix', async () => {
    const repo = {
      findById: vi.fn(async () => defect({ status: 'open' })),
      updateStatus: vi.fn(),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectService(repo)
    await expect(svc.transition('d1', 'in_fix')).rejects.toMatchObject({
      code: 'invalid_transition',
    })
  })

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
      updateStatus: vi.fn(
        async (
          _id: string,
          next: PlatformDefectRecord['status'],
          meta?: { markFixDispatchSent?: boolean },
        ) => {
          status = next
          return defect({
            status,
            lastFixDispatchSentAt: meta?.markFixDispatchSent ? new Date().toISOString() : null,
          })
        },
      ),
    } as unknown as PlatformDefectPgRepository

    const svc = new PlatformDefectService(repo)
    await svc.startFix('d1')
    await svc.transition('d1', 'ready_for_pr', {
      branchName: 'cursor/fix',
      prUrl: 'https://github.com/RafaDru/aiyra-care/pull/99',
    })
    expect(status).toBe('ready_for_pr')
  })

  it('rejects ready_for_pr without GitHub prUrl', async () => {
    const repo = {
      findById: vi.fn(async () => defect({ status: 'in_fix' })),
      updateStatus: vi.fn(),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectService(repo)
    await expect(
      svc.transition('d1', 'ready_for_pr', { branchName: 'cursor/fix' }),
    ).rejects.toMatchObject({ code: 'pr_url_required' })
    expect(repo.updateStatus).not.toHaveBeenCalled()
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

  it('records correction_failed as open with failure metadata', async () => {
    const openAfter = defect({
      status: 'open',
      lastFailureKind: 'callback',
      lastFailureSummary: '[blocked] Could not fix',
      lastCorrectionFailureDetails: { message: 'Could not fix', code: 'blocked' },
      correctionFailedAt: new Date().toISOString(),
    })
    const repo = {
      recordCorrectionFailure: vi.fn(async () => openAfter),
      findById: vi.fn(),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectService(repo)
    const result = await svc.applyAgentStatusCallback({
      defectId: 'd1',
      defectStatus: 'correction_failed',
      remediationSummary: '[defect:d1] blocked',
      failureDetails: { message: 'Could not fix', code: 'blocked' },
    })
    expect(result.status).toBe('open')
    expect(repo.recordCorrectionFailure).toHaveBeenCalled()
  })

  it('requires failureDetails for correction_failed', async () => {
    const repo = {} as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectService(repo)
    await expect(
      svc.applyAgentStatusCallback({
        defectId: 'd1',
        defectStatus: 'correction_failed',
        remediationSummary: 'fail',
      }),
    ).rejects.toMatchObject({ code: 'failure_details_required' })
  })

  it('creates recurrence child when fingerprint matches fixed defect after fixed_at', async () => {
    const fixedParent = defect({
      id: 'parent',
      status: 'fixed',
      fingerprint: 'fp-recur',
      fixedAt: '2026-10-01T12:00:00.000Z',
    })
    const child = defect({ id: 'child', fingerprint: 'fp-recur', parentDefectId: 'parent' })
    const repo = {
      findOpenByFingerprint: vi.fn(async () => null),
      findLatestFixedByFingerprint: vi.fn(async () => fixedParent),
      findById: vi.fn(),
      insert: vi.fn(async (input: { parentDefectId?: string | null }) => child),
      linkIncident: vi.fn(),
    } as unknown as PlatformDefectPgRepository

    const svc = new PlatformDefectService(repo)
    const result = await svc.createFromTriage(
      { title: 'Reopened', fingerprint: 'fp-recur' },
      'inc-new',
      'agent_triage',
      { incidentSeenAt: '2026-10-05T00:00:00.000Z' },
    )
    expect(result.id).toBe('child')
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ parentDefectId: 'parent' }),
    )
  })

  it('does not set parent when incident is older than fixed_at', async () => {
    const fixedParent = defect({
      id: 'parent',
      status: 'fixed',
      fingerprint: 'fp-old',
      fixedAt: '2026-10-04T12:00:00.000Z',
    })
    const repo = {
      findOpenByFingerprint: vi.fn(async () => null),
      findLatestFixedByFingerprint: vi.fn(async () => fixedParent),
      findById: vi.fn(),
      insert: vi.fn(async () => defect({ id: 'new' })),
      linkIncident: vi.fn(),
    } as unknown as PlatformDefectPgRepository

    const svc = new PlatformDefectService(repo)
    await svc.createFromTriage(
      { title: 'Same bug', fingerprint: 'fp-old' },
      'inc-old',
      'agent_triage',
      { incidentSeenAt: '2026-10-04T00:00:00.000Z' },
    )
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ parentDefectId: null }),
    )
  })

  it('throws when recurrenceLikely without fingerprint or parentDefectId', async () => {
    const repo = {
      findOpenByFingerprint: vi.fn(),
      findLatestFixedByFingerprint: vi.fn(),
      findById: vi.fn(),
      insert: vi.fn(),
      linkIncident: vi.fn(),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectService(repo)
    await expect(
      svc.createFromTriage(
        { title: 'Unstable' },
        'inc-1',
        'agent_triage',
        { incidentSeenAt: new Date().toISOString(), recurrenceLikely: true },
      ),
    ).rejects.toMatchObject({ code: 'invalid_transition' })
  })

  it('throws not_found when defect missing', async () => {
    const repo = {
      findById: vi.fn(async () => null),
    } as unknown as PlatformDefectPgRepository
    const svc = new PlatformDefectService(repo)
    await expect(svc.startFix('missing')).rejects.toBeInstanceOf(PlatformDefectTransitionError)
  })
})
