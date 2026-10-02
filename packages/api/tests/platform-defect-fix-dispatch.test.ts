import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildPlatformDefectFixDispatchPayload,
  defectFixPlaybookId,
  dispatchPlatformDefectFix,
  startPlatformDefectFixWithDispatch,
} from '../src/application/ops/platform-defect-fix-dispatch.js'
import { PlatformDefectService } from '../src/application/ops/platform-defect.service.js'
import type { PlatformDefectRecord } from '../src/domain/ops/platform-defect.types.js'

const sampleDefect: PlatformDefectRecord = {
  id: '0e672818-72ec-4ef7-918e-312db34bbeb5',
  referenceCode: 'DEF-000001',
  title: 'Sync silent skip',
  status: 'in_fix',
  fingerprint: 'fp-abc',
  impact: 3,
  applications: ['web', 'api'],
  ownerSubject: null,
  triageSummary: 'Hipótese: session gate',
  triageArtifactPath: 'docs/ops/investigations/sample.md',
  branchName: null,
  prUrl: null,
  prBatchId: null,
  firstSeenAt: '2026-09-28T12:00:00.000Z',
  fixStartedAt: '2026-09-28T13:00:00.000Z',
  lastFixDispatchSentAt: '2026-09-28T13:00:00.000Z',
  readyForPrAt: null,
  fixedAt: null,
  createdAt: '2026-09-28T11:00:00.000Z',
  updatedAt: '2026-09-28T13:00:00.000Z',
}

describe('platform-defect-fix-dispatch', () => {
  afterEach(() => {
    delete process.env.CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_URL
    delete process.env.CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_KEY
    delete process.env.OPS_INVESTIGATOR_CALLBACK_KEY
    delete process.env.OPS_METRICS_KEY
    delete process.env.OPS_INVESTIGATOR_TIER1
    delete process.env.OPS_DEFECT_FIX_TIER1
    vi.unstubAllGlobals()
  })

  it('builds defect_fix_v1 payload with callback auth and tag line', () => {
    process.env.OPS_INVESTIGATOR_CALLBACK_KEY = 'callback-secret'
    const built = buildPlatformDefectFixDispatchPayload(sampleDefect, [
      '96a2e898-9d36-4495-82e6-76eb17fc555e',
    ])
    expect('error' in built).toBe(false)
    if ('error' in built) return
    expect(built.type).toBe('defect_fix_v1')
    expect(built.defectId).toBe(sampleDefect.id)
    expect(built.linkedIncidentIds).toEqual(['96a2e898-9d36-4495-82e6-76eb17fc555e'])
    expect(built.callbackAuth).toEqual({
      header: 'x-investigator-callback-key',
      value: 'callback-secret',
    })
    expect(built.playbook).toBe(defectFixPlaybookId(0))
    expect(built.defect.referenceCode).toBe('DEF-000001')
    expect(built.text).toBe('DEF-000001 · [defect:0e672818] Correção: Sync silent skip')
    expect(built.environment.deploymentTier).toBe('integration')
    expect(JSON.stringify(built)).not.toContain('patient')
  })

  it('omits referenceCode prefix in text when null', () => {
    process.env.OPS_INVESTIGATOR_CALLBACK_KEY = 'callback-secret'
    const noRef = { ...sampleDefect, referenceCode: null }
    const built = buildPlatformDefectFixDispatchPayload(noRef, [])
    expect('error' in built).toBe(false)
    if ('error' in built) return
    expect(built.defect.referenceCode).toBeNull()
    expect(built.text).toBe('[defect:0e672818] Correção: Sync silent skip')
  })

  it('uses tier1 playbook when OPS_INVESTIGATOR_TIER1=1', () => {
    process.env.OPS_INVESTIGATOR_TIER1 = '1'
    process.env.OPS_METRICS_KEY = 'ops-key'
    const built = buildPlatformDefectFixDispatchPayload(sampleDefect, [])
    expect('error' in built).toBe(false)
    if ('error' in built) return
    expect(built.playbook).toBe('defect-fix-tier1')
    expect(built.investigation.tier).toBe(1)
  })

  it('uses OPS_DEFECT_FIX_TIER1 over OPS_INVESTIGATOR_TIER1', () => {
    process.env.OPS_INVESTIGATOR_TIER1 = '0'
    process.env.OPS_DEFECT_FIX_TIER1 = '1'
    process.env.OPS_METRICS_KEY = 'ops-key'
    const built = buildPlatformDefectFixDispatchPayload(sampleDefect, [])
    expect('error' in built).toBe(false)
    if ('error' in built) return
    expect(built.investigation.tier).toBe(1)
  })

  it('dispatches when webhook configured', async () => {
    process.env.CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/defect-fix'
    process.env.CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_KEY = 'crsr_test'
    process.env.OPS_METRICS_KEY = 'ops-key'
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await dispatchPlatformDefectFix(sampleDefect, [])
    expect(result).toEqual({ outcome: 'sent' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer crsr_test',
      'Content-Type': 'application/json',
    })
    const body = JSON.parse(String(init?.body))
    expect(body.type).toBe('defect_fix_v1')
    expect(body.defect.title).toBe('Sync silent skip')
  })

  it('skips when webhook missing', async () => {
    const result = await dispatchPlatformDefectFix(sampleDefect, [])
    expect(result).toEqual({ outcome: 'skipped', reason: 'webhook_not_configured' })
  })

  it('start-fix stays open when dispatch fails', async () => {
    const openDefect = { ...sampleDefect, status: 'open' as const, fixStartedAt: null }
    const startFix = vi.fn()
    const repo = {
      findById: vi.fn(async () => openDefect),
      listLinkedIncidentIds: vi.fn(async () => []),
    }
    const service = { startFix } as unknown as PlatformDefectService

    const result = await startPlatformDefectFixWithDispatch(service, repo as never, openDefect.id)
    expect(result.dispatch.outcome).toBe('skipped')
    expect(result.item.status).toBe('open')
    expect(startFix).not.toHaveBeenCalled()
  })

  it('start-fix transitions to in_fix only after dispatch sent', async () => {
    process.env.CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/defect-fix'
    process.env.CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_KEY = 'crsr_test'
    process.env.OPS_METRICS_KEY = 'ops-key'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))

    const openDefect = { ...sampleDefect, status: 'open' as const, fixStartedAt: null }
    const inFix = { ...openDefect, status: 'in_fix' as const }
    const startFix = vi.fn(async () => inFix)
    const repo = {
      findById: vi.fn(async () => openDefect),
      listLinkedIncidentIds: vi.fn(async () => []),
    }
    const service = { startFix } as unknown as PlatformDefectService

    const result = await startPlatformDefectFixWithDispatch(service, repo as never, openDefect.id)
    expect(result.dispatch).toEqual({ outcome: 'sent' })
    expect(startFix).toHaveBeenCalledOnce()
    expect(result.item.status).toBe('in_fix')
  })

  it('in_fix retries dispatch and refreshes last_fix_dispatch_sent_at', async () => {
    process.env.CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_URL = 'http://127.0.0.1:3099/defect-fix'
    process.env.CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_KEY = 'crsr_test'
    process.env.OPS_METRICS_KEY = 'ops-key'
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })))

    const refreshed = {
      ...sampleDefect,
      lastFixDispatchSentAt: '2026-09-28T14:00:00.000Z',
    }
    const repo = {
      findById: vi.fn(async () => sampleDefect),
      listLinkedIncidentIds: vi.fn(async () => []),
      markFixDispatchSent: vi.fn(async () => refreshed),
    }
    const service = { startFix: vi.fn() } as unknown as PlatformDefectService

    const result = await startPlatformDefectFixWithDispatch(service, repo as never, sampleDefect.id)
    expect(result.dispatch).toEqual({ outcome: 'sent' })
    expect(repo.markFixDispatchSent).toHaveBeenCalledOnce()
    expect(service.startFix).not.toHaveBeenCalled()
    expect(result.item.lastFixDispatchSentAt).toBe(refreshed.lastFixDispatchSentAt)
  })
})
