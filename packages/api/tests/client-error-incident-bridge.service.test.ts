import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClientErrorIncidentBridgeService } from '../src/application/ops/client-error-incident-bridge.service.js'
import { apiPathMatchesIncidentPrefixes } from '../src/domain/ops/client-error-incident-bridge.config.js'
import { computeClientErrorFingerprint } from '../src/domain/telemetry/client-error.js'
import type { ClientErrorIncidentBridgeConfig } from '../src/domain/ops/client-error-incident-bridge.types.js'

function enabledConfig(): ClientErrorIncidentBridgeConfig {
  return {
    enabled: true,
    features: new Set(['account_settings', 'ui']),
    disabledFeatures: new Set(),
    dedupeMs: 60_000,
    minCount: 1,
    apiPathPrefixes: ['/auth', '/account', '/patients'],
    sreFeatures: new Set(),
  }
}

describe('ClientErrorIncidentBridgeService', () => {
  afterEach(() => {
    delete process.env.OPS_PLANNED_MAINTENANCE
  })

  it('skips enqueue when OPS_PLANNED_MAINTENANCE=1', async () => {
    process.env.OPS_PLANNED_MAINTENANCE = '1'
    const tryAcquire = vi.fn(async () => ({ acquired: true }))
    const enqueueClientErrorSignal = vi.fn()
    const bridge = new ClientErrorIncidentBridgeService(
      enabledConfig(),
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    const fp = computeClientErrorFingerprint('account_settings', 'api', 'HTTP_500')
    await bridge.onIngestedErrors(
      [{
        fingerprint: fp,
        feature: 'account_settings',
        errorKind: 'api',
        errorCode: 'HTTP_500',
      }],
      { accountId: null, deploymentTier: 'local' },
    )
    await bridge.handleServerError({
      path: '/auth/profile',
      statusCode: 500,
      accountId: null,
      deploymentTier: 'local',
    })
    expect(tryAcquire).not.toHaveBeenCalled()
    expect(enqueueClientErrorSignal).not.toHaveBeenCalled()
  })

  it('enqueues once per fingerprint; second call blocked by dedupe', async () => {
    const tryAcquire = vi
      .fn()
      .mockResolvedValueOnce({ acquired: true })
      .mockResolvedValueOnce({ acquired: false, reason: 'dedupe_window' })
    const attachQueueId = vi.fn(async () => undefined)
    const enqueueClientErrorSignal = vi.fn(async () => ({
      id: 'queue-1',
      sourceType: 'ops_alert',
      sourceId: 'client_error:abc',
      incidentPipelineStatus: 'open',
    }))
    const signals = { tryAcquireEnqueueSlot: tryAcquire, attachQueueId }
    const queueService = { enqueueClientErrorSignal }
    const bridge = new ClientErrorIncidentBridgeService(
      enabledConfig(),
      signals as never,
      queueService as never,
    )

    const fp = computeClientErrorFingerprint('account_settings', 'api', 'HTTP_500')
    const error = {
      fingerprint: fp,
      feature: 'account_settings',
      errorKind: 'api' as const,
      errorCode: 'HTTP_500',
      properties: { api_path: '/auth/profile' },
    }

    await bridge.onIngestedErrors([error], { accountId: 'acc-1', deploymentTier: 'local' })
    await bridge.onIngestedErrors([error], { accountId: 'acc-1', deploymentTier: 'local' })

    expect(enqueueClientErrorSignal).toHaveBeenCalledTimes(1)
    expect(attachQueueId).toHaveBeenCalledWith(fp, 'local', 'queue-1')
  })

  it('waits for minCount before enqueue', async () => {
    const tryAcquire = vi
      .fn()
      .mockResolvedValueOnce({ acquired: false, reason: 'min_count' })
      .mockResolvedValueOnce({ acquired: true })
    const enqueueClientErrorSignal = vi.fn(async () => ({ id: 'queue-1' }))
    const bridge = new ClientErrorIncidentBridgeService(
      { ...enabledConfig(), minCount: 2 },
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    const fp = computeClientErrorFingerprint('account_settings', 'api', 'HTTP_500')
    const error = {
      fingerprint: fp,
      feature: 'account_settings',
      errorKind: 'api' as const,
      errorCode: 'HTTP_500',
    }
    await bridge.onIngestedErrors([error], { accountId: null, deploymentTier: 'local' })
    await bridge.onIngestedErrors([error], { accountId: null, deploymentTier: 'local' })
    expect(enqueueClientErrorSignal).toHaveBeenCalledTimes(1)
    expect(tryAcquire).toHaveBeenNthCalledWith(1, fp, 'local', 60_000, 2)
  })

  it('skips business api.client and HTTP_409 ingest (decision 2026-10-07)', async () => {
    const tryAcquire = vi.fn(async () => ({ acquired: true }))
    const enqueueClientErrorSignal = vi.fn(async () => ({ id: 'q-biz' }))
    const bridge = new ClientErrorIncidentBridgeService(
      enabledConfig(),
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    const fp409 = computeClientErrorFingerprint('account_settings', 'api', 'HTTP_409')
    await bridge.onIngestedErrors(
      [{
        fingerprint: fp409,
        feature: 'account_settings',
        errorKind: 'api',
        errorCode: 'HTTP_409',
        properties: { probe_kind: 'api.client', api_path: '/auth/complete-profile' },
      }],
      { accountId: null, deploymentTier: 'local' },
    )
    const fp500 = computeClientErrorFingerprint('account_settings', 'api', 'HTTP_500')
    await bridge.onIngestedErrors(
      [{
        fingerprint: fp500,
        feature: 'account_settings',
        errorKind: 'api',
        errorCode: 'HTTP_500',
        properties: { probe_kind: 'api.unexpected', api_path: '/auth/profile' },
      }],
      { accountId: null, deploymentTier: 'local' },
    )
    expect(tryAcquire).toHaveBeenCalledTimes(1)
    expect(enqueueClientErrorSignal).toHaveBeenCalledTimes(1)
  })

  it('skips features outside allowlist', async () => {
    const tryAcquire = vi.fn()
    const enqueueClientErrorSignal = vi.fn()
    const bridge = new ClientErrorIncidentBridgeService(
      enabledConfig(),
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    const fp = computeClientErrorFingerprint('patient_detail', 'api', 'HTTP_404')
    await bridge.onIngestedErrors(
      [{
        fingerprint: fp,
        feature: 'patient_detail',
        errorKind: 'api',
        errorCode: 'HTTP_404',
      }],
      { accountId: null, deploymentTier: 'local' },
    )
    expect(tryAcquire).not.toHaveBeenCalled()
    expect(enqueueClientErrorSignal).not.toHaveBeenCalled()
  })

  it('handleServerError respects API prefix allowlist', async () => {
    const tryAcquire = vi.fn(async () => ({ acquired: true }))
    const enqueueClientErrorSignal = vi.fn(async () => ({ id: 'q2' }))
    const bridge = new ClientErrorIncidentBridgeService(
      enabledConfig(),
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    await bridge.handleServerError({
      path: '/health/db',
      statusCode: 500,
      accountId: null,
      deploymentTier: 'local',
    })
    expect(enqueueClientErrorSignal).not.toHaveBeenCalled()

    await bridge.handleServerError({
      path: '/auth/profile',
      statusCode: 500,
      accountId: 'a1',
      deploymentTier: 'local',
    })
    expect(enqueueClientErrorSignal).toHaveBeenCalledTimes(1)
  })

  it('maps api:patients:exams to patient_exams on enqueue', async () => {
    const tryAcquire = vi.fn(async () => ({ acquired: true }))
    const enqueueClientErrorSignal = vi.fn(async () => ({ id: 'q-exams' }))
    const bridge = new ClientErrorIncidentBridgeService(
      {
        ...enabledConfig(),
        features: new Set([...enabledConfig().features, 'patient_exams']),
      },
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    const fp = computeClientErrorFingerprint('api:patients:exams', 'api', 'HTTP_500')
    await bridge.onIngestedErrors(
      [{
        fingerprint: fp,
        feature: 'api:patients:exams',
        errorKind: 'api',
        errorCode: 'HTTP_500',
        properties: { api_path: '/patients/p1/exams' },
      }],
      { accountId: null, deploymentTier: 'local' },
    )
    expect(enqueueClientErrorSignal).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'patient_exams' }),
    )
  })

  it('handleServerError enqueues for integration-links 5xx', async () => {
    const cfg = {
      ...enabledConfig(),
      features: new Set([...enabledConfig().features, 'integration_links']),
      apiPathPrefixes: ['/integration-links'],
    }
    expect(apiPathMatchesIncidentPrefixes('/integration-links/link-1/sync', cfg)).toBe(true)
    const tryAcquire = vi.fn(async () => ({ acquired: true }))
    const enqueueClientErrorSignal = vi.fn(async () => ({ id: 'q-sync' }))
    const bridge = new ClientErrorIncidentBridgeService(
      cfg,
      { tryAcquireEnqueueSlot: tryAcquire, attachQueueId: vi.fn() } as never,
      { enqueueClientErrorSignal } as never,
    )
    await bridge.handleServerError({
      path: '/integration-links/link-1/sync',
      statusCode: 502,
      accountId: 'a1',
      deploymentTier: 'local',
    })
    expect(enqueueClientErrorSignal).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'integration_links', errorCode: 'HTTP_502' }),
    )
  })
})
